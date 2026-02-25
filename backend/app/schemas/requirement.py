"""需求相关的 Pydantic Schemas"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class RequirementBase(BaseModel):
    """需求基础模型"""

    requirement_id: str = Field(..., max_length=100, description="需求ID (REQ-2025-001)")
    name: str = Field(..., max_length=255, description="需求名称")
    module_id: str | None = Field(None, max_length=100, description="禅道模块ID")
    module_name: str = Field(..., max_length=255, description="禅道模块名称")
    iteration: str | None = Field(None, max_length=100, description="迭代")
    priority: str = Field(..., max_length=20, description="优先级 (high/medium/low)")
    description: str = Field(default="", description="需求描述 (Markdown格式)")
    attachments: list[dict[str, Any]] = Field(default_factory=list, description="附件列表")


class RequirementCreate(RequirementBase):
    """创建需求时的请求模型"""

    pass


class RequirementUpdate(BaseModel):
    """更新需求时的请求模型"""

    name: str | None = Field(None, max_length=255, description="需求名称")
    module_id: str | None = Field(None, max_length=100, description="禅道模块ID")
    module_name: str | None = Field(None, max_length=255, description="禅道模块名称")
    iteration: str | None = Field(None, max_length=100, description="迭代")
    priority: str | None = Field(None, max_length=20, description="优先级")
    description: str | None = Field(None, description="需求描述")
    attachments: list[dict[str, Any]] | None = Field(None, description="附件列表")
    ai_conversation_id: str | None = Field(None, max_length=100, description="AI对话ID")
    clarification_status: str | None = Field(
        None, max_length=20, description="澄清状态 (draft/clarifying/confirmed)"
    )
    risk_points: list[dict[str, Any]] | None = Field(None, description="风险点")
    status: str | None = Field(None, max_length=20, description="状态 (draft/review/approved/cancelled)")
    test_case_suite_id: int | None = Field(None, description="测试用例套件ID")


class RequirementResponse(RequirementBase):
    """需求响应模型"""

    id: int
    ai_conversation_id: str | None = None
    clarification_status: str = Field(..., description="澄清状态")
    risk_points: list[dict[str, Any]] = Field(default_factory=list, description="风险点")
    status: str = Field(..., description="状态")
    test_case_suite_id: int | None = None
    created_by: int
    created_at: datetime
    updated_at: datetime
    version: int

    model_config = {"from_attributes": True}


class FunctionalTestCaseResponse(BaseModel):
    """功能测试用例响应（从 ORM 读取）"""

    model_config = {"from_attributes": True}

    id: int | None = None
    case_id: str = ""
    requirement_id: int = 0
    test_suite_id: int | None = None
    test_point_id: int | None = None
    module_name: str = ""
    page_name: str = ""
    title: str = ""
    priority: str = ""
    case_type: str = ""
    preconditions: list[Any] = Field(default_factory=list)
    steps: list[Any] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    is_automated: bool = False
    complexity: str | None = None
    estimated_time: int = 0
    is_ai_generated: bool = False
    ai_model: str | None = None
    status: str = "draft"
    created_by: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None
    version: int = 1
