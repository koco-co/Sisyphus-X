"""
文档中心模块 - 模型
"""
from typing import Optional, Dict, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Column, JSON, Text


class Document(SQLModel, table=True):
    """文档表"""
    __tablename__ = "document"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    title: str  # 文档标题
    doc_type: str = "operation"  # operation(操作文档), requirement(需求文档)
    content: str = Field(default="", sa_column=Column(Text))  # Markdown 内容
    parent_id: Optional[int] = Field(default=None, foreign_key="document.id")  # 父文档
    order_index: int = 0  # 排序
    is_published: bool = False  # 是否发布
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DocumentVersion(SQLModel, table=True):
    """文档版本历史"""
    __tablename__ = "documentversion"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: int = Field(foreign_key="document.id")
    version: int = 1
    content: str = Field(default="", sa_column=Column(Text))
    change_note: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
