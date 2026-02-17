"""
测试用例知识库模型 - 功能测试模块
使用pgvector存储向量，支持语义搜索
"""

from datetime import datetime, timezone

from sqlmodel import JSON, Column, Field, SQLModel
from typing import Optional, Dict, Any, List


class TestCaseKnowledge(SQLModel, table=True):
    """测试用例知识库表（向量存储）"""

    __tablename__ = "test_case_knowledge"  # pyright: ignore[reportAssignmentType]

    id: Optional[int] = Field(default=None, primary_key=True)
    test_case_id: int = Field(unique=True, index=True)  # 关联test_cases

    # 向量化数据（SQLite不支持ARRAY，使用JSON存储）
    embedding: list[float] = Field(
        default=list, sa_column=Column(JSON)
    )  # 1536维向量

    # 元数据 (用于过滤)
    embedding_model: str  # text-embedding-3-small/bert-base-chinese
    module_name: str
    priority: str
    case_type: str
    tags: list[str] = Field(default=list, sa_column=Column(JSON))

    # 质量指标
    quality_score: float = Field(default=0.0)  # 0.0-10.0
    usage_count: int = Field(default=0)  # 被引用次数

    created_at: datetime = Field(default_factory=datetime.now(timezone.utc))

    class Config:
        indexes = [
            "test_case_id",
        ]
