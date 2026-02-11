"""
测试执行记录模型
"""

from datetime import datetime

from sqlalchemy import DateTime
from sqlmodel import JSON, Column, Field, SQLModel


class TestExecution(SQLModel, table=True):
    """测试执行记录"""

    __tablename__ = "test_executions"  # pyright: ignore[reportAssignmentType]
    id: int | None = Field(default=None, primary_key=True)
    test_case_id: int = Field(foreign_key="testcase.id", index=True)
    environment_id: int | None = Field(
        default=None, foreign_key="projectenvironment.id", index=True
    )

    status: str = Field(default="pending")  # pending, running, success, failed, error
    started_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    completed_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    duration: float | None = Field(default=None)  # 执行时长（秒）

    result_data: dict | None = Field(default=None, sa_column=Column(JSON))
    error_message: str | None = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)))
