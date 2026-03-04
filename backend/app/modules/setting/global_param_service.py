"""全局参数服务层 - 业务逻辑

提供全局参数（辅助函数）的增删改查功能。
"""

from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models_new.setting import GlobalParam
from app.modules.setting.global_param_schemas import (
    GlobalParamCreate,
    GlobalParamUpdate,
)

logger = logging.getLogger(__name__)


class GlobalParamService:
    """全局参数服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(
        self,
        search: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[GlobalParam], int]:
        """获取全局参数列表

        Args:
            search: 搜索关键词
            page: 页码
            page_size: 每页数量

        Returns:
            (全局参数列表, 总数)
        """
        query = select(GlobalParam).order_by(GlobalParam.created_at.desc())

        # 搜索
        if search:
            query = query.where(
                GlobalParam.class_name.ilike(f"%{search}%")
                | GlobalParam.method_name.ilike(f"%{search}%")
            )

        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.session.scalar(count_query) or 0

        # 分页
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.session.execute(query)
        params = result.scalars().all()

        return list(params), total

    async def get(self, param_id: str) -> GlobalParam | None:
        """获取全局参数详情

        Args:
            param_id: 全局参数 ID

        Returns:
            全局参数对象，不存在返回 None
        """
        return await self.session.get(GlobalParam, param_id)

    async def create(self, data: GlobalParamCreate) -> GlobalParam:
        """创建全局参数

        Args:
            data: 创建数据

        Returns:
            创建的全局参数
        """
        param = GlobalParam(
            class_name=data.class_name,
            method_name=data.method_name,
            code=data.code,
            description=data.description,
            input_params=[p.model_dump() for p in data.input_params],
            output_params=[p.model_dump() for p in data.output_params],
        )
        self.session.add(param)
        await self.session.commit()
        await self.session.refresh(param)

        logger.info(f"Created global param: {param.class_name}.{param.method_name}")
        return param

    async def update(self, param_id: str, data: GlobalParamUpdate) -> GlobalParam | None:
        """更新全局参数

        Args:
            param_id: 全局参数 ID
            data: 更新数据

        Returns:
            更新后的全局参数，不存在返回 None
        """
        param = await self.session.get(GlobalParam, param_id)
        if not param:
            return None

        # 更新字段
        update_data = data.model_dump(exclude_unset=True)

        # 处理 input_params 和 output_params
        if "input_params" in update_data and update_data["input_params"] is not None:
            update_data["input_params"] = [
                p.model_dump() if hasattr(p, "model_dump") else p
                for p in update_data["input_params"]
            ]
        if "output_params" in update_data and update_data["output_params"] is not None:
            update_data["output_params"] = [
                p.model_dump() if hasattr(p, "model_dump") else p
                for p in update_data["output_params"]
            ]

        for field, value in update_data.items():
            setattr(param, field, value)

        await self.session.commit()
        await self.session.refresh(param)

        logger.info(f"Updated global param: {param.class_name}.{param.method_name}")
        return param

    async def delete(self, param_id: str) -> bool:
        """删除全局参数

        Args:
            param_id: 全局参数 ID

        Returns:
            是否删除成功
        """
        param = await self.session.get(GlobalParam, param_id)
        if not param:
            return False

        await self.session.delete(param)
        await self.session.commit()

        logger.info(f"Deleted global param: {param.class_name}.{param.method_name}")
        return True
