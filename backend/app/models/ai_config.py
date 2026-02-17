"""
AI配置模型 - 功能测试模块
支持多AI厂商配置管理
"""

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel
from typing import Optional, Dict, Any, List


class AIProviderConfig(SQLModel, table=True):
    """AI厂商配置表"""

    __tablename__ = "ai_provider_configs"  # pyright: ignore[reportAssignmentType]

    id: Optional[int] = Field(default=None, primary_key=True)
    provider_name: str = Field(index=True)  # OpenAI/Anthropic/通义千问/文心一言
    provider_type: str = Field(index=True)  # openai/anthropic/qwen/qianfan
    api_key_encrypted: str  # AES加密存储
    api_endpoint: Optional[str] = None  # 自定义endpoint
    model_name: str
    temperature: float = Field(default=0.7)
    max_tokens: int = Field(default=4000)
    is_enabled: bool = Field(default=True)
    is_default: bool = Field(default=False)
    user_id: int = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=datetime.now(timezone.utc))

    class Config:
        indexes = [
            ["user_id", "provider_type"],
            ["is_enabled", "is_default"],
        ]
