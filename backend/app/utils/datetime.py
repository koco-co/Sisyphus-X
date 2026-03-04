"""时区感知的 DateTime 工具函数

提供统一的 UTC 时间获取方法，替代已弃用的 utcnow()
"""
from datetime import UTC, datetime


def utcnow() -> datetime:
    """获取当前 UTC 时间（不带时区，兼容 PostgreSQL TIMESTAMP WITHOUT TIME ZONE）

    替代已弃用的 utcnow()，返回 naive datetime 对象以兼容 PostgreSQL。

    Returns:
        datetime: 不带时区信息的 UTC 时间

    Example:
        >>> from app.utils.datetime import utcnow
        >>> now = utcnow()
        >>> now.tzinfo is None
        True
    """
    return datetime.now(UTC).replace(tzinfo=None)
