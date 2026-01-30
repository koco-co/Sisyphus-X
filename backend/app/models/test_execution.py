"""
测试执行记录模型
"""

from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, Column, JSON
from sqlalchemy import DateTime


class TestExecution(SQLModel, table=True):
    """测试执行记录"""

    __tablename__ = "test_executions"

    id: Optional[int] = Field(default=None, primary_key=True)
    test_case_id: int = Field(foreign_key="testcase.id", index=True)
    environment_id: Optional[int] = Field(default=None, foreign_key="projectenvironment.id", index=True)

    status: str = Field(default="pending")  # pending, running, success, failed, error
    started_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    completed_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    duration: Optional[float] = Field(default=None)  # 执行时长（秒）

    result_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    error_message: Optional[str] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
