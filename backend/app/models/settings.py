"""
系统设置模块 - 全局配置模型
"""

from datetime import datetime

from sqlmodel import JSON, Column, Field, SQLModel


class GlobalConfig(SQLModel, table=True):
    """全局配置表"""

    __tablename__ = "globalconfig"

    id: int | None = Field(default=None, primary_key=True)
    key: str = Field(unique=True, index=True)  # 配置键
    value: str = ""  # 配置值
    category: str = "general"  # 分类: general, minio, llm, notification
    description: str | None = None  # 配置描述
    is_secret: bool = False  # 是否为敏感信息（隐藏显示）
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class NotificationChannel(SQLModel, table=True):
    """消息通知渠道配置"""

    __tablename__ = "notificationchannel"

    id: int | None = Field(default=None, primary_key=True)
    name: str  # 渠道名称
    channel_type: str  # feishu, wecom, dingtalk, email, sms, custom
    config: dict = Field(default={}, sa_column=Column(JSON))  # 配置信息 (webhook, token等)
    is_enabled: bool = True
    description: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Role(SQLModel, table=True):
    """角色表"""

    __tablename__ = "roles"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True)  # 角色名称
    code: str = Field(unique=True)  # 角色代码: admin, tester, viewer
    permissions: dict = Field(default={}, sa_column=Column(JSON))  # 权限配置
    description: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # 关系
    # 注意: Permission 在 user_management.py 中定义，避免循环导入
    # permission_list: list["Permission"] = Relationship(
    #     back_populates="roles", sa_relationship_kwargs={"secondary": "role_permissions"}
    # )


class UserRole(SQLModel, table=True):
    """用户角色关联表"""

    __tablename__ = "userrole"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    role_id: int = Field(foreign_key="roles.id")
