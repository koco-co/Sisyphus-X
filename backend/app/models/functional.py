"""
功能测试模块 - 用例管理模型
"""
from typing import Optional, List, Dict
from datetime import datetime
from sqlmodel import SQLModel, Field, Column, JSON


class Requirement(SQLModel, table=True):
    """需求表"""
    __tablename__ = "requirement"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    requirement_id: str  # 需求编号 (如: REQ-001)
    name: str  # 需求名称
    description: Optional[str] = None  # 需求描述
    source: Optional[str] = None  # 来源 (导入/手动)
    document_url: Optional[str] = None  # 关联文档URL
    status: str = "active"  # active, archived
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class FunctionalTestCase(SQLModel, table=True):
    """功能测试用例表"""
    __tablename__ = "functionaltestcase"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    requirement_id: int = Field(foreign_key="requirement.id")  # 关联需求
    title: str  # 用例标题
    priority: str = "P2"  # P0, P1, P2, P3
    precondition: Optional[str] = None  # 前置条件
    steps: List[Dict] = Field(default=[], sa_column=Column(JSON))  # 操作步骤 [{step, expected}]
    expected_result: Optional[str] = None  # 预期结果
    status: str = "draft"  # draft, active, deprecated
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AIGenerationTask(SQLModel, table=True):
    """AI用例生成任务表"""
    __tablename__ = "aigenerationtask"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    requirement_id: int = Field(foreign_key="requirement.id")  # 关联需求
    model: str = "gpt-4o-mini"  # 使用的LLM模型
    prompt: Optional[str] = None  # 使用的提示词
    status: str = "pending"  # pending, running, completed, failed
    result: Dict = Field(default={}, sa_column=Column(JSON))  # 生成结果
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
