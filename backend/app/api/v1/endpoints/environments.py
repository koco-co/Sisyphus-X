"""Environment management API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

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


@router.get("", response_model=list[EnvironmentResponse])
@router.get("/", response_model=list[EnvironmentResponse])
async def list_environments(
    project_id: str,
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


@router.post("", response_model=EnvironmentResponse)
@router.post("/", response_model=EnvironmentResponse)
async def create_environment(
    project_id: str,
    data: EnvironmentCreate,
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
    # Check for duplicate name
    from sqlmodel import select

    statement = select(ProjectEnvironment).where(
        ProjectEnvironment.project_id == project_id,
        ProjectEnvironment.name == data.name
    )
    result = await session.execute(statement)
    existing = result.first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Environment '{data.name}' already exists"
        )

    # Create new environment
    import uuid
    from datetime import datetime

    environment = ProjectEnvironment(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name=data.name,
        domain=data.domain or "",
        variables=data.variables or {},
        headers=data.headers or {},
        is_preupload=data.is_preupload if hasattr(data, 'is_preupload') else False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    session.add(environment)
    await session.commit()
    await session.refresh(environment)

    return environment


@router.get("/{environment_id}", response_model=EnvironmentResponse)
@router.get("/{environment_id}/", response_model=EnvironmentResponse)
async def get_environment(
    environment_id: str,
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
@router.put("/{environment_id}/", response_model=EnvironmentResponse)
async def update_environment(
    environment_id: str,
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
    from datetime import datetime

    from sqlmodel import select

    # Get environment
    environment = await session.get(ProjectEnvironment, environment_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")

    # Check for name conflict (if name is being updated)
    if data.name and data.name != environment.name:
        statement = select(ProjectEnvironment).where(
            ProjectEnvironment.project_id == environment.project_id,
            ProjectEnvironment.name == data.name
        )
        result = await session.execute(statement)
        existing = result.first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Environment '{data.name}' already exists"
            )

    # Update fields
    if data.name:
        environment.name = data.name
    if hasattr(data, 'domain') and data.domain is not None:
        environment.domain = data.domain
    if hasattr(data, 'variables') and data.variables is not None:
        environment.variables = data.variables
    if hasattr(data, 'headers') and data.headers is not None:
        environment.headers = data.headers
    if hasattr(data, 'is_preupload') and data.is_preupload is not None:
        environment.is_preupload = data.is_preupload

    environment.updated_at = datetime.utcnow()

    await session.commit()
    await session.refresh(environment)

    return environment


@router.delete("/{environment_id}")
@router.delete("/{environment_id}/")
async def delete_environment(
    environment_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Delete environment.

    Args:
        environment_id: Environment ID
        session: Database session

    Returns:
        Deletion confirmation

    Raises:
        HTTPException: If environment not found
    """
    environment = await session.get(ProjectEnvironment, environment_id)
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found")

    await session.delete(environment)
    await session.commit()

    return {"deleted": environment_id}


@router.post("/{environment_id}/copy", response_model=EnvironmentResponse)
@router.post("/{environment_id}/copy/", response_model=EnvironmentResponse)
async def copy_environment(
    environment_id: str,
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
    import uuid
    from datetime import datetime

    from sqlmodel import select

    # Get source environment
    source = await session.get(ProjectEnvironment, environment_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source environment not found")

    # Check for name conflict
    statement = select(ProjectEnvironment).where(
        ProjectEnvironment.project_id == source.project_id,
        ProjectEnvironment.name == data.name
    )
    result = await session.execute(statement)
    existing = result.first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Environment '{data.name}' already exists"
        )

    # Create copy
    new_env = ProjectEnvironment(
        id=str(uuid.uuid4()),
        project_id=source.project_id,
        name=data.name,
        domain=source.domain,
        variables=source.variables.copy() if source.variables else {},
        headers=source.headers.copy() if source.headers else {},
        is_preupload=source.is_preupload,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    session.add(new_env)
    await session.commit()
    await session.refresh(new_env)

    return new_env


@router.post("/{environment_id}/clone", response_model=EnvironmentResponse)
@router.post("/{environment_id}/clone/", response_model=EnvironmentResponse)
async def clone_environment(
    environment_id: str,
    data: dict[str, str] | None = None,
    session: AsyncSession = Depends(get_session),
) -> ProjectEnvironment:
    """Clone environment (alias for copy with simpler API).

    Args:
        environment_id: Source environment ID
        data: Dictionary with 'name' key for the new environment
        session: Database session

    Returns:
        New environment

    Raises:
        HTTPException: If source not found or name conflicts
    """
    import uuid
    from datetime import datetime

    from sqlmodel import select

    # Get source environment
    source = await session.get(ProjectEnvironment, environment_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source environment not found")

    # Get new name
    new_name = data.get('name') if data else f"{source.name} (copy)"

    # Check for name conflict
    statement = select(ProjectEnvironment).where(
        ProjectEnvironment.project_id == source.project_id,
        ProjectEnvironment.name == new_name
    )
    result = await session.execute(statement)
    existing = result.first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Environment '{new_name}' already exists"
        )

    # Create clone
    new_env = ProjectEnvironment(
        id=str(uuid.uuid4()),
        project_id=source.project_id,
        name=new_name,
        domain=source.domain,
        variables=source.variables.copy() if source.variables else {},
        headers=source.headers.copy() if source.headers else {},
        is_preupload=source.is_preupload,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    session.add(new_env)
    await session.commit()
    await session.refresh(new_env)

    return new_env


@router.post("/{environment_id}/replace", response_model=VariableReplaceResponse)
@router.post("/{environment_id}/replace/", response_model=VariableReplaceResponse)
async def replace_variables(
    environment_id: str,
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
    service = EnvironmentService(session)
    try:
        return await service.replace_variables(
            environment_id, data.text, data.additional_vars
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
