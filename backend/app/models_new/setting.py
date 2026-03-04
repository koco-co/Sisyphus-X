# backend/app/models_new/setting.py
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.core.base_new import Base


class GlobalParam(Base):
    """全局参数表"""
    __tablename__ = "global_params"
    __table_args__ = {"extend_existing": True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_name = Column(String(255), nullable=False)
    method_name = Column(String(255), nullable=False)
    code = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    input_params = Column(JSONB, default=list)  # [{name, type, description}]
    output_params = Column(JSONB, default=list)  # [{name, type, description}]
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<GlobalParam {self.class_name}.{self.method_name}>"
