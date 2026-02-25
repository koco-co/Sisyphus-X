"""
AI配置模型 - 功能测试模块
支持多AI厂商配置管理
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class AIProviderConfig(Base):
    """AI厂商配置表"""

    __tablename__ = "ai_provider_configs"

    __table_args__ = (
        Index("idx_ai_provider_user_type", "user_id", "provider_type"),
        Index("idx_ai_provider_enabled_default", "is_enabled", "is_default"),
    )

    id: Mapped[int | None] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider_name: Mapped[str] = mapped_column(String(255), index=True)
    provider_type: Mapped[str] = mapped_column(String(100), index=True)
    api_key_encrypted: Mapped[str] = mapped_column(String(500), nullable=False)
    api_endpoint: Mapped[str | None] = mapped_column(String(500), nullable=True)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    max_tokens: Mapped[int] = mapped_column(Integer, default=4000)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
