"""SQLAlchemy 2.0 Base 类

这个文件定义所有 ORM 模型的基类。
放在单独的文件中以避免循环导入问题。
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 Base class for all ORM models

    所有数据库模型都应该继承这个基类。
    使用 DeclarativeBase 而不是 declarative_base() 是 SQLAlchemy 2.0 的新特性。

    示例:
        from app.core.base import Base

        class User(Base):
            __tablename__ = "users"
            id: Mapped[int] = mapped_column(primary_key=True)
    """
    pass
