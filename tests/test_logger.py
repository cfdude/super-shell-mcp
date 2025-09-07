import tempfile
from pathlib import Path

from src.utils.logger import Logger

def test_logger_writes_lines_and_closes():
    with tempfile.TemporaryDirectory() as td:
        lf = Path(td) / "logs" / "super-shell-mcp.log"
        log = Logger(str(lf), enabled=True)
        log.info("hello")
        log.debug("world")
        log.error("oops")
        log.close()

        # file exists and has content
        data = lf.read_text(encoding="utf-8")
        assert "hello" in data
        assert "world" in data
        assert "oops" in data
