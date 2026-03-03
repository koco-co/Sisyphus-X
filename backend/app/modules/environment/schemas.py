"""Environment module Pydantic schemas."""

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from app.core.response import PagedData


# ============================================================================
# Environment Variable Schemas
# ============================================================================


class EnvironmentVariableCreate(BaseModel):
    """Create environment variable request."""

    key: str = Field(..., min_length=1, max_length=255, description="Variable key")
    value: str | None = Field(None, description="Variable value")
    description: str | None = Field(None, description="Variable description")


class EnvironmentVariableUpdate(BaseModel):
    """Update environment variable request."""

    key: str | None = Field(None, min_length=1, max_length=255, description="Variable key")
    value: str | None = Field(None, description="Variable value")
    description: str | None = Field(None, description="Variable description")


class EnvironmentVariableResponse(BaseModel):
    """Environment variable response."""

    id: UUID
    environment_id: UUID
    key: str
    value: str | None
    description: str | None

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Environment Schemas
# ============================================================================


class EnvironmentCreate(BaseModel):
    """Create environment request."""

    name: str = Field(..., min_length=1, max_length=255, description="Environment name")
    base_url: str | None = Field(None, max_length=500, description="Base URL for the environment")
    is_default: bool = Field(False, description="Whether this is the default environment")
    variables: list[EnvironmentVariableCreate] = Field(
        default_factory=list, description="Environment variables"
    )


class EnvironmentUpdate(BaseModel):
    """Update environment request."""

    name: str | None = Field(None, min_length=1, max_length=255, description="Environment name")
    base_url: str | None = Field(None, max_length=500, description="Base URL for the environment")
    is_default: bool | None = Field(None, description="Whether this is the default environment")


class EnvironmentResponse(BaseModel):
    """Environment response."""

    id: UUID
    project_id: UUID
    name: str
    base_url: str | None
    is_default: bool
    created_at: datetime
    variables: list[EnvironmentVariableResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class EnvironmentListResponse(BaseModel):
    """Environment list response - compatible with ApiResponse[PagedData[EnvironmentResponse]]."""

    code: int = 0
    message: str = "success"
    data: "PagedData[EnvironmentResponse]"

    model_config = ConfigDict(from_attributes=True)


class EnvironmentBriefResponse(BaseModel):
    """Brief environment response without variables (for list views)."""

    id: UUID
    project_id: UUID
    name: str
    base_url: str | None
    is_default: bool
    created_at: datetime
    variable_count: int = Field(default=0, description="Number of variables")

    model_config = ConfigDict(from_attributes=True)
