"""TestCase model - SQLAlchemy 2.0 ORM."""

from sqlalchemy import JSON, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class TestCase(Base):
    __tablename__ = "testcase"
    __table_args__ = ()

    id: Mapped[int | None] = mapped_column(Integer, primary_key=True, autoincrement=True)
    interface_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("interfaces.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), nullable=False)
    pre_conditions: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    steps_data: Mapped[list] = mapped_column(JSON, default=list)
    engine_type: Mapped[str] = mapped_column(String(50), nullable=False)
    tags: Mapped[list] = mapped_column(JSON, default=list)
