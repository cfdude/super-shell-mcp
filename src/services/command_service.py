from __future__ import annotations

import asyncio
import shlex
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Dict, List, Optional, Sequence, Tuple

from src.utils.platform import get_default_shell, PlatformType, detect_platform


# ---------------------------------------------------------------------------
# Event Emitter (minimal, Node-like)
# ---------------------------------------------------------------------------

class EventEmitter:
    def __init__(self) -> None:
        self._listeners: Dict[str, List[Callable[..., None]]] = {}

    def on(self, event: str, callback: Callable[..., None]) -> None:
        self._listeners.setdefault(event, []).append(callback)

    def off(self, event: str, callback: Callable[..., None]) -> None:
        if event in self._listeners:
            try:
                self._listeners[event].remove(callback)
            except ValueError:
                pass

    def emit(self, event: str, *args, **kwargs) -> None:
        for cb in list(self._listeners.get(event, [])):
            try:
                cb(*args, **kwargs)
            except Exception:
                # Keep emitter resilient (like Node's default behavior)
                pass


# ---------------------------------------------------------------------------
# Types (mirror TS interfaces/enums)
# ---------------------------------------------------------------------------

class CommandSecurityLevel(str, Enum):
    SAFE = "safe"
    REQUIRES_APPROVAL = "requires_approval"
    FORBIDDEN = "forbidden"


@dataclass
class CommandWhitelistEntry:
    command: str
    security_level: CommandSecurityLevel
    allowed_args: Optional[List[str]] = None  # NOTE: TS allowed RegExp; see note below
    description: Optional[str] = None


@dataclass
class CommandResult:
    stdout: str
    stderr: str


@dataclass
class PendingCommand:
    id: str
    command: str
    args: List[str]
    requested_at: float  # epoch seconds
    requested_by: Optional[str]
    resolve: Callable[[CommandResult], None]
    reject: Callable[[Exception], None]


# ---------------------------------------------------------------------------
# CommandService
# ---------------------------------------------------------------------------

class CommandService(EventEmitter):
    def __init__(self, shell: Optional[str] = None, default_timeout: int = 30_000) -> None:
        """
        :param shell: Shell to use for commands (default: auto-detected per platform)
        :param default_timeout: Default timeout (ms) for command execution
        """
        super().__init__()
        self.shell: str = shell or get_default_shell()
        self.whitelist: Dict[str, CommandWhitelistEntry] = {}
        self.pending_commands: Dict[str, PendingCommand] = {}
        self.default_timeout: int = default_timeout

        # Initialize with platform-specific commands
        self._initialize_default_whitelist()

    # ---------------------------------------------------------------------
    # Public getters
    # ---------------------------------------------------------------------

    def get_shell(self) -> str:
        return self.shell

    def get_whitelist(self) -> List[CommandWhitelistEntry]:
        return list(self.whitelist.values())

    def get_pending_commands(self) -> List[PendingCommand]:
        return list(self.pending_commands.values())

    # ---------------------------------------------------------------------
    # Whitelist management
    # ---------------------------------------------------------------------

    def add_to_whitelist(self, entry: CommandWhitelistEntry) -> None:
        self.whitelist[entry.command] = entry

    def remove_from_whitelist(self, command: str) -> None:
        self.whitelist.pop(command, None)

    def update_security_level(self, command: str, security_level: CommandSecurityLevel) -> None:
        entry = self.whitelist.get(command)
        if entry:
            entry.security_level = security_level
            self.whitelist[command] = entry

    # ---------------------------------------------------------------------
    # Internal: whitelist init
    # ---------------------------------------------------------------------

    def _initialize_default_whitelist(self) -> None:
        # Late import to avoid circular dependency
        from src.utils.command_whitelist import get_platform_specific_commands

        platform_commands = get_platform_specific_commands()
        for entry in platform_commands:
            # normalize to dict key as base command (same as TS using path.basename)
            base = entry.command.split("\\")[-1].split("/")[-1]
            self.whitelist[base] = entry

    # ---------------------------------------------------------------------
    # Validation
    # ---------------------------------------------------------------------

    def _validate_command(self, command: str, args: Sequence[str]) -> Optional[CommandSecurityLevel]:
        """
        Validate if a command and its arguments are allowed.
        Returns the command's security level or None if not whitelisted.
        """
        base_command = command.split("\\")[-1].split("/")[-1]
        entry = self.whitelist.get(base_command)
        if not entry:
            return None

        if entry.security_level == CommandSecurityLevel.FORBIDDEN:
            return CommandSecurityLevel.FORBIDDEN

        # NOTE: TS supports allowedArgs as (string | RegExp) per arg-position.
        # This direct port treats allowed_args as exact string matches by position.
        # If you need regex, we can extend this to accept compiled patterns.
        if entry.allowed_args:
            if len(args) > len(entry.allowed_args):
                return CommandSecurityLevel.REQUIRES_APPROVAL

            for idx, arg in enumerate(args):
                pat = entry.allowed_args[idx] if idx < len(entry.allowed_args) else None
                if pat is None:
                    return CommandSecurityLevel.REQUIRES_APPROVAL
                # Exact match only (line-for-line conservative port)
                if arg != pat:
                    return CommandSecurityLevel.REQUIRES_APPROVAL

        return entry.security_level

    # ---------------------------------------------------------------------
    # Execution
    # ---------------------------------------------------------------------

    async def execute_command(
        self,
        command: str,
        args: Optional[List[str]] = None,
        *,
        timeout: Optional[int] = None,
        requested_by: Optional[str] = None,
    ) -> CommandResult:
        """
        Execute a shell command.
        """
        args = args or []
        security_level = self._validate_command(command, args)

        if security_level is None:
            raise RuntimeError(f"Command not whitelisted: {command}")

        if security_level == CommandSecurityLevel.FORBIDDEN:
            raise RuntimeError(f"Command is forbidden: {command}")

        if security_level == CommandSecurityLevel.REQUIRES_APPROVAL:
            return await self._queue_command_for_approval(command, args, requested_by)

        # SAFE: execute immediately
        return await self._run_now(command, args, timeout=timeout)

    async def approve_command(self, command_id: str) -> CommandResult:
        pending = self.pending_commands.get(command_id)
        if not pending:
            raise RuntimeError(f"No pending command with ID: {command_id}")

        try:
            result = await self._run_now(pending.command, pending.args, timeout=None)
            # Remove and emit
            self.pending_commands.pop(command_id, None)
            self.emit("command:approved", {"commandId": command_id, "stdout": result.stdout, "stderr": result.stderr})
            pending.resolve(result)
            return result
        except Exception as e:
            self.pending_commands.pop(command_id, None)
            self.emit("command:failed", {"commandId": command_id, "error": e})
            pending.reject(e)
            raise

    def deny_command(self, command_id: str, reason: str = "Command denied") -> None:
        pending = self.pending_commands.get(command_id)
        if not pending:
            raise RuntimeError(f"No pending command with ID: {command_id}")

        self.pending_commands.pop(command_id, None)
        self.emit("command:denied", {"commandId": command_id, "reason": reason})
        pending.reject(RuntimeError(reason))

    # ---------------------------------------------------------------------
    # Non-blocking queue (fire-and-forget)
    # ---------------------------------------------------------------------

    def queue_command_for_approval_non_blocking(
        self, command: str, args: Optional[List[str]] = None, requested_by: Optional[str] = None
    ) -> str:
        args = args or []
        cmd_id = str(uuid.uuid4())
        pending = PendingCommand(
            id=cmd_id,
            command=command,
            args=list(args),
            requested_at=asyncio.get_event_loop().time(),
            requested_by=requested_by,
            resolve=lambda _res: None,
            reject=lambda _err: None,
        )
        self.pending_commands[cmd_id] = pending
        self.emit("command:pending", pending)

        # 5s warning timeout to detect UI approval issues
        def _timeout_check() -> None:
            if cmd_id in self.pending_commands:
                self.emit(
                    "command:approval_timeout",
                    {
                        "commandId": cmd_id,
                        "message": (
                            "Command approval timed out. If you approved this command in the UI, "
                            "please use get_pending_commands and approve_command to complete the process."
                        ),
                    },
                )

        loop = asyncio.get_event_loop()
        loop.call_later(5.0, _timeout_check)

        return cmd_id

    # ---------------------------------------------------------------------
    # Internal: queue with awaitable result
    # ---------------------------------------------------------------------

    async def _queue_command_for_approval(
        self, command: str, args: Optional[List[str]], requested_by: Optional[str]
    ) -> CommandResult:
        args = args or []
        loop = asyncio.get_event_loop()
        fut: asyncio.Future[CommandResult] = loop.create_future()
        cmd_id = str(uuid.uuid4())

        def resolve(res: CommandResult) -> None:
            if not fut.done():
                fut.set_result(res)

        def reject(err: Exception) -> None:
            if not fut.done():
                fut.set_exception(err)

        pending = PendingCommand(
            id=cmd_id,
            command=command,
            args=list(args),
            requested_at=loop.time(),
            requested_by=requested_by,
            resolve=resolve,
            reject=reject,
        )

        self.pending_commands[cmd_id] = pending
        self.emit("command:pending", pending)

        # 5s warning timeout (UI signal)
        def _timeout_check() -> None:
            if cmd_id in self.pending_commands:
                self.emit(
                    "command:approval_timeout",
                    {
                        "commandId": cmd_id,
                        "message": (
                            "Command approval timed out. If you approved this command in the UI, "
                            "please use get_pending_commands and approve_command to complete the process."
                        ),
                    },
                )

        loop.call_later(5.0, _timeout_check)
        return await fut

    # ---------------------------------------------------------------------
    # Internal: run command now (using the configured shell)
    # ---------------------------------------------------------------------

    async def _run_now(self, command: str, args: Sequence[str], timeout: Optional[int]) -> CommandResult:
        """
        Emulates Node's execFile(command, args, { shell }) by invoking the configured shell
        and passing the whole command line as a single string. Handles Windows vs POSIX.
        """
        platform = detect_platform()
        cmdline = " ".join([shlex.quote(command), *(shlex.quote(a) for a in args)])

        if platform == PlatformType.WINDOWS:
            # cmd.exe /c "<cmdline>"
            shell_cmd = [self.shell, "/c", cmdline]
        else:
            # /bin/bash -c "<cmdline>"  (or zsh, etc.)
            shell_cmd = [self.shell, "-c", cmdline]

        # Convert ms → seconds for asyncio timeout
        timeout_sec = (timeout if timeout is not None else self.default_timeout) / 1000.0

        proc = await asyncio.create_subprocess_exec(
            *shell_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout_b, stderr_b = await asyncio.wait_for(proc.communicate(), timeout=timeout_sec)
        except asyncio.TimeoutError:
            with contextlib.suppress(ProcessLookupError):
                proc.kill()
            raise RuntimeError("Command execution failed: timeout")

        stdout = stdout_b.decode(errors="replace") if stdout_b else ""
        stderr = stderr_b.decode(errors="replace") if stderr_b else ""
        return CommandResult(stdout=stdout, stderr=stderr)
