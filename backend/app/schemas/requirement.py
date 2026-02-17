"""需求相关的 Pydantic Schemas"""
from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field


class RequirementBase(BaseModel):
    """需求基础模型"""

    requirement_id: str = Field(..., max_length=100, description="需求ID (REQ-2025-001)")
    name: str = Field(..., max_length=255, description="需求名称")
    module_id: Optional[str] = Field(None, max_length=100, description="禅道模块ID")
    module_name: str = Field(..., max_length=255, description="禅道模块名称")
    iteration: Optional[str] = Field(None, max_length=100, description="迭代")
    priority: str = Field(..., max_length=20, description="优先级 (high/medium/low)")
    description: str = Field(default="", description="需求描述 (Markdown格式)")
    attachments: List[Dict[str, Any]] = Field(default_factory=list, description="附件列表")


class RequirementCreate(RequirementBase):
    """创建需求时的请求模型"""

    pass


class RequirementUpdate(BaseModel):
    """更新需求时的请求模型"""

    name: Optional[str] = Field(None, max_length=255, description="需求名称")
    module_id: Optional[str] = Field(None, max_length=100, description="禅道模块ID")
    module_name: Optional[str] = Field(None, max_length=255, description="禅道模块名称")
    iteration: Optional[str] = Field(None, max_length=100, description="迭代")
    priority: Optional[str] = Field(None, max_length=20, description="优先级")
    description: Optional[str] = Field(None, description="需求描述")
    attachments: Optional[List[Dict[str, Any]]] = Field(None, description="附件列表")
    ai_conversation_id: Optional[str] = Field(None, max_length=100, description="AI对话ID")
    clarification_status: Optional[str] = Field(
        None, max_length=20, description="澄清状态 (draft/clarifying/confirmed)"
    )
    risk_points: Optional[List[Dict[str, Any]]] = Field(None, description="风险点")
    status: Optional[str] = Field(None, max_length=20, description="状态 (draft/review/approved/cancelled)")
    test_case_suite_id: Optional[int] = Field(None, description="测试用例套件ID")


class RequirementResponse(RequirementBase):
    """需求响应模型"""

    id: int
    ai_conversation_id: Optional[str] = None
    clarification_status: str = Field(..., description="澄清状态")
    risk_points: List[Dict[str, Any]] = Field(default_factory=list, description="风险点")
    status: str = Field(..., description="状态")
    test_case_suite_id: Optional[int] = None
    created_by: int
    created_at: datetime
    updated_at: datetime
    version: int

    model_config = {"from_attributes": True}
