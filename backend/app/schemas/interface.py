from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class InterfaceSendRequest(BaseModel):
    url: str
    method: str
    headers: dict[str, str] | None = {}
    params: dict[str, Any] | None = {}
    body: Any | None = None
    files: dict[str, str] | None = {}  # key: filename, value: object_name
    timeout: int = 10

    model_config = {
        "json_schema_extra": {
            "example": {
                "url": "https://httpbin.org/post",
                "method": "POST",
                "headers": {"Content-Type": "application/json"},
                "body": {"foo": "bar"},
            }
        }
    }


class InterfaceSendResponse(BaseModel):
    status_code: int
    headers: dict[str, str]
    body: Any
    elapsed: float  # seconds


class EngineExecuteRequest(BaseModel):
    """Request to execute test case via sisyphus-api-engine."""

    interface_id: int | None = Field(None, description="Interface ID (optional)")
    environment_id: int | None = Field(None, description="Environment ID (optional)")
    yaml_content: str | None = Field(None, description="YAML content (optional)")
    variables: dict[str, Any] = Field(default_factory=dict, description="Additional variables")
    timeout: int = Field(default=300, description="Execution timeout in seconds")


class EngineExecuteResponse(BaseModel):
    """Response from engine execution."""

    success: bool
    result: dict[str, Any] | None = None
    error: str | None = None


class CurlParseRequest(BaseModel):
    """Request to parse cURL command."""

    curl_command: str = Field(..., description="cURL command to parse")


class CurlParseResponse(BaseModel):
    """Response from cURL parsing."""

    method: str
    url: str
    headers: dict[str, str]
    params: dict[str, str]
    body: Any
    body_type: str
    auth: dict[str, Any]


# ============================================
# Interface CRUD Schemas
# ============================================


class InterfaceCreate(BaseModel):
    """Create interface request."""

    project_id: int
    folder_id: int | None = None
    name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., min_length=1, max_length=2048)
    method: str = Field(..., pattern="^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$")
    status: str = "draft"
    description: str | None = None
    headers: dict[str, str] = {}
    params: dict[str, Any] = {}
    body: Any = {}
    body_type: str = "json"
    cookies: dict[str, str] = {}
    order: int = 0
    auth_config: dict[str, Any] = {}


class InterfaceUpdate(BaseModel):
    """Update interface request."""

    name: str | None = Field(None, min_length=1, max_length=255)
    url: str | None = Field(None, min_length=1, max_length=2048)
    method: str | None = Field(None, pattern="^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$")
    status: str | None = None
    description: str | None = None
    headers: dict[str, str] | None = None
    params: dict[str, Any] | None = None
    body: Any | None = None
    body_type: str | None = None
    cookies: dict[str, str] | None = None
    folder_id: int | None = None
    auth_config: dict[str, Any] | None = None


class InterfaceResponse(BaseModel):
    """Interface response."""

    id: int
    project_id: int
    folder_id: int | None
    name: str
    url: str
    method: str
    status: str
    description: str | None
    headers: dict[str, str]
    params: dict[str, Any]
    body: Any
    body_type: str
    cookies: dict[str, str]
    order: int
    auth_config: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Folder Schemas
# ============================================


class FolderCreate(BaseModel):
    """Create folder request."""

    project_id: int
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: int | None = None
    order: int = 0


class FolderResponse(BaseModel):
    """Folder response."""

    id: int
    project_id: int
    name: str
    parent_id: int | None
    order: int
    created_at: datetime

    class Config:
        from_attributes = True


class FolderMoveRequest(BaseModel):
    """Move folder request."""

    target_parent_id: int | None = None
    target_order: int | None = None


# ============================================
# Interface Move/Copy Schemas
# ============================================


class InterfaceMoveRequest(BaseModel):
    """Move interface request."""

    target_folder_id: int | None = None


class InterfaceCopyRequest(BaseModel):
    """Copy interface request."""

    name: str = Field(..., min_length=1, max_length=255)
    target_folder_id: int | None = None
