# src/__main__.py
from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

# Python MCP SDK (install: pip install mcp)
# Docs pattern: from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp import FastMCP

from utils.platform import (
    detect_platform,
    get_default_shell,
    get_shell_suggestions,
    get_common_shell_locations,
)
from services.command_service import (
    CommandService,
    CommandSecurityLevel,
    CommandWhitelistEntry,
    CommandResult,
)
from utils.logger import get_logger, Logger


# -----------------------------------------------------------------------------
# Logger setup (same path logic as your TS: ../logs/super-shell-mcp.log)
# -----------------------------------------------------------------------------
_THIS_DIR = Path(__file__).resolve().parent
LOG_FILE = (_THIS_DIR / ".." / "logs" / "super-shell-mcp.log").resolve()
# Initialize singleton logger (creates directory, truncates file)
logger: Logger = get_logger(str(LOG_FILE), True)

print(f"Log file path: {LOG_FILE}", file=os.sys.stderr)

# -----------------------------------------------------------------------------
# MCP App (Python)
# -----------------------------------------------------------------------------
mcp = FastMCP(name="super-shell-mcp")

# Command service with auto-detected shell (same behavior)
command_service = CommandService()

# Local pending approvals mirror (not strictly necessary because CommandService
# already tracks, but preserved for parity with TS)
pending_approvals: Dict[str, Dict[str, Any]] = {}


# -----------------------------------------------------------------------------
# Wire up CommandService events (Node-like)
# -----------------------------------------------------------------------------
def _on_pending(pending_cmd) -> None:
    logger.info(
        f"[Pending Command] ID: {pending_cmd.id}, "
        f"Command: {pending_cmd.command} {' '.join(pending_cmd.args)}"
    )
    print(
        f"[Pending Command] ID: {pending_cmd.id}, "
        f"Command: {pending_cmd.command} {' '.join(pending_cmd.args)}",
        file=os.sys.stderr,
    )
    pending_approvals[pending_cmd.id] = {
        "command": pending_cmd.command,
        "args": pending_cmd.args,
    }


def _on_approved(data: Dict[str, Any]) -> None:
    cid = data.get("commandId")
    logger.info(f"[Approved Command] ID: {cid}")
    print(f"[Approved Command] ID: {cid}", file=os.sys.stderr)
    if cid in pending_approvals:
        pending_approvals.pop(cid, None)


def _on_denied(data: Dict[str, Any]) -> None:
    cid = data.get("commandId")
    reason = data.get("reason")
    logger.info(f"[Denied Command] ID: {cid}, Reason: {reason}")
    print(f"[Denied Command] ID: {cid}, Reason: {reason}", file=os.sys.stderr)
    pending_approvals.pop(cid, None)


def _on_failed(data: Dict[str, Any]) -> None:
    cid = data.get("commandId")
    err = data.get("error")
    msg = getattr(err, "message", str(err))
    logger.error(f"[Failed Command] ID: {cid}, Error: {msg}")
    print(f"[Failed Command] ID: {cid}, Error: {msg}", file=os.sys.stderr)
    pending_approvals.pop(cid, None)


def _on_approval_timeout(data: Dict[str, Any]) -> None:
    cid = data.get("commandId")
    msg = data.get("message")
    logger.error(f"[Approval Timeout] ID: {cid}, Message: {msg}")
    print(f"[Approval Timeout] ID: {cid}, Message: {msg}", file=os.sys.stderr)
    # Keep in pending queue; client should call get_pending_commands / approve_command


command_service.on("command:pending", _on_pending)
command_service.on("command:approved", _on_approved)
command_service.on("command:denied", _on_denied)
command_service.on("command:failed", _on_failed)
command_service.on("command:approval_timeout", _on_approval_timeout)


# -----------------------------------------------------------------------------
# Tool definitions (names, args, behavior mirror your TS server)
# -----------------------------------------------------------------------------

@mcp.tool(
    name="get_platform_info",
    description="Get information about the current platform and shell",
)
async def get_platform_info() -> str:
    platform = detect_platform()
    current_shell = command_service.get_shell()
    suggested_shells = get_shell_suggestions()[platform]
    common_locations = get_common_shell_locations()

    payload = {
        "platform": platform.value,
        "currentShell": current_shell,
        "suggestedShells": suggested_shells,
        "commonLocations": common_locations,
        "helpMessage": f"Super Shell MCP is running on {platform.value} using {current_shell}",
    }
    return json.dumps(payload, indent=2)


@mcp.tool(
    name="execute_command",
    description="Execute a shell command on the current platform",
)
async def execute_command(command: str, args: Optional[List[str]] = None) -> str:
    args = args or []

    # Log start of execution
    logger.debug(f"handleExecuteCommand called with args: {json.dumps({'command': command, 'args': args})}")

    # Extract base name like TS
    base_command = os.path.basename(command)
    logger.debug(f"[Executing Command] Command: {command} {' '.join(args)}")
    logger.debug(f"Base command: {base_command}")

    whitelist = command_service.get_whitelist()
    logger.debug(f"Whitelist entries: {len(whitelist)}")

    # match by exact command field (like TS)
    wl_entry = next((e for e in whitelist if e.command == base_command), None)
    logger.debug(f"Whitelist entry found: {'yes' if wl_entry else 'no'}")

    if wl_entry:
        logger.debug(f"Security level: {wl_entry.security_level.value}")

    if wl_entry and wl_entry.security_level == CommandSecurityLevel.REQUIRES_APPROVAL:
        logger.debug(f"[Command Requires Approval] Command: {command} {' '.join(args)}")
        cmd_id = command_service.queue_command_for_approval_non_blocking(command, args)
        logger.debug(f"Command queued for approval with ID: {cmd_id}")
        logger.debug("Returning response to client")
        return (
            "This command requires approval. "
            f"It has been queued with ID: {cmd_id}\n\n"
            "Please approve this command in the UI or use the 'approve_command' tool with this command ID."
        )

    try:
        result: CommandResult = await command_service.execute_command(command, args)
        # Return stdout + stderr (stderr marker kept for parity)
        parts = [result.stdout]
        if result.stderr:
            parts.append(f"Error output: {result.stderr}")
        return "\n".join(p for p in parts if p)
    except Exception as e:
        msg = getattr(e, "message", str(e))
        print(f"[Command Execution Failed] Error: {msg}", file=os.sys.stderr)
        return f"Command execution failed: {msg}"


@mcp.tool(
    name="get_whitelist",
    description="Get the list of whitelisted commands",
)
async def get_whitelist() -> str:
    wl = command_service.get_whitelist()
    # Convert dataclasses to JSON-friendly dicts
    as_dict = [
        {
            "command": e.command,
            "securityLevel": e.security_level.value,
            "allowedArgs": e.allowed_args,
            "description": e.description,
        }
        for e in wl
    ]
    return json.dumps(as_dict, indent=2)


@mcp.tool(
    name="add_to_whitelist",
    description="Add a command to the whitelist",
)
async def add_to_whitelist(command: str, securityLevel: str, description: Optional[str] = None) -> str:
    level = (
        CommandSecurityLevel.SAFE if securityLevel == "safe"
        else CommandSecurityLevel.REQUIRES_APPROVAL if securityLevel == "requires_approval"
        else CommandSecurityLevel.FORBIDDEN
    )
    entry = CommandWhitelistEntry(command=command, security_level=level, description=description)
    command_service.add_to_whitelist(entry)
    return f"Command '{command}' added to whitelist with security level '{securityLevel}'"


@mcp.tool(
    name="update_security_level",
    description="Update the security level of a whitelisted command",
)
async def update_security_level(command: str, securityLevel: str) -> str:
    level = (
        CommandSecurityLevel.SAFE if securityLevel == "safe"
        else CommandSecurityLevel.REQUIRES_APPROVAL if securityLevel == "requires_approval"
        else CommandSecurityLevel.FORBIDDEN
    )
    command_service.update_security_level(command, level)
    return f"Security level for command '{command}' updated to '{securityLevel}'"


@mcp.tool(
    name="remove_from_whitelist",
    description="Remove a command from the whitelist",
)
async def remove_from_whitelist(command: str) -> str:
    command_service.remove_from_whitelist(command)
    return f"Command '{command}' removed from whitelist"


@mcp.tool(
    name="get_pending_commands",
    description="Get the list of commands pending approval",
)
async def get_pending_commands() -> str:
    pcs = command_service.get_pending_commands()
    out = [
        {
            "id": c.id,
            "command": c.command,
            "args": c.args,
            "requestedAt": c.requested_at,
            "requestedBy": c.requested_by,
        }
        for c in pcs
    ]
    return json.dumps(out, indent=2)


@mcp.tool(
    name="approve_command",
    description="Approve a pending command",
)
async def approve_command(commandId: str) -> str:
    logger.debug(f"handleApproveCommand called with args: {json.dumps({'commandId': commandId})}")
    logger.debug(f"[Approval Attempt] ID: {commandId}")

    local_pending = commandId in pending_approvals
    logger.debug(f"Command found in local pendingApprovals: {'yes' if local_pending else 'no'}")

    pcs = command_service.get_pending_commands()
    logger.debug(f"CommandService pending commands: {len(pcs)}")
    pc = next((c for c in pcs if c.id == commandId), None)
    logger.debug(f"Command found in CommandService pending queue: {'yes' if pc else 'no'}")

    if pc:
        logger.debug(f"Pending command details: {json.dumps({'id': pc.id, 'command': pc.command, 'args': pc.args, 'requestedAt': pc.requested_at})}")

    try:
        logger.debug(f"Calling CommandService.approve_command with ID: {commandId}")
        result = await command_service.approve_command(commandId)
        logger.debug(f"[Command Approved] ID: {commandId}, Output length: {len(result.stdout)}")
        snippet = (result.stdout[:100] + "...") if len(result.stdout) > 100 else result.stdout
        logger.debug(f"Command output: {snippet}")
        parts = [f"Command approved and executed successfully.\nOutput: {result.stdout}"]
        if result.stderr:
            parts.append(f"Error output: {result.stderr}")
        return "\n".join(parts)
    except Exception as e:
        msg = getattr(e, "message", str(e))
        logger.error(f"[Approval Error] ID: {commandId}, Error: {msg}")
        return f"Command approval failed: {msg}"


@mcp.tool(
    name="deny_command",
    description="Deny a pending command",
)
async def deny_command(commandId: str, reason: Optional[str] = None) -> str:
    logger.debug(f"handleDenyCommand called with args: {json.dumps({'commandId': commandId, 'reason': reason})}")
    logger.debug(f"[Denial Attempt] ID: {commandId}, Reason: {reason or 'none provided'}")
    try:
        command_service.deny_command(commandId, reason or "Command denied")
        logger.info(f"Command denied: ID: {commandId}, Reason: {reason or 'none provided'}")
        return f"Command denied{(': ' + reason) if reason else ''}"
    except Exception as e:
        msg = getattr(e, "message", str(e))
        logger.error(f"[Denial Error] ID: {commandId}, Error: {msg}")
        return f"Command denial failed: {msg}"


# -----------------------------------------------------------------------------
# Run (stdio), mirror TS server.run()
# -----------------------------------------------------------------------------
async def _run_stdio() -> None:
    logger.info("Starting Super Shell MCP server")
    await mcp.run_stdio_async()  # <-- FIX: correct async method
    logger.info("Super Shell MCP server running on stdio")
    print("Super Shell MCP server running on stdio", file=os.sys.stderr)
    print(f"Log file: {LOG_FILE}", file=os.sys.stderr)
    logger.info(f"Log file: {LOG_FILE}")


def main() -> None:
    try:
        asyncio.run(_run_stdio())
    except KeyboardInterrupt:
        logger.info("Received SIGINT signal, shutting down")
    finally:
        logger.close()


if __name__ == "__main__":
    main()

