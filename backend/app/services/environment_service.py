"""Environment management service."""

from typing import Any

from sqlmodel import Session, select

from app.models.project import ProjectEnvironment
from app.schemas.environment import (
    EnvironmentCopyRequest,
    EnvironmentCreate,
    EnvironmentUpdate,
)
from app.services.variable_replacer import VariableReplacer


class EnvironmentService:
    """Service for managing project environments."""

    def __init__(self, session: Session) -> None:
        """Initialize the service.

        Args:
            session: Database session
        """
        self.session = session

    def create(self, project_id: int, data: EnvironmentCreate) -> ProjectEnvironment:
        """Create a new environment.

        Args:
            project_id: Project ID
            data: Environment creation data

        Returns:
            Created environment

        Raises:
            ValueError: If environment name already exists in project
        """
        # Check for duplicate name
        existing = self.session.exec(
            select(ProjectEnvironment).where(
                ProjectEnvironment.project_id == project_id,
                ProjectEnvironment.name == data.name,
            )
        ).first()

        if existing:
            raise ValueError(f"Environment '{data.name}' already exists")

        environment = ProjectEnvironment(
            project_id=project_id,
            name=data.name,
            domain=data.domain,
            variables=data.variables or {},
            headers=data.headers or {},
            is_preupload=data.is_preupload,
        )

        self.session.add(environment)
        self.session.commit()
        self.session.refresh(environment)

        return environment

    def get(self, environment_id: int) -> ProjectEnvironment | None:
        """Get environment by ID.

        Args:
            environment_id: Environment ID

        Returns:
            Environment or None
        """
        return self.session.get(ProjectEnvironment, environment_id)

    def list_by_project(self, project_id: int) -> list[ProjectEnvironment]:
        """List all environments for a project.

        Args:
            project_id: Project ID

        Returns:
            List of environments
        """
        statement = select(ProjectEnvironment).where(
            ProjectEnvironment.project_id == project_id
        )
        return list(self.session.exec(statement).all())

    def update(
        self, environment_id: int, data: EnvironmentUpdate
    ) -> ProjectEnvironment | None:
        """Update environment.

        Args:
            environment_id: Environment ID
            data: Update data

        Returns:
            Updated environment or None

        Raises:
            ValueError: If new name conflicts with existing environment
        """
        environment = self.get(environment_id)
        if not environment:
            return None

        # Check for name conflict
        if data.name and data.name != environment.name:
            existing = self.session.exec(
                select(ProjectEnvironment).where(
                    ProjectEnvironment.project_id == environment.project_id,
                    ProjectEnvironment.name == data.name,
                )
            ).first()

            if existing:
                raise ValueError(f"Environment '{data.name}' already exists")

        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(environment, field, value)

        self.session.commit()
        self.session.refresh(environment)

        return environment

    def delete(self, environment_id: int) -> bool:
        """Delete environment.

        Args:
            environment_id: Environment ID

        Returns:
            True if deleted, False if not found
        """
        environment = self.get(environment_id)
        if not environment:
            return False

        self.session.delete(environment)
        self.session.commit()

        return True

    def copy(
        self, environment_id: int, data: EnvironmentCopyRequest
    ) -> ProjectEnvironment:
        """Copy environment.

        Args:
            environment_id: Source environment ID
            data: Copy request with new name

        Returns:
            New environment

        Raises:
            ValueError: If source environment not found or name conflicts
        """
        source = self.get(environment_id)
        if not source:
            raise ValueError(f"Environment {environment_id} not found")

        # Check for name conflict
        existing = self.session.exec(
            select(ProjectEnvironment).where(
                ProjectEnvironment.project_id == source.project_id,
                ProjectEnvironment.name == data.name,
            )
        ).first()

        if existing:
            raise ValueError(f"Environment '{data.name}' already exists")

        # Create copy
        new_env = ProjectEnvironment(
            project_id=source.project_id,
            name=data.name,
            domain=source.domain,
            variables=source.variables.copy() if source.variables else {},
            headers=source.headers.copy() if source.headers else {},
            is_preupload=source.is_preupload,
        )

        self.session.add(new_env)
        self.session.commit()
        self.session.refresh(new_env)

        return new_env

    def replace_variables(
        self,
        environment_id: int,
        text: str,
        additional_vars: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Replace variables in text using environment variables.

        Args:
            environment_id: Environment ID
            text: Template text
            additional_vars: Additional variables (higher priority)

        Returns:
            Dictionary with original, replaced, and used variables
        """
        environment = self.get(environment_id)
        if not environment:
            raise ValueError(f"Environment {environment_id} not found")

        replacer = VariableReplacer()
        replaced, used_vars = replacer.replace(
            text=text,
            environment_vars=environment.variables,
            additional_vars=additional_vars,
        )

        return {
            "original": text,
            "replaced": replaced,
            "variables_used": used_vars,
        }
