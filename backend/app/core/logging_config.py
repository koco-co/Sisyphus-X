"""
日志配置
"""
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler


def setup_logging(
    log_level: str = "INFO",
    log_dir: str = "logs",
    app_name: str = "sisyphus"
):
    """
    配置应用日志系统

    Args:
        log_level: 日志级别 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: 日志目录
        app_name: 应用名称
    """
    # 创建日志目录
    log_path = Path(log_dir)
    log_path.mkdir(exist_ok=True)

    # 获取根日志记录器
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, log_level.upper()))

    # 清除现有处理器
    logger.handlers.clear()

    # 日志格式
    detailed_formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    simple_formatter = logging.Formatter(
        fmt='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    json_formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s - [%(extra)s]',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # 控制台处理器（开发环境）
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_handler.setFormatter(detailed_formatter)
    logger.addHandler(console_handler)

    # 文件处理器（所有日志）
    all_logs_file = log_path / f"{app_name}.log"
    file_handler = RotatingFileHandler(
        all_logs_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(detailed_formatter)
    logger.addHandler(file_handler)

    # 错误日志处理器（只记录错误和严重错误）
    error_logs_file = log_path / f"{app_name}-error.log"
    error_handler = TimedRotatingFileHandler(
        error_logs_file,
        when='midnight',
        interval=1,
        backupCount=30,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(detailed_formatter)
    logger.addHandler(error_handler)

    # 审计日志处理器（记录重要操作）
    audit_logs_file = log_path / f"{app_name}-audit.log"
    audit_handler = RotatingFileHandler(
        audit_logs_file,
        maxBytes=50 * 1024 * 1024,  # 50MB
        backupCount=5,
        encoding='utf-8'
    )
    audit_handler.setLevel(logging.INFO)
    audit_handler.setFormatter(simple_formatter)

    # 创建审计日志记录器
    audit_logger = logging.getLogger("audit")
    audit_logger.setLevel(logging.INFO)
    audit_logger.addHandler(audit_handler)
    audit_logger.propagate = False  # 不传播到根日志记录器

    logger.info(f"日志系统初始化完成 - 级别: {log_level}, 目录: {log_dir}")

    return logger


class LoggerMixin:
    """日志混入类 - 为任何类添加日志功能"""

    @property
    def logger(self) -> logging.Logger:
        """获取类专属的日志记录器"""
        return logging.getLogger(f"{self.__class__.__module__}.{self.__class__.__name__}")


def get_audit_logger() -> logging.Logger:
    """获取审计日志记录器"""
    return logging.getLogger("audit")


def log_operation(
    operation: str,
    resource_type: str,
    resource_id: int = None,
    user_id: int = None,
    details: dict = None,
    success: bool = True
):
    """
    记录操作到审计日志

    Args:
        operation: 操作类型 (create, read, update, delete, execute, etc.)
        resource_type: 资源类型 (project, test_case, etc.)
        resource_id: 资源 ID
        user_id: 用户 ID
        details: 详细信息
        success: 是否成功
    """
    audit_logger = get_audit_logger()

    log_message = f"{operation.upper()} {resource_type}"
    if resource_id:
        log_message += f" #{resource_id}"
    if user_id:
        log_message += f" by user #{user_id}"

    extra_info = {
        "operation": operation,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "user_id": user_id,
        "success": success,
        "details": details
    }

    if success:
        audit_logger.info(log_message, extra=extra_info)
    else:
        audit_logger.error(log_message, extra=extra_info)
