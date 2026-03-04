"""关键字服务层 - 业务逻辑

提供关键字的增删改查功能。
"""

from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models_new.keyword import Keyword
from app.modules.keyword.schemas import (
    KEYWORD_TYPES,
    KeywordCreate,
    KeywordTypeResponse,
    KeywordUpdate,
)

logger = logging.getLogger(__name__)


# 关键字类型名称映射
KEYWORD_TYPE_NAMES = {
    "request": "发送请求",
    "assertion": "断言",
    "extract": "提取变量",
    "sql": "数据库操作",
    "wait": "等待",
    "custom": "自定义操作",
}

KEYWORD_TYPE_DESCRIPTIONS = {
    "request": "发送 HTTP 请求",
    "assertion": "验证响应结果",
    "extract": "从响应中提取变量",
    "sql": "执行数据库 SQL 语句",
    "wait": "等待指定时间",
    "custom": "自定义 Python 代码",
}


class KeywordService:
    """关键字服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(
        self,
        keyword_type: str | None = None,
        is_enabled: bool | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[Keyword], int]:
        """获取关键字列表

        Args:
            keyword_type: 关键字类型过滤
            is_enabled: 是否启用过滤
            search: 搜索关键词
            page: 页码
            page_size: 每页数量

        Returns:
            (关键字列表, 总数)
        """
        query = select(Keyword).order_by(Keyword.created_at.desc())

        # 类型过滤
        if keyword_type:
            query = query.where(Keyword.keyword_type == keyword_type)

        # 启用状态过滤
        if is_enabled is not None:
            query = query.where(Keyword.is_enabled == is_enabled)

        # 搜索
        if search:
            query = query.where(
                Keyword.name.ilike(f"%{search}%")
                | Keyword.method_name.ilike(f"%{search}%")
            )

        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.session.scalar(count_query) or 0

        # 分页
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.session.execute(query)
        keywords = result.scalars().all()

        return list(keywords), total

    async def get(self, keyword_id: str) -> Keyword | None:
        """获取关键字详情

        Args:
            keyword_id: 关键字 ID

        Returns:
            关键字对象，不存在返回 None
        """
        return await self.session.get(Keyword, keyword_id)

    async def create(self, data: KeywordCreate) -> Keyword:
        """创建关键字

        Args:
            data: 创建数据

        Returns:
            创建的关键字
        """
        keyword = Keyword(
            keyword_type=data.keyword_type,
            name=data.name,
            method_name=data.method_name,
            code=data.code,
            params_schema=data.params_schema or {},
            is_builtin=False,
            is_enabled=data.is_enabled,
        )
        self.session.add(keyword)
        await self.session.commit()
        await self.session.refresh(keyword)

        logger.info(f"Created keyword: {keyword.name}")
        return keyword

    async def update(self, keyword_id: str, data: KeywordUpdate) -> Keyword | None:
        """更新关键字

        Args:
            keyword_id: 关键字 ID
            data: 更新数据

        Returns:
            更新后的关键字，不存在返回 None
        """
        keyword = await self.session.get(Keyword, keyword_id)
        if not keyword:
            return None

        # 更新字段
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(keyword, field, value)

        await self.session.commit()
        await self.session.refresh(keyword)

        logger.info(f"Updated keyword: {keyword.name}")
        return keyword

    async def delete(self, keyword_id: str) -> bool:
        """删除关键字

        Args:
            keyword_id: 关键字 ID

        Returns:
            是否删除成功
        """
        keyword = await self.session.get(Keyword, keyword_id)
        if not keyword:
            return False

        # 不允许删除内置关键字
        if keyword.is_builtin:
            raise ValueError("无法删除内置关键字")

        await self.session.delete(keyword)
        await self.session.commit()

        logger.info(f"Deleted keyword: {keyword.name}")
        return True

    async def get_by_type(self, keyword_type: str) -> list[Keyword]:
        """根据类型获取关键字列表

        Args:
            keyword_type: 关键字类型

        Returns:
            关键字列表
        """
        query = (
            select(Keyword)
            .where(Keyword.keyword_type == keyword_type, Keyword.is_enabled.is_(True))
            .order_by(Keyword.name)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_types(self) -> list[KeywordTypeResponse]:
        """获取所有关键字类型

        Returns:
            关键字类型列表
        """
        return [
            KeywordTypeResponse(
                type=type_name,
                name=KEYWORD_TYPE_NAMES.get(type_name, type_name),
                description=KEYWORD_TYPE_DESCRIPTIONS.get(type_name, ""),
            )
            for type_name in KEYWORD_TYPES
        ]
