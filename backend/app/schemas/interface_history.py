"""Interface history schemas."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class InterfaceHistoryBase(BaseModel):
    """Interface history base schema."""

    interface_id: str
    url: str
    method: str
    headers: dict[str, Any] = {}
    params: dict[str, Any] = {}
    body: dict[str, Any] = {}
    status_code: Optional[int] = None
    response_headers: dict[str, Any] = {}
    response_body: dict[str, Any] = {}
    elapsed: Optional[float] = None
    timeline: dict[str, Any] = {}


class InterfaceHistoryCreate(InterfaceHistoryBase):
    """Create interface history."""

    pass


class InterfaceHistoryResponse(InterfaceHistoryBase):
    """Interface history response."""

    id: str
    user_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class InterfaceHistoryListResponse(BaseModel):
    """Interface history list response."""

    items: list[InterfaceHistoryResponse]
    total: int
    page: int
    size: int
    pages: int
