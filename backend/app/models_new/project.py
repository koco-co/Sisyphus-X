"""项目模型 - SQLAlchemy 2.0 ORM

按照 Phase 1 重构计划定义的项目表结构
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base
from app.utils.datetime import utcnow


class Project(Base):
    """项目表 - 存储测试项目基本信息

    设计要点:
    - UUID 主键 (分布式友好)
    - 外键关联到 users 表 (created_by)
    - UNIQUE(created_by, name) 约束
    """

    __tablename__ = "projects"

    # 主键 - UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # 基本信息
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 外键
    created_by: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: utcnow(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: utcnow(), onupdate=lambda: utcnow(), nullable=False
    )

    # 表级约束
    __table_args__ = (
        Index("idx_projects_created_by_name", "created_by", "name", unique=True),
    )

    # 关系
    created_by_user = relationship("User", back_populates="projects")
    database_configs = relationship("DatabaseConfig", back_populates="project", cascade="all, delete-orphan")
    environments = relationship("Environment", back_populates="project", cascade="all, delete-orphan")
    global_variables = relationship("GlobalVariable", back_populates="project", cascade="all, delete-orphan")
    interface_folders = relationship("InterfaceFolder", back_populates="project", cascade="all, delete-orphan")
    interfaces = relationship("Interface", back_populates="project", cascade="all, delete-orphan")
    scenarios = relationship("Scenario", back_populates="project", cascade="all, delete-orphan")
    test_plans = relationship("TestPlan", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name={self.name})>"
