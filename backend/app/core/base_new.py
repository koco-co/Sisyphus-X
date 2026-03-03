"""SQLAlchemy 2.0 Base 类 for models_new

这个文件定义 models_new 中所有 ORM 模型的基类。
使用独立的 Base 类以避免与现有 models 目录的冲突。

注意：在 Phase 1 完成后，这个 Base 类将与 app.core.base 合并。
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 Base class for new ORM models

    所有新的数据库模型都应该继承这个基类。
    使用 DeclarativeBase 而不是 declarative_base() 是 SQLAlchemy 2.0 的新特性。

    示例:
        from app.core.base_new import Base

        class User(Base):
            __tablename__ = "users"
            id: Mapped[int] = mapped_column(primary_key=True)
    """
    pass
