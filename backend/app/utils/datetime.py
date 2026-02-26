"""时区感知的 DateTime 工具函数

提供统一的 UTC 时间获取方法，替代已弃用的 utcnow()
"""
from datetime import datetime, timezone


def utcnow() -> datetime:
    """获取当前 UTC 时间（时区感知）

    替代已弃用的 utcnow()，返回 timezone-aware 的 datetime 对象。

    Returns:
        datetime: 带有 UTC 时区信息的当前时间

    Example:
        >>> from app.utils.datetime import utcnow
        >>> now = utcnow()
        >>> now.tzinfo
        datetime.timezone.utc
    """
    return datetime.now(timezone.utc)
