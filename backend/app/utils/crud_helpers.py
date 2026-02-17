"""
CRUD 工具函数 - 消除重复的数据库操作代码

提供通用的 CRUD 操作辅助函数，减少代码重复，提高一致性。
"""

from collections.abc import Sequence
from datetime import datetime, timezone
from typing import Any, Generic, Optional, TypeVar, cast

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import SQLModel, select

from app.schemas.pagination import PageResponse

# 泛型类型变量
ModelType = TypeVar("ModelType", bound=SQLModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=SQLModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=SQLModel)


async def get_or_404(
    session: AsyncSession,
    model: type[ModelType],
    item_id: int,
    resource_name: Optional[str] = None,
) -> ModelType:
    """
    获取对象或抛出 404 错误

    Args:
        session: 数据库会话
        model: SQLModel 类
        item_id: 对象 ID
        resource_name: 资源名称（用于错误消息），默认为模型名

    Returns:
        找到的对象

    Raises:
        HTTPException: 对象不存在时抛出 404
    """
    item = await session.get(model, item_id)
    if not item:
        name = resource_name or model.__name__
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{name} not found"
        )
    return item


async def create_item(
    session: AsyncSession,
    item: ModelType,
    auto_refresh: bool = True,
) -> ModelType:
    """
    创建并提交新对象

    Args:
        session: 数据库会话
        item: 要创建的对象实例
        auto_refresh: 是否自动刷新对象以获取数据库生成的值

    Returns:
        创建后的对象（包含数据库生成的 ID 和时间戳）
    """
    session.add(item)
    await session.commit()
    if auto_refresh:
        await session.refresh(item)
    return item


async def update_item(
    session: AsyncSession,
    item: ModelType,
    update_data: dict[str, Any],
    exclude_fields: Sequence[str] | None = None,
    auto_commit: bool = True,
) -> ModelType:
    """
    更新对象字段

    Args:
        session: 数据库会话
        item: 要更新的对象实例
        update_data: 更新数据字典
        exclude_fields: 要排除的字段列表（不更新的字段）
        auto_commit: 是否自动提交

    Returns:
        更新后的对象
    """
    exclude = list(exclude_fields or [])
    exclude.extend(["id", "created_at"])

    for key, value in update_data.items():
        if key not in exclude and hasattr(item, key):
            setattr(item, key, value)

    # 如果有 updated_at 字段，自动更新
    if hasattr(item, "updated_at"):
        item.updated_at = datetime.now(timezone.utc)

    if auto_commit:
        session.add(item)
        await session.commit()
        await session.refresh(item)

    return item


async def delete_item(
    session: AsyncSession,
    item: SQLModel,
) -> None:
    """
    删除对象并提交

    Args:
        session: 数据库会话
        item: 要删除的对象实例
    """
    await session.delete(item)
    await session.commit()


async def delete_by_id(
    session: AsyncSession,
    model: type[ModelType],
    item_id: int,
) -> None:
    """
    通过 ID 删除对象

    Args:
        session: 数据库会话
        model: SQLModel 类
        item_id: 对象 ID

    Raises:
        HTTPException: 对象不存在时抛出 404
    """
    item = await get_or_404(session, model, item_id)
    await delete_item(session, item)


async def paginate_query(
    session: AsyncSession,
    statement,
    page: int,
    size: int,
) -> tuple[list[Any], int]:
    """
    执行分页查询

    Args:
        session: 数据库会话
        statement: 查询语句
        page: 页码（从 1 开始）
        size: 每页大小

    Returns:
        (结果列表, 总数)

    Example:
        items, total = await paginate_query(
            session,
            select(Project).where(Project.owner == "user"),
            page=1,
            size=10
        )
        pages = (total + size - 1) // size
    """
    from sqlmodel import func

    # 计算总数
    count_statement = select(func.count()).select_from(statement.subquery())
    total_result = await session.execute(count_statement)
    total = total_result.scalar() or 0

    # 执行分页查询
    skip = (page - 1) * size
    result = await session.execute(statement.offset(skip).limit(size))
    items = result.scalars().all()

    return list(items), total


async def paginated_response(
    session: AsyncSession,
    statement,
    page: int,
    size: int,
) -> PageResponse:
    """
    执行分页查询并返回分页响应对象

    Args:
        session: 数据库会话
        statement: 查询语句
        page: 页码（从 1 开始）
        size: 每页大小

    Returns:
        PageResponse 对象

    Example:
        return await paginated_response(
            session,
            select(Project).where(Project.owner == "user"),
            page=1,
            size=10
        )
    """
    items, total = await paginate_query(session, statement, page, size)
    pages = (total + size - 1) // size

    return PageResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


async def list_items(
    session: AsyncSession,
    model: type[ModelType],
    page: int = 1,
    size: int = 10,
    filters: dict[str, Any] | None = None,
    order_by: Optional[Any] = None,
    load_relations: Sequence[str] | None = None,
) -> PageResponse[ModelType]:
    """
    通用列表查询（带分页）

    Args:
        session: 数据库会话
        model: SQLModel 类
        page: 页码
        size: 每页大小
        filters: 过滤条件字典，如 {"project_id": 1}
        order_by: 排序字段，如 Project.created_at.desc()
        load_relations: 要预加载的关联字段列表

    Returns:
        PageResponse 对象

    Example:
        return await list_items(
            session,
            Project,
            page=1,
            size=10,
            filters={"owner": "user"},
            order_by=Project.created_at.desc(),
            load_relations=["environments"]
        )
    """
    statement = select(model)

    # 应用过滤条件
    if filters:
        for key, value in filters.items():
            if hasattr(model, key) and value is not None:
                statement = statement.where(getattr(model, key) == value)

    # 预加载关联数据
    if load_relations:
        for relation in load_relations:
            if hasattr(model, relation):
                statement = statement.options(selectinload(getattr(model, relation)))

    # 应用排序
    if order_by:
        statement = statement.order_by(order_by)

    return await paginated_response(session, statement, page, size)


class CRUDService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    通用 CRUD 服务基类

    提供标准的 CRUD 操作，可以被具体服务类继承使用。

    Example:
        class ProjectService(CRUDService[Project, ProjectCreate, ProjectUpdate]):
            def __init__(self):
                super().__init__(Project)
        """

    def __init__(self, model: type[ModelType]):
        self.model = model

    async def get(
        self,
        session: AsyncSession,
        item_id: int,
    ) -> ModelType:
        """获取单个对象"""
        return await get_or_404(session, self.model, item_id)

    async def create(
        self,
        session: AsyncSession,
        data: CreateSchemaType,
        **kwargs: Any,
    ) -> ModelType:
        """
        创建新对象

        Args:
            session: 数据库会话
            data: 创建数据
            **kwargs: 额外的字段值

        Returns:
            创建的对象
        """
        item_data = data.model_dump() if hasattr(data, "model_dump") else data
        item_payload = cast(dict[str, Any], item_data)
        item = self.model(**item_payload, **kwargs)
        return await create_item(session, item)

    async def update(
        self,
        session: AsyncSession,
        item_id: int,
        data: UpdateSchemaType,
    ) -> ModelType:
        """
        更新对象

        Args:
            session: 数据库会话
            item_id: 对象 ID
            data: 更新数据

        Returns:
            更新后的对象
        """
        item = await self.get(session, item_id)
        update_data = (
            data.model_dump(exclude_unset=True)
            if hasattr(data, "model_dump")
            else data
        )
        update_payload = cast(dict[str, Any], update_data)
        return await update_item(session, item, update_payload)

    async def delete(
        self,
        session: AsyncSession,
        item_id: int,
    ) -> None:
        """删除对象"""
        await delete_by_id(session, self.model, item_id)

    async def list(
        self,
        session: AsyncSession,
        page: int = 1,
        size: int = 10,
        filters: dict[str, Any] | None = None,
        order_by: Optional[Any] = None,
    ) -> PageResponse[ModelType]:
        """列表查询（带分页）"""
        return await list_items(session, self.model, page, size, filters, order_by)
