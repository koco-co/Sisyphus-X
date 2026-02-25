"""系统设置 API 使用的 Pydantic Schema（从 ORM 读取）"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GlobalConfigRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    key: str = ""
    value: str = ""
    category: str = "general"
    description: str | None = None
    is_secret: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


class NotificationChannelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    name: str = ""
    channel_type: str = ""
    config: dict = {}
    is_enabled: bool = True
    description: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    name: str = ""
    code: str = ""
    permissions: dict = {}
    description: str | None = None
    created_at: datetime | None = None
