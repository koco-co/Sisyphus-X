"""
需求模型 - 功能测试模块
管理产品需求文档和AI澄清记录
"""

from datetime import datetime

from sqlmodel import JSON, Column, Field, SQLModel


class Requirement(SQLModel, table=True):
    """需求表"""

    __tablename__ = "requirements"  # pyright: ignore[reportAssignmentType]
    id: int | None = Field(default=None, primary_key=True)
    requirement_id: str = Field(unique=True, index=True)  # REQ-2025-001
    name: str
    module_id: str | None = None  # 禅道模块ID
    module_name: str
    iteration: str | None = None
    priority: str  # high/medium/low

    # 需求内容
    description: str = Field(default="")  # Markdown格式
    attachments: list[str] = Field(default=[], sa_column=Column(JSON))  # MinIO存储路径数组

    # AI澄清记录
    ai_conversation_id: str | None = None
    clarification_status: str = Field(default="draft")  # draft/clarifying/confirmed
    risk_points: list[str] = Field(default=[], sa_column=Column(JSON))  # JSON数组

    # 状态
    status: str = Field(default="draft")  # draft/review/approved/cancelled

    # 关联
    test_case_suite_id: int | None = None

    # 元数据
    created_by: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = Field(default=1)

    class Config:
        indexes = [
            "requirement_id",
            "module_id",
            ["status", "created_by"],
        ]
