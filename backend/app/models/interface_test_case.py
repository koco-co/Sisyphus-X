"""Interface test case model - SQLAlchemy 2.0."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class InterfaceTestCase(Base):
    """Test case generated from interface."""

    __tablename__ = "interfacetestcase"

    __table_args__ = (UniqueConstraint("yaml_path", name="uq_interface_test_case_yaml_path"),)

    id: Mapped[int | None] = mapped_column(Integer, primary_key=True, autoincrement=True)
    interface_id: Mapped[str] = mapped_column(String(36), ForeignKey("interfaces.id"), index=True, nullable=False)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    keyword_name: Mapped[str] = mapped_column(String(100), nullable=False)
    yaml_path: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    scenario_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("scenarios.id"), nullable=True)
    assertions: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
