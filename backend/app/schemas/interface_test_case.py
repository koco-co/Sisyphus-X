"""Interface test case schemas."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class InterfaceTestCaseBase(BaseModel):
    """Test case base schema."""

    name: str = Field(..., max_length=100)
    keyword_name: str = Field(..., max_length=100)
    yaml_path: str = Field(..., max_length=255)
    scenario_id: Optional[int] = None
    assertions: dict[str, Any] = {}


class InterfaceTestCaseCreate(InterfaceTestCaseBase):
    """Create test case."""

    interface_id: int
    project_id: int
    auto_assertion: bool = True


class InterfaceTestCaseResponse(InterfaceTestCaseBase):
    """Test case response."""

    id: int
    interface_id: int
    project_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GenerateTestCaseRequest(BaseModel):
    """Generate test case request."""

    case_name: str = Field(..., max_length=100)
    keyword_name: str = Field(..., max_length=100)
    scenario_id: Optional[int] = None
    auto_assertion: bool = True
    environment_id: int


class GenerateTestCaseResponse(BaseModel):
    """Generate test case response."""

    test_case: InterfaceTestCaseResponse
    yaml_content: str
    assertions: list[dict[str, Any]]


class PreviewYamlRequest(BaseModel):
    """Preview YAML request."""

    environment_id: int
    auto_assertion: bool = True


class PreviewYamlResponse(BaseModel):
    """Preview YAML response."""

    yaml_content: str
