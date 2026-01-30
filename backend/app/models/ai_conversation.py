"""
AI对话历史模型 - 功能测试模块
存储LangGraph对话状态和历史消息
"""
from sqlmodel import SQLModel, Field, Column, JSON
from typing import Optional, Dict, Any
from datetime import datetime


class AIConversation(SQLModel, table=True):
    """AI对话历史表"""
    __tablename__ = "ai_conversations"

    id: int = Field(primary_key=True)
    conversation_id: str = Field(unique=True, index=True)  # 对话唯一标识 (LangGraph thread_id)
    requirement_id: Optional[int] = None

    # 会话信息
    session_type: str  # requirement_clarification/test_point_generation/test_case_generation
    ai_model_used: Optional[str] = None

    # 消息存储 (JSON)
    messages: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))  # LangGraph State

    # 元数据
    created_by: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        indexes = [
            "conversation_id",
            "requirement_id",
        ]
