from src.utils.command_whitelist import (
    get_common_safe_commands,
    get_platform_specific_commands,
)
from src.services.command_service import CommandSecurityLevel


def test_common_safe_commands_contains_echo():
    cmds = get_common_safe_commands()
    names = {c.command for c in cmds}
    assert "echo" in names
    echo = [c for c in cmds if c.command == "echo"][0]
    assert echo.security_level == CommandSecurityLevel.SAFE


def test_platform_specific_commands_not_empty():
    cmds = get_platform_specific_commands()
    assert len(cmds) > 0
    # Must include echo (common)
    assert any(c.command == "echo" for c in cmds)
