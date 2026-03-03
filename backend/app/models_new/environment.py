# backend/app/models_new/environment.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.base_new import Base


class Environment(Base):
    """环境表"""
    __tablename__ = "environments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    base_url = Column(String(500), nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    project = relationship("Project", back_populates="environments")
    variables = relationship("EnvironmentVariable", back_populates="environment", cascade="all, delete-orphan")
    executions = relationship("Execution", back_populates="environment")

    def __repr__(self):
        return f"<Environment {self.name}>"


class EnvironmentVariable(Base):
    """环境变量表"""
    __tablename__ = "environment_variables"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    environment_id = Column(UUID(as_uuid=True), ForeignKey("environments.id", ondelete="CASCADE"), nullable=False)
    key = Column(String(255), nullable=False)
    value = Column(Text, nullable=True)
    description = Column(Text, nullable=True)

    # 关系
    environment = relationship("Environment", back_populates="variables")

    def __repr__(self):
        return f"<EnvironmentVariable {self.key}>"


class GlobalVariable(Base):
    """全局变量表"""
    __tablename__ = "global_variables"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    key = Column(String(255), nullable=False)
    value = Column(Text, nullable=True)
    description = Column(Text, nullable=True)

    # 关系
    project = relationship("Project", back_populates="global_variables")

    def __repr__(self):
        return f"<GlobalVariable {self.key}>"
