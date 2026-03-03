"""Environment management service layer."""

from typing import List
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models_new.environment import Environment, EnvironmentVariable
from app.modules.environment.schemas import (
    EnvironmentCreate,
    EnvironmentUpdate,
    EnvironmentVariableCreate,
    EnvironmentVariableUpdate,
)
from app.utils.exceptions import ConflictError, NotFoundError


class EnvironmentService:
    """Environment management service."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ========================================================================
    # Environment Management
    # ========================================================================

    async def list_by_project(self, project_id: str | UUID) -> List[Environment]:
        """
        List all environments for a project.

        Args:
            project_id: Project UUID

        Returns:
            List of environments with variables loaded
        """
        query = (
            select(Environment)
            .where(Environment.project_id == str(project_id))
            .options(selectinload(Environment.variables))
            .order_by(Environment.is_default.desc(), Environment.created_at.desc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get(
        self, environment_id: str | UUID, with_variables: bool = True
    ) -> Environment:
        """
        Get an environment by ID.

        Args:
            environment_id: Environment UUID
            with_variables: Whether to load variables relationship

        Returns:
            Environment instance

        Raises:
            NotFoundError: If environment not found
        """
        query = select(Environment).where(Environment.id == str(environment_id))

        if with_variables:
            query = query.options(selectinload(Environment.variables))

        result = await self.session.execute(query)
        environment = result.scalar_one_or_none()

        if not environment:
            raise NotFoundError("Environment", environment_id)

        return environment

    async def create(
        self, project_id: str | UUID, data: EnvironmentCreate
    ) -> Environment:
        """
        Create a new environment with optional variables.

        Args:
            project_id: Project UUID
            data: Environment creation data

        Returns:
            Created environment with variables
        """
        project_id_str = str(project_id)

        # If setting as default, unset other defaults first
        if data.is_default:
            await self._unset_default(project_id_str)

        # Create environment
        environment = Environment(
            project_id=project_id_str,
            name=data.name,
            base_url=data.base_url,
            is_default=data.is_default,
        )
        self.session.add(environment)
        await self.session.flush()  # Get the ID

        # Create variables if provided
        if data.variables:
            for var_data in data.variables:
                variable = EnvironmentVariable(
                    environment_id=environment.id,
                    key=var_data.key,
                    value=var_data.value,
                    description=var_data.description,
                )
                self.session.add(variable)

        await self.session.commit()
        return await self.get(environment.id)

    async def update(
        self, environment_id: str | UUID, data: EnvironmentUpdate
    ) -> Environment:
        """
        Update an environment.

        Args:
            environment_id: Environment UUID
            data: Environment update data

        Returns:
            Updated environment

        Raises:
            NotFoundError: If environment not found
        """
        environment = await self.get(environment_id, with_variables=False)

        # If setting as default, unset other defaults first
        if data.is_default:
            await self._unset_default(environment.project_id)

        # Update fields
        if data.name is not None:
            environment.name = data.name
        if data.base_url is not None:
            environment.base_url = data.base_url
        if data.is_default is not None:
            environment.is_default = data.is_default

        await self.session.commit()
        return await self.get(environment_id)

    async def delete(self, environment_id: str | UUID) -> None:
        """
        Delete an environment.

        Args:
            environment_id: Environment UUID

        Raises:
            NotFoundError: If environment not found
        """
        environment = await self.get(environment_id, with_variables=False)
        await self.session.delete(environment)
        await self.session.commit()

    async def set_default(self, environment_id: str | UUID) -> Environment:
        """
        Set an environment as the default for its project.

        Args:
            environment_id: Environment UUID

        Returns:
            Updated environment

        Raises:
            NotFoundError: If environment not found
        """
        environment = await self.get(environment_id, with_variables=False)

        # Unset other defaults
        await self._unset_default(environment.project_id)

        # Set this one as default
        environment.is_default = True
        await self.session.commit()

        return await self.get(environment_id)

    async def _unset_default(self, project_id: str | UUID) -> None:
        """
        Unset default flag for all environments in a project.

        This is an internal method used when setting a new default environment.

        Args:
            project_id: Project UUID
        """
        await self.session.execute(
            update(Environment)
            .where(Environment.project_id == str(project_id))
            .values(is_default=False)
        )

    # ========================================================================
    # Environment Variable Management
    # ========================================================================

    async def add_variable(
        self, environment_id: str | UUID, data: EnvironmentVariableCreate
    ) -> EnvironmentVariable:
        """
        Add a variable to an environment.

        Args:
            environment_id: Environment UUID
            data: Variable creation data

        Returns:
            Created variable

        Raises:
            NotFoundError: If environment not found
            ConflictError: If variable key already exists
        """
        # Verify environment exists
        environment = await self.get(environment_id, with_variables=False)

        # Check for duplicate key
        existing = await self.session.execute(
            select(EnvironmentVariable).where(
                EnvironmentVariable.environment_id == str(environment_id),
                EnvironmentVariable.key == data.key,
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictError(
                f"Variable with key '{data.key}' already exists in this environment",
                conflict_field="key",
                conflict_value=data.key,
            )

        # Create variable
        variable = EnvironmentVariable(
            environment_id=str(environment_id),
            key=data.key,
            value=data.value,
            description=data.description,
        )
        self.session.add(variable)
        await self.session.commit()
        await self.session.refresh(variable)

        return variable

    async def update_variable(
        self, variable_id: str | UUID, data: EnvironmentVariableUpdate
    ) -> EnvironmentVariable:
        """
        Update an environment variable.

        Args:
            variable_id: Variable UUID
            data: Variable update data

        Returns:
            Updated variable

        Raises:
            NotFoundError: If variable not found
            ConflictError: If new key conflicts with existing variable
        """
        # Get variable
        result = await self.session.execute(
            select(EnvironmentVariable).where(
                EnvironmentVariable.id == str(variable_id)
            )
        )
        variable = result.scalar_one_or_none()

        if not variable:
            raise NotFoundError("EnvironmentVariable", variable_id)

        # If updating key, check for duplicates
        if data.key is not None and data.key != variable.key:
            existing = await self.session.execute(
                select(EnvironmentVariable).where(
                    EnvironmentVariable.environment_id == variable.environment_id,
                    EnvironmentVariable.key == data.key,
                    EnvironmentVariable.id != str(variable_id),
                )
            )
            if existing.scalar_one_or_none():
                raise ConflictError(
                    f"Variable with key '{data.key}' already exists in this environment",
                    conflict_field="key",
                    conflict_value=data.key,
                )

        # Update fields
        if data.key is not None:
            variable.key = data.key
        if data.value is not None:
            variable.value = data.value
        if data.description is not None:
            variable.description = data.description

        await self.session.commit()
        await self.session.refresh(variable)

        return variable

    async def delete_variable(self, variable_id: str | UUID) -> None:
        """
        Delete an environment variable.

        Args:
            variable_id: Variable UUID

        Raises:
            NotFoundError: If variable not found
        """
        # Get variable
        result = await self.session.execute(
            select(EnvironmentVariable).where(
                EnvironmentVariable.id == str(variable_id)
            )
        )
        variable = result.scalar_one_or_none()

        if not variable:
            raise NotFoundError("EnvironmentVariable", variable_id)

        await self.session.delete(variable)
        await self.session.commit()

    async def get_variable(self, variable_id: str | UUID) -> EnvironmentVariable:
        """
        Get a single variable by ID.

        Args:
            variable_id: Variable UUID

        Returns:
            Variable instance

        Raises:
            NotFoundError: If variable not found
        """
        result = await self.session.execute(
            select(EnvironmentVariable).where(
                EnvironmentVariable.id == str(variable_id)
            )
        )
        variable = result.scalar_one_or_none()

        if not variable:
            raise NotFoundError("EnvironmentVariable", variable_id)

        return variable

    async def list_variables(
        self, environment_id: str | UUID
    ) -> List[EnvironmentVariable]:
        """
        List all variables for an environment.

        Args:
            environment_id: Environment UUID

        Returns:
            List of variables

        Raises:
            NotFoundError: If environment not found
        """
        # Verify environment exists
        await self.get(environment_id, with_variables=False)

        result = await self.session.execute(
            select(EnvironmentVariable)
            .where(EnvironmentVariable.environment_id == str(environment_id))
            .order_by(EnvironmentVariable.key)
        )
        return list(result.scalars().all())
