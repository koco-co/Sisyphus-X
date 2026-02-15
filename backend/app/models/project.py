"""项目相关模型 - SQLAlchemy 2.0 ORM"""
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class Project(Base):
    """项目表 - 存储测试项目基本信息"""

    __tablename__ = "project"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # 项目名称
    key: Mapped[str] = mapped_column(String(100), nullable=False)  # 项目标识 (如: ORDER_CENTER)
    owner: Mapped[str] = mapped_column(String(100), nullable=False)  # 负责人
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class InterfaceFolder(Base):
    """接口文件夹 - 支持树形组织结构"""

    __tablename__ = "interfacefolder"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("project.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # 文件夹名称
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("interfacefolder.id"), nullable=True
    )  # 父文件夹ID (支持树形结构)
    order: Mapped[int] = mapped_column(Integer, default=0)  # 同级排序序号
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, nullable=False)


class Interface(Base):
    """接口表 - 存储 API 接口定义"""

    __tablename__ = "interface"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("project.id"), nullable=False, index=True
    )
    folder_id: Mapped[int | None] = mapped_column(
        ForeignKey("interfacefolder.id"), nullable=True
    )  # 所属文件夹
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # 接口名称
    url: Mapped[str] = mapped_column(Text, nullable=False)  # 接口路径
    method: Mapped[str] = mapped_column(String(10), nullable=False)  # GET/POST/PUT/DELETE
    status: Mapped[str] = mapped_column(
        String(20), default="draft"
    )  # draft/stable/deprecated
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # 接口描述
    headers: Mapped[dict] = mapped_column(JSON, default={})  # 请求头
    params: Mapped[dict] = mapped_column(JSON, default={})  # Query 参数
    body: Mapped[dict] = mapped_column(JSON, default={})  # 请求体
    body_type: Mapped[str] = mapped_column(
        String(50), default="json"
    )  # none/json/form-data/x-www-form-urlencoded/raw
    cookies: Mapped[dict] = mapped_column(JSON, default={})  # Cookies
    order: Mapped[int] = mapped_column(Integer, default=0)  # 同级排序序号
    auth_config: Mapped[dict] = mapped_column(JSON, default={})  # 认证配置
    schema_snapshot: Mapped[dict] = mapped_column(JSON, default={})  # Swagger 原始结构
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class ProjectEnvironment(Base):
    """项目环境配置 - 存储不同环境的URL、变量、请求头"""

    __tablename__ = "projectenvironment"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("project.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # 环境名称 (如: Dev, Test, Prod)
    domain: Mapped[str] = mapped_column(
        String(500), default=""
    )  # Base URL (如: https://api-dev.example.com)
    variables: Mapped[dict] = mapped_column(JSON, default={})  # 全局变量
    headers: Mapped[dict] = mapped_column(JSON, default={})  # 全局请求头
    is_preupload: Mapped[bool] = mapped_column(Boolean, default=False)  # 是否预上传
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class ProjectDataSource(Base):
    """项目数据源配置 - 存储数据库连接信息"""

    __tablename__ = "projectdatasource"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("project.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # 数据源名称 (如: 主库, 从库)
    db_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # 数据库类型 (mysql, postgresql, mongodb, redis)
    host: Mapped[str] = mapped_column(String(255), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    db_name: Mapped[str] = mapped_column(String(100), default="")  # 数据库名
    username: Mapped[str] = mapped_column(String(100), default="")
    password_hash: Mapped[str] = mapped_column(String(255), default="")  # 加密存储的密码
    variable_name: Mapped[str] = mapped_column(String(100), default="")  # 引用变量名
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)  # 是否启用
    status: Mapped[str] = mapped_column(String(20), default="unchecked")  # unchecked, connected, error
    last_test_at: Mapped[datetime | None] = mapped_column(nullable=True)
    error_msg: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


# 别名，用于简化导入
Environment = ProjectEnvironment
