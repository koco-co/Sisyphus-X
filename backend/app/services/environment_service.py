"""Environment management service."""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.project import ProjectEnvironment
from app.schemas.environment import (
    EnvironmentCopyRequest,
    EnvironmentCreate,
    EnvironmentUpdate,
)
from app.services.variable_replacer import VariableReplacer


class EnvironmentService:
    """Service for managing project environments."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize the service.

        Args:
            session: Async database session
        """
        self.session = session

    async def create(self, project_id: str, data: EnvironmentCreate) -> ProjectEnvironment:
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
        statement = select(ProjectEnvironment).where(
            ProjectEnvironment.project_id == project_id,
            ProjectEnvironment.name == data.name,
        )
        result = await self.session.execute(statement)
        existing = result.first()

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
        await self.session.commit()
        await self.session.refresh(environment)

        return environment

    async def get(self, environment_id: str) -> ProjectEnvironment | None:
        """Get environment by ID.

        Args:
            environment_id: Environment ID

        Returns:
            Environment or None
        """
        return await self.session.get(ProjectEnvironment, environment_id)

    async def list_by_project(self, project_id: str) -> list[ProjectEnvironment]:
        """List all environments for a project.

        Args:
            project_id: Project ID

        Returns:
            List of environments
        """
        statement = select(ProjectEnvironment).where(
            ProjectEnvironment.project_id == project_id
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def update(
        self, environment_id: str, data: EnvironmentUpdate
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
        environment = await self.get(environment_id)
        if not environment:
            return None

        # Check for name conflict
        if data.name and data.name != environment.name:
            statement = select(ProjectEnvironment).where(
                ProjectEnvironment.project_id == environment.project_id,
                ProjectEnvironment.name == data.name,
            )
            result = await self.session.execute(statement)
            existing = result.first()

            if existing:
                raise ValueError(f"Environment '{data.name}' already exists")

        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(environment, field, value)

        await self.session.commit()
        await self.session.refresh(environment)

        return environment

    async def delete(self, environment_id: str) -> bool:
        """Delete environment.

        Args:
            environment_id: Environment ID

        Returns:
            True if deleted, False if not found
        """
        environment = await self.get(environment_id)
        if not environment:
            return False

        await self.session.delete(environment)
        await self.session.commit()

        return True

    async def copy(
        self, environment_id: str, data: EnvironmentCopyRequest
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
        source = await self.get(environment_id)
        if not source:
            raise ValueError(f"Environment {environment_id} not found")

        # Check for name conflict
        statement = select(ProjectEnvironment).where(
            ProjectEnvironment.project_id == source.project_id,
            ProjectEnvironment.name == data.name,
        )
        result = await self.session.execute(statement)
        existing = result.first()

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
        await self.session.commit()
        await self.session.refresh(new_env)

        return new_env

    async def replace_variables(
        self,
        environment_id: str,
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
        environment = await self.get(environment_id)
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
