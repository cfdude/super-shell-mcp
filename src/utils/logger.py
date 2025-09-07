from __future__ import annotations

import os
from pathlib import Path
from datetime import datetime
from typing import Optional, TextIO


class Logger:
    """
    Simple logging utility that writes to a file.
    """

    def __init__(self, log_file: str, enabled: bool = True) -> None:
        self.log_file: str = log_file
        self.enabled: bool = enabled
        self.file_stream: Optional[TextIO] = None

        if self.enabled:
            # Create the directory if it doesn't exist
            log_dir = Path(self.log_file).parent
            print(f"Creating log directory: {log_dir}", file=os.sys.stderr)
            try:
                log_dir.mkdir(parents=True, exist_ok=True)
            except Exception as error:
                print(f"Error creating log directory: {error}", file=os.sys.stderr)
                # Fall back to a directory we know exists
                self.log_file = "./super-shell-mcp.log"
                print(f"Falling back to log file: {self.log_file}", file=os.sys.stderr)

            # Create or truncate the log file
            self.file_stream = open(self.log_file, mode="w", encoding="utf-8")

            # Write a header to the log file
            self.log("INFO", f"Logging started at {datetime.utcnow().isoformat()}")

    def log(self, level: str, message: str) -> None:
        """
        Log a message
        :param level: Log level (INFO, DEBUG, ERROR, etc.)
        :param message: Message to log
        """
        if not self.enabled or not self.file_stream:
            return

        timestamp = datetime.utcnow().isoformat()
        log_message = f"[{timestamp}] [{level}] {message}\n"
        self.file_stream.write(log_message)
        self.file_stream.flush()

    def info(self, message: str) -> None:
        self.log("INFO", message)

    def debug(self, message: str) -> None:
        self.log("DEBUG", message)

    def error(self, message: str) -> None:
        self.log("ERROR", message)

    def close(self) -> None:
        if self.file_stream:
            self.file_stream.close()
            self.file_stream = None


# Create a singleton logger instance
_logger_instance: Optional[Logger] = None


def get_logger(log_file: Optional[str] = None, enabled: Optional[bool] = None) -> Logger:
    """
    Get the logger instance.
    :param log_file: Path to the log file
    :param enabled: Whether logging is enabled
    :return: Logger instance
    """
    global _logger_instance
    if _logger_instance is None and log_file:
        _logger_instance = Logger(log_file, enabled if enabled is not None else True)

    if _logger_instance is None:
        raise RuntimeError("Logger not initialized")

    return _logger_instance
