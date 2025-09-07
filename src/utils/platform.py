from __future__ import annotations

import os
import sys
from enum import Enum
from pathlib import Path
from typing import Dict, List


class PlatformType(str, Enum):
    WINDOWS = "windows"
    MACOS = "macos"
    LINUX = "linux"
    UNKNOWN = "unknown"


def detect_platform() -> PlatformType:
    """
    Detect the current platform.
    """
    platform = sys.platform
    if platform.startswith("win32"):
        return PlatformType.WINDOWS
    if platform.startswith("darwin"):
        return PlatformType.MACOS
    if platform.startswith("linux"):
        return PlatformType.LINUX
    return PlatformType.UNKNOWN


def get_default_shell() -> str:
    """
    Get the default shell for the current platform.
    """
    platform = detect_platform()

    if platform == PlatformType.WINDOWS:
        return os.environ.get("COMSPEC", "cmd.exe")
    if platform == PlatformType.MACOS:
        return "/bin/zsh"
    if platform == PlatformType.LINUX:
        return os.environ.get("SHELL", "/bin/bash")
    return os.environ.get("SHELL", "/bin/sh")


def validate_shell_path(shell_path: str) -> bool:
    """
    Validate if a shell path exists and is executable.
    """
    try:
        p = Path(shell_path)
        return p.exists() and p.is_file()
    except Exception:
        return False


def get_shell_suggestions() -> Dict[PlatformType, List[str]]:
    """
    Get shell suggestions for each platform.
    """
    return {
        PlatformType.WINDOWS: ["cmd.exe", "powershell.exe", "pwsh.exe"],
        PlatformType.MACOS: ["/bin/zsh", "/bin/bash", "/bin/sh"],
        PlatformType.LINUX: ["/bin/bash", "/bin/sh", "/bin/zsh"],
        PlatformType.UNKNOWN: ["/bin/sh"],
    }


def get_common_shell_locations() -> List[str]:
    """
    Get common locations for shells on the current platform.
    """
    platform = detect_platform()

    if platform == PlatformType.WINDOWS:
        return [
            os.environ.get("COMSPEC", r"C:\Windows\System32\cmd.exe"),
            r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe",
            r"C:\Program Files\PowerShell\7\pwsh.exe",
        ]
    if platform == PlatformType.MACOS:
        return ["/bin/zsh", "/bin/bash", "/bin/sh"]
    if platform == PlatformType.LINUX:
        return ["/bin/bash", "/bin/sh", "/usr/bin/bash", "/usr/bin/zsh"]
    return ["/bin/sh"]


def get_shell_configuration_help() -> str:
    """
    Get helpful message for shell configuration.
    """
    platform = detect_platform()
    suggestions = get_shell_suggestions()[platform]
    locations = get_common_shell_locations()

    message = "Shell Configuration Help:\n\n"
    message += f"Detected platform: {platform.value}\n\n"
    message += "Suggested shells for this platform:\n"
    for shell in suggestions:
        message += f"- {shell}\n"

    message += "\nCommon shell locations on this platform:\n"
    for location in locations:
        message += f"- {location}\n"

    message += "\nTo configure a custom shell, provide the full path to the shell executable."
    return message
