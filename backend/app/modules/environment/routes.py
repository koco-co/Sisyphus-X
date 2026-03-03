"""Environment management routes.

This module provides REST API endpoints for managing environments and their variables.
All endpoints use the unified response format from app.core.response.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.db import get_session
from app.core.response import PagedData, success
from app.models.user import User
from app.modules.environment import schemas, service

router = APIRouter(prefix="/projects/{project_id}/environments", tags=["环境管理"])


# ============================================================================
# Environment Management Endpoints
# ============================================================================


@router.get("", response_model=schemas.EnvironmentListResponse)
async def list_environments(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all environments for a project.

    Returns a list of environments with their variables, sorted by:
    1. Default environment first
    2. Creation date descending
    """
    env_service = service.EnvironmentService(session)
    environments = await env_service.list_by_project(project_id)

    # Convert to response format
    items = [
        schemas.EnvironmentResponse.model_validate(env)
        for env in environments
    ]

    return success(
        data=PagedData(
            items=items,
            total=len(items),
            page=1,
            page_size=len(items),
            total_pages=1,
        )
    )


@router.post("", response_model=schemas.EnvironmentResponse)
async def create_environment(
    project_id: str,
    data: schemas.EnvironmentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new environment with optional variables.

    If is_default is True, other environments in the project will have
    their default flag unset.
    """
    env_service = service.EnvironmentService(session)
    environment = await env_service.create(project_id, data)
    return success(
        data=schemas.EnvironmentResponse.model_validate(environment),
        message="Environment created successfully",
    )


@router.get("/{environment_id}", response_model=schemas.EnvironmentResponse)
async def get_environment(
    project_id: str,
    environment_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get environment details including all variables."""
    env_service = service.EnvironmentService(session)
    environment = await env_service.get(environment_id, with_variables=True)
    return success(data=schemas.EnvironmentResponse.model_validate(environment))


@router.put("/{environment_id}", response_model=schemas.EnvironmentResponse)
async def update_environment(
    project_id: str,
    environment_id: str,
    data: schemas.EnvironmentUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an environment.

    Only provided fields will be updated. If is_default is set to True,
    other environments in the project will have their default flag unset.
    """
    env_service = service.EnvironmentService(session)
    environment = await env_service.update(environment_id, data)
    return success(
        data=schemas.EnvironmentResponse.model_validate(environment),
        message="Environment updated successfully",
    )


@router.delete("/{environment_id}")
async def delete_environment(
    project_id: str,
    environment_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete an environment and all its variables."""
    env_service = service.EnvironmentService(session)
    await env_service.delete(environment_id)
    return success(message="Environment deleted successfully")


@router.post(
    "/{environment_id}/set-default", response_model=schemas.EnvironmentResponse
)
async def set_default_environment(
    project_id: str,
    environment_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Set an environment as the default for its project.

    This will unset the default flag on all other environments in the project.
    """
    env_service = service.EnvironmentService(session)
    environment = await env_service.set_default(environment_id)
    return success(
        data=schemas.EnvironmentResponse.model_validate(environment),
        message="Default environment set successfully",
    )


# ============================================================================
# Environment Variable Management Endpoints
# ============================================================================


@router.post(
    "/{environment_id}/variables",
    response_model=schemas.EnvironmentVariableResponse,
)
async def add_environment_variable(
    project_id: str,
    environment_id: str,
    data: schemas.EnvironmentVariableCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add a variable to an environment.

    The variable key must be unique within the environment.
    """
    env_service = service.EnvironmentService(session)
    variable = await env_service.add_variable(environment_id, data)
    return success(
        data=schemas.EnvironmentVariableResponse.model_validate(variable),
        message="Variable added successfully",
    )


@router.put(
    "/variables/{variable_id}",
    response_model=schemas.EnvironmentVariableResponse,
)
async def update_environment_variable(
    project_id: str,
    variable_id: str,
    data: schemas.EnvironmentVariableUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an environment variable.

    Only provided fields will be updated. If the key is changed, it must
    not conflict with an existing variable in the same environment.
    """
    env_service = service.EnvironmentService(session)
    variable = await env_service.update_variable(variable_id, data)
    return success(
        data=schemas.EnvironmentVariableResponse.model_validate(variable),
        message="Variable updated successfully",
    )


@router.delete("/variables/{variable_id}")
async def delete_environment_variable(
    project_id: str,
    variable_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete an environment variable."""
    env_service = service.EnvironmentService(session)
    await env_service.delete_variable(variable_id)
    return success(message="Variable deleted successfully")
