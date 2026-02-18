"""Interface test case model."""

from datetime import datetime

from sqlalchemy import DateTime, UniqueConstraint
from sqlmodel import JSON, Column, Field, SQLModel
from typing import Optional, Dict, Any, List


class InterfaceTestCase(SQLModel, table=True):
    """Test case generated from interface."""

    __tablename__ = "interfacetestcase"  # pyright: ignore[reportAssignmentType]

    id: Optional[int] = Field(default=None, primary_key=True)
    interface_id: int = Field(foreign_key="interface.id", index=True, description="Interface ID")
    project_id: int = Field(foreign_key="project.id", index=True, description="Project ID")

    name: str = Field(max_length=100, description="Test case name")
    keyword_name: str = Field(max_length=100, description="Keyword function name")
    yaml_path: str = Field(max_length=255, unique=True, index=True, description="YAML file relative path")

    scenario_id: Optional[int] = Field(
        default=None,
        foreign_key="testscenario.id",
        description="Scenario ID"
    )

    assertions: Dict[str, Any] = Field(default=dict, sa_column=Column(JSON), description="Assertion config")

    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), description="Created at")
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), description="Updated at")

    __table_args__ = (
        UniqueConstraint("yaml_path", name="uq_interface_test_case_yaml_path"),
    )
