"""Rich 日志工具 - 美化控制台输出"""

import logging

from rich.console import Console
from rich.logging import RichHandler
from typing import Optional

console = Console()


def setup_rich_logger(
    name: str = "sisyphus",
    level: int = logging.INFO,
    log_file: Optional[str] = None,
) -> logging.Logger:
    """
    设置 Rich 日志记录器

    Args:
        name: 日志记录器名称
        level: 日志级别 (默认 INFO)
        log_file: 可选的日志文件路径

    Returns:
        配置好的 Logger 实例
    """
    logger = logging.getLogger(name)

    # 避免重复添加 handler
    if logger.handlers:
        return logger

    logger.setLevel(level)

    # Rich 控制台处理器
    rich_handler = RichHandler(
        console=console,
        show_time=True,
        show_path=True,
        rich_tracebacks=True,
        tracebacks_show_locals=True,
        omit_repeated_times=False,
        log_time_format="[%Y-%m-%d %H:%M:%S]",
    )
    rich_handler.setLevel(level)

    # 格式化
    formatter = logging.Formatter(
        fmt="%(name)s - %(message)s",
        datefmt="[%Y-%m-%d %H:%M:%S]",
    )
    rich_handler.setFormatter(formatter)

    logger.addHandler(rich_handler)

    # 可选的文件处理器
    if log_file:
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(level)
        file_formatter = logging.Formatter(
            fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)

    return logger


def get_logger(name: str = "sisyphus") -> logging.Logger:
    """获取配置好的日志记录器"""
    return logging.getLogger(name)


__all__ = ["console", "setup_rich_logger", "get_logger"]
