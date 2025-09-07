from src.utils.platform import (
    detect_platform,
    get_default_shell,
    get_shell_suggestions,
    get_common_shell_locations,
    PlatformType,
)


def test_detect_platform_has_valid_value():
    pt = detect_platform()
    assert pt in {PlatformType.WINDOWS, PlatformType.MACOS, PlatformType.LINUX, PlatformType.UNKNOWN}


def test_get_default_shell_returns_string():
    sh = get_default_shell()
    assert isinstance(sh, str)
    assert len(sh) >= 1


def test_shell_suggestions_has_platform_keys():
    s = get_shell_suggestions()
    for key in [PlatformType.WINDOWS, PlatformType.MACOS, PlatformType.LINUX, PlatformType.UNKNOWN]:
        assert key in s


def test_common_shell_locations_returns_list():
    locs = get_common_shell_locations()
    assert isinstance(locs, list)
    assert all(isinstance(x, str) for x in locs)
