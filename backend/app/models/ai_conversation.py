"""
AI对话历史模型 - 功能测试模块
存储LangGraph对话状态和历史消息
"""

from datetime import datetime
from typing import Any

from sqlmodel import JSON, Column, Field, SQLModel


class AIConversation(SQLModel, table=True):
    """AI对话历史表"""

    __tablename__ = "ai_conversations"

    id: int = Field(primary_key=True)
    conversation_id: str = Field(unique=True, index=True)  # 对话唯一标识 (LangGraph thread_id)
    requirement_id: int | None = None

    # 会话信息
    session_type: str  # requirement_clarification/test_point_generation/test_case_generation
    ai_model_used: str | None = None

    # 消息存储 (JSON)
    messages: dict[str, Any] = Field(default={}, sa_column=Column(JSON))  # LangGraph State

    # 元数据
    created_by: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        indexes = [
            "conversation_id",
            "requirement_id",
        ]
