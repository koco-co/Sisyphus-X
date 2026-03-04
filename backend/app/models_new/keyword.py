# backend/app/models_new/keyword.py
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.core.base_new import Base


class Keyword(Base):
    """关键字表"""
    __tablename__ = "keywords"
    __table_args__ = {"extend_existing": True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    keyword_type = Column(String(100), nullable=False)  # 发送请求/断言类型/提取变量/数据库操作/自定义操作
    name = Column(String(255), nullable=False)
    method_name = Column(String(100), nullable=False)
    code = Column(Text, nullable=True)  # Monaco 编辑器代码
    params_schema = Column(JSONB, default=dict)  # 参数 schema
    is_builtin = Column(Boolean, default=False)  # 内置关键字不可删除
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Keyword {self.name}>"
