from __future__ import annotations

from typing import List
from src.utils.platform import PlatformType, detect_platform
from src.services.command_service import (
    CommandSecurityLevel,
    CommandWhitelistEntry,
)

# ---------------------------------------------------------------------------
# Common safe commands
# ---------------------------------------------------------------------------

def get_common_safe_commands() -> List[CommandWhitelistEntry]:
    return [
        CommandWhitelistEntry(
            command="echo",
            security_level=CommandSecurityLevel.SAFE,
            description="Print text to standard output",
        )
    ]


# ---------------------------------------------------------------------------
# Windows-specific safe commands
# ---------------------------------------------------------------------------

def get_windows_safe_commands() -> List[CommandWhitelistEntry]:
    return [
        CommandWhitelistEntry("dir", CommandSecurityLevel.SAFE, "List directory contents"),
        CommandWhitelistEntry("type", CommandSecurityLevel.SAFE, "Display the contents of a text file"),
        CommandWhitelistEntry("cd", CommandSecurityLevel.SAFE, "Change directory"),
        CommandWhitelistEntry("findstr", CommandSecurityLevel.SAFE, "Search for strings in files"),
        CommandWhitelistEntry("where", CommandSecurityLevel.SAFE, "Locate programs"),
        CommandWhitelistEntry("whoami", CommandSecurityLevel.SAFE, "Display current user"),
        CommandWhitelistEntry("hostname", CommandSecurityLevel.SAFE, "Display computer name"),
        CommandWhitelistEntry("ver", CommandSecurityLevel.SAFE, "Display operating system version"),
    ]


# ---------------------------------------------------------------------------
# macOS-specific safe commands
# ---------------------------------------------------------------------------

def get_macos_safe_commands() -> List[CommandWhitelistEntry]:
    return [
        CommandWhitelistEntry("ls", CommandSecurityLevel.SAFE, "List directory contents"),
        CommandWhitelistEntry("pwd", CommandSecurityLevel.SAFE, "Print working directory"),
        CommandWhitelistEntry("cat", CommandSecurityLevel.SAFE, "Concatenate and print files"),
        CommandWhitelistEntry("grep", CommandSecurityLevel.SAFE, "Search for patterns in files"),
        CommandWhitelistEntry("find", CommandSecurityLevel.SAFE, "Find files in a directory hierarchy"),
        CommandWhitelistEntry("cd", CommandSecurityLevel.SAFE, "Change directory"),
        CommandWhitelistEntry("head", CommandSecurityLevel.SAFE, "Output the first part of files"),
        CommandWhitelistEntry("tail", CommandSecurityLevel.SAFE, "Output the last part of files"),
        CommandWhitelistEntry("wc", CommandSecurityLevel.SAFE, "Print newline, word, and byte counts"),
    ]


# ---------------------------------------------------------------------------
# Linux-specific safe commands (same as macOS)
# ---------------------------------------------------------------------------

def get_linux_safe_commands() -> List[CommandWhitelistEntry]:
    return get_macos_safe_commands()


# ---------------------------------------------------------------------------
# Windows commands requiring approval
# ---------------------------------------------------------------------------

def get_windows_approval_commands() -> List[CommandWhitelistEntry]:
    return [
        CommandWhitelistEntry("copy", CommandSecurityLevel.REQUIRES_APPROVAL, "Copy files"),
        CommandWhitelistEntry("move", CommandSecurityLevel.REQUIRES_APPROVAL, "Move files"),
        CommandWhitelistEntry("mkdir", CommandSecurityLevel.REQUIRES_APPROVAL, "Create directories"),
        CommandWhitelistEntry("rmdir", CommandSecurityLevel.REQUIRES_APPROVAL, "Remove directories"),
        CommandWhitelistEntry("rename", CommandSecurityLevel.REQUIRES_APPROVAL, "Rename files"),
        CommandWhitelistEntry("attrib", CommandSecurityLevel.REQUIRES_APPROVAL, "Change file attributes"),
    ]


# ---------------------------------------------------------------------------
# macOS commands requiring approval
# ---------------------------------------------------------------------------

def get_macos_approval_commands() -> List[CommandWhitelistEntry]:
    return [
        CommandWhitelistEntry("mv", CommandSecurityLevel.REQUIRES_APPROVAL, "Move (rename) files"),
        CommandWhitelistEntry("cp", CommandSecurityLevel.REQUIRES_APPROVAL, "Copy files and directories"),
        CommandWhitelistEntry("mkdir", CommandSecurityLevel.REQUIRES_APPROVAL, "Create directories"),
        CommandWhitelistEntry("touch", CommandSecurityLevel.REQUIRES_APPROVAL, "Change file timestamps or create empty files"),
        CommandWhitelistEntry("chmod", CommandSecurityLevel.REQUIRES_APPROVAL, "Change file mode bits"),
        CommandWhitelistEntry("chown", CommandSecurityLevel.REQUIRES_APPROVAL, "Change file owner and group"),
    ]


# ---------------------------------------------------------------------------
# Linux commands requiring approval (same as macOS)
# ---------------------------------------------------------------------------

def get_linux_approval_commands() -> List[CommandWhitelistEntry]:
    return get_macos_approval_commands()


# ---------------------------------------------------------------------------
# Windows forbidden commands
# ---------------------------------------------------------------------------

def get_windows_forbidden_commands() -> List[CommandWhitelistEntry]:
    return [
        CommandWhitelistEntry("del", CommandSecurityLevel.FORBIDDEN, "Delete files"),
        CommandWhitelistEntry("erase", CommandSecurityLevel.FORBIDDEN, "Delete files"),
        CommandWhitelistEntry("format", CommandSecurityLevel.FORBIDDEN, "Format a disk"),
        CommandWhitelistEntry("runas", CommandSecurityLevel.FORBIDDEN, "Execute a program as another user"),
    ]


# ---------------------------------------------------------------------------
# macOS forbidden commands
# ---------------------------------------------------------------------------

def get_macos_forbidden_commands() -> List[CommandWhitelistEntry]:
    return [
        CommandWhitelistEntry("rm", CommandSecurityLevel.FORBIDDEN, "Remove files or directories"),
        CommandWhitelistEntry("sudo", CommandSecurityLevel.FORBIDDEN, "Execute a command as another user"),
    ]


# ---------------------------------------------------------------------------
# Linux forbidden commands (same as macOS)
# ---------------------------------------------------------------------------

def get_linux_forbidden_commands() -> List[CommandWhitelistEntry]:
    return get_macos_forbidden_commands()


# ---------------------------------------------------------------------------
# Platform-specific aggregation
# ---------------------------------------------------------------------------

def get_platform_specific_commands() -> List[CommandWhitelistEntry]:
    platform = detect_platform()

    safe_commands: List[CommandWhitelistEntry] = []
    approval_commands: List[CommandWhitelistEntry] = []
    forbidden_commands: List[CommandWhitelistEntry] = []

    # Add common safe commands (cross-platform)
    common_safe_commands = get_common_safe_commands()

    # Add platform-specific commands
    if platform == PlatformType.WINDOWS:
        safe_commands = get_windows_safe_commands()
        approval_commands = get_windows_approval_commands()
        forbidden_commands = get_windows_forbidden_commands()
    elif platform == PlatformType.MACOS:
        safe_commands = get_macos_safe_commands()
        approval_commands = get_macos_approval_commands()
        forbidden_commands = get_macos_forbidden_commands()
    elif platform == PlatformType.LINUX:
        safe_commands = get_linux_safe_commands()
        approval_commands = get_linux_approval_commands()
        forbidden_commands = get_linux_forbidden_commands()
    else:
        # Use Unix-like defaults for unknown platforms
        safe_commands = get_linux_safe_commands()
        approval_commands = get_linux_approval_commands()
        forbidden_commands = get_linux_forbidden_commands()

    # Combine all commands
    return [*common_safe_commands, *safe_commands, *approval_commands, *forbidden_commands]
