"""Environment management API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, func, select

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.project import ProjectEnvironment
from app.schemas.environment import (
    EnvironmentCopyRequest,
    EnvironmentCreate,
    EnvironmentResponse,
    EnvironmentUpdate,
    VariableReplaceRequest,
    VariableReplaceResponse,
)
from app.services.environment_service import EnvironmentService

router = APIRouter()


@router.get("/", response_model=list[EnvironmentResponse])
async def list_environments(
    project_id: int = Path(..., description="Project ID"),
    session: AsyncSession = Depends(get_session),
) -> list[ProjectEnvironment]:
    """List all environments for a project.

    Args:
        project_id: Project ID
        session: Database session

    Returns:
        List of environments
    """
    statement = select(ProjectEnvironment).where(
        col(ProjectEnvironment.project_id) == project_id
    )
    result = await session.execute(statement)
    return list(result.scalars().all())


@router.post("/", response_model=EnvironmentResponse)
async def create_environment(
    project_id: int = Path(..., description="Project ID"),
    data: EnvironmentCreate | None = None,
    session: AsyncSession = Depends(get_session),
) -> ProjectEnvironment:
    """Create a new environment.

    Args:
        project_id: Project ID
        data: Environment creation data
        session: Database session

    Returns:
        Created environment

    Raises:
        HTTPException: If environment name already exists
    """
    # Use sync session for service
    from app.core.db import sync_session_maker

    with sync_session_maker() as sync_session:
        service = EnvironmentService(sync_session)
        try:
            return service.create(project_id, data)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))


@router.get("/{environment_id}", response_model=EnvironmentResponse)
async def get_environment(
    environment_id: int,
    session: AsyncSession = Depends(get_session),
) -> ProjectEnvironment:
    """Get environment by ID.

    Args:
        environment_id: Environment ID
        session: Database session

    Returns:
        Environment

    Raises:
        HTTPException: If environment not found
    """
    environment = await session.get(ProjectEnvironment, environment_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")
    return environment


@router.put("/{environment_id}", response_model=EnvironmentResponse)
async def update_environment(
    environment_id: int,
    data: EnvironmentUpdate,
    session: AsyncSession = Depends(get_session),
) -> ProjectEnvironment:
    """Update environment.

    Args:
        environment_id: Environment ID
        data: Update data
        session: Database session

    Returns:
        Updated environment

    Raises:
        HTTPException: If environment not found or name conflicts
    """
    from app.core.db import sync_session_maker

    with sync_session_maker() as sync_session:
        service = EnvironmentService(sync_session)
        try:
            result = service.update(environment_id, data)
            if not result:
                raise HTTPException(status_code=404, detail="Environment not found")
            return result
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{environment_id}")
async def delete_environment(
    environment_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, int]:
    """Delete environment.

    Args:
        environment_id: Environment ID
        session: Database session

    Returns:
        Deletion confirmation

    Raises:
        HTTPException: If environment not found
    """
    from app.core.db import sync_session_maker

    with sync_session_maker() as sync_session:
        service = EnvironmentService(sync_session)
        success = service.delete(environment_id)
        if not success:
            raise HTTPException(status_code=404, detail="Environment not found")
        return {"deleted": environment_id}


@router.post("/{environment_id}/copy", response_model=EnvironmentResponse)
async def copy_environment(
    environment_id: int,
    data: EnvironmentCopyRequest,
    session: AsyncSession = Depends(get_session),
) -> ProjectEnvironment:
    """Copy environment.

    Args:
        environment_id: Source environment ID
        data: Copy request with new name
        session: Database session

    Returns:
        New environment

    Raises:
        HTTPException: If source not found or name conflicts
    """
    from app.core.db import sync_session_maker

    with sync_session_maker() as sync_session:
        service = EnvironmentService(sync_session)
        try:
            return service.copy(environment_id, data)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))


@router.post("/{environment_id}/replace", response_model=VariableReplaceResponse)
async def replace_variables(
    environment_id: int,
    data: VariableReplaceRequest,
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    """Replace variables in text using environment variables.

    Args:
        environment_id: Environment ID
        data: Replacement request
        session: Database session

    Returns:
        Replacement result with original, replaced, and used variables

    Raises:
        HTTPException: If environment not found
    """
    from app.core.db import sync_session_maker

    with sync_session_maker() as sync_session:
        service = EnvironmentService(sync_session)
        try:
            return service.replace_variables(
                environment_id, data.text, data.additional_vars
            )
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
