"""接口定义模型 - SQLAlchemy 2.0 ORM

按照 Phase 1 重构计划定义的接口表结构
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base_new import Base
from app.utils.datetime import utcnow


class InterfaceFolder(Base):
    """接口目录表 - 存储接口的目录结构

    设计要点:
    - UUID 主键 (分布式友好)
    - 支持嵌套目录 (parent_id 自引用)
    - 与项目关联 (project_id)
    """

    __tablename__ = "interface_folders"

    # 主键 - UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # 外键
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    parent_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("interface_folders.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    # 基本信息
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: utcnow(), nullable=False
    )

    # 表级约束
    __table_args__ = (
        Index("idx_interface_folders_project_parent", "project_id", "parent_id"),
    )

    # 关系
    project = relationship("Project", back_populates="interface_folders")
    parent = relationship("InterfaceFolder", remote_side=[id], backref="children")
    interfaces = relationship("Interface", back_populates="folder", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<InterfaceFolder(id={self.id}, name={self.name})>"


class Interface(Base):
    """接口表 - 存储接口定义

    设计要点:
    - UUID 主键 (分布式友好)
    - 支持标准 HTTP 方法 (GET/POST/PUT/DELETE/PATCH)
    - JSONB 存储请求头、参数、请求体
    - 可选关联到目录 (folder_id)
    """

    __tablename__ = "interfaces"

    # 主键 - UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # 外键
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    folder_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("interface_folders.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # 基本信息
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    method: Mapped[str] = mapped_column(String(10), nullable=False)  # GET/POST/PUT/DELETE/PATCH
    path: Mapped[str] = mapped_column(String(500), nullable=False)

    # 请求配置 (JSONB)
    headers: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)
    params: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)
    body: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)

    # 描述信息
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 排序
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: utcnow(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), default=lambda: utcnow(), onupdate=lambda: utcnow(), nullable=False
    )

    # 表级约束
    __table_args__ = (
        Index("idx_interfaces_project_folder", "project_id", "folder_id"),
        Index("idx_interfaces_method_path", "method", "path"),
    )

    # 关系
    project = relationship("Project", back_populates="interfaces")
    folder = relationship("InterfaceFolder", back_populates="interfaces")

    def __repr__(self) -> str:
        return f"<Interface(id={self.id}, method={self.method}, path={self.path})>"
