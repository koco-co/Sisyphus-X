"""Interface request history API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, func, select

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.interface_history import InterfaceHistory
from app.models.user import User
from app.schemas.interface_history import InterfaceHistoryListResponse

router = APIRouter()


@router.get("/{interface_id}/history", response_model=InterfaceHistoryListResponse)
async def get_interface_history(
    interface_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> InterfaceHistoryListResponse:
    """Get request history for an interface.

    Args:
        interface_id: Interface ID
        page: Page number (default: 1)
        size: Page size (default: 20, max: 100)
        current_user: Current authenticated user
        session: Database session

    Returns:
        Paginated history list
    """
    skip = (page - 1) * size

    # Build query
    statement = (
        select(InterfaceHistory)
        .where(col(InterfaceHistory.interface_id) == interface_id)
        .order_by(col(InterfaceHistory.created_at).desc())
    )

    count_statement = select(func.count()).select_from(InterfaceHistory).where(
        col(InterfaceHistory.interface_id) == interface_id
    )

    # Get total count
    total_result = await session.execute(count_statement)
    total = int(total_result.scalar_one() or 0)

    # Get paginated results
    result = await session.execute(statement.offset(skip).limit(size))
    items = list(result.scalars().all())

    pages = (total + size - 1) // size

    return InterfaceHistoryListResponse(
        items=items, total=total, page=page, size=size, pages=pages
    )


@router.delete("/history/{history_id}")
async def delete_history_item(
    history_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, int]:
    """Delete a history item.

    Args:
        history_id: History item ID
        current_user: Current authenticated user
        session: Database session

    Returns:
        Deletion confirmation

    Raises:
        HTTPException: If history item not found
    """
    history = await session.get(InterfaceHistory, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="History item not found")

    await session.delete(history)
    await session.commit()

    return {"deleted": history_id}


@router.delete("/{interface_id}/history")
async def clear_interface_history(
    interface_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, int]:
    """Clear all history for an interface.

    Args:
        interface_id: Interface ID
        current_user: Current authenticated user
        session: Database session

    Returns:
        Deletion confirmation with count
    """
    # Get all history items for this interface
    statement = select(InterfaceHistory).where(
        col(InterfaceHistory.interface_id) == interface_id
    )
    result = await session.execute(statement)
    items = result.scalars().all()

    # Delete all items
    for item in items:
        await session.delete(item)

    await session.commit()

    return {"deleted_count": len(items)}
