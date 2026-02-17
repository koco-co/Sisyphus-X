"""Interface request history model."""

from datetime import datetime, timezone

from sqlalchemy import Index
from sqlmodel import JSON, Column, Field, SQLModel
from typing import Optional, Dict, Any, List


class InterfaceHistory(SQLModel, table=True):
    """Interface request history record."""

    __tablename__ = "interfacehistory"  # pyright: ignore[reportAssignmentType]

    id: Optional[int] = Field(default=None, primary_key=True)
    interface_id: int = Field(foreign_key="interface.id", index=True, description="Interface ID")
    user_id: int = Field(foreign_key="users.id", index=True, description="User ID")

    # Request snapshot
    url: str = Field(description="Request URL")
    method: str = Field(max_length=10, description="Request method")
    headers: dict = Field(default=dict, sa_column=Column(JSON), description="Request headers")
    params: dict = Field(default=dict, sa_column=Column(JSON), description="Query parameters")
    body: dict = Field(default=dict, sa_column=Column(JSON), description="Request body")

    # Response snapshot
    status_code: Optional[int] = Field(default=None, description="Response status code")
    response_headers: dict = Field(default=dict, sa_column=Column(JSON), description="Response headers")
    response_body: dict = Field(default=dict, sa_column=Column(JSON), description="Response body")
    elapsed: Optional[float] = Field(default=None, description="Request elapsed time (seconds)")
    timeline: dict = Field(default=dict, sa_column=Column(JSON), description="Timeline data (DNS/TCP/TTFB/Download)")

    created_at: datetime = Field(default_factory=datetime.now(timezone.utc), index=True, description="Created at")

    __table_args__ = (
        Index("idx_interface_history_created_at", "created_at"),
    )
