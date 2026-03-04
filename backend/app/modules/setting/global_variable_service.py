"""全局变量服务层"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models_new.environment import GlobalVariable
from app.modules.setting.schemas import GlobalVariableCreate, GlobalVariableUpdate
from app.utils.exceptions import ConflictError, NotFoundError


class GlobalVariableService:
    """全局变量管理服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_by_project(self, project_id: str) -> list[GlobalVariable]:
        """
        获取项目下的所有全局变量

        Args:
            project_id: 项目 ID

        Returns:
            全局变量列表
        """
        result = await self.session.execute(
            select(GlobalVariable)
            .where(GlobalVariable.project_id == project_id)
            .order_by(GlobalVariable.key)
        )
        return list(result.scalars().all())

    async def get_by_id(self, variable_id: str) -> GlobalVariable:
        """
        根据 ID 获取全局变量

        Args:
            variable_id: 变量 ID

        Returns:
            全局变量对象

        Raises:
            NotFoundError: 变量不存在
        """
        result = await self.session.execute(
            select(GlobalVariable).where(GlobalVariable.id == variable_id)
        )
        variable = result.scalar_one_or_none()

        if not variable:
            raise NotFoundError("GlobalVariable", variable_id)

        return variable

    async def create(self, project_id: str, data: GlobalVariableCreate) -> GlobalVariable:
        """
        创建全局变量

        Args:
            project_id: 项目 ID
            data: 创建数据

        Returns:
            创建的全局变量

        Raises:
            ConflictError: key 已存在
        """
        # 检查 key 是否已存在
        existing = await self.session.execute(
            select(GlobalVariable).where(
                GlobalVariable.project_id == project_id,
                GlobalVariable.key == data.key,
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictError(
                detail=f"Global variable with key '{data.key}' already exists in this project",
                conflict_field="key",
                conflict_value=data.key,
            )

        variable = GlobalVariable(
            project_id=project_id,
            key=data.key,
            value=data.value,
            description=data.description,
        )
        self.session.add(variable)
        await self.session.commit()
        await self.session.refresh(variable)

        return variable

    async def update(self, variable_id: str, data: GlobalVariableUpdate) -> GlobalVariable:
        """
        更新全局变量

        Args:
            variable_id: 变量 ID
            data: 更新数据

        Returns:
            更新后的全局变量

        Raises:
            NotFoundError: 变量不存在
            ConflictError: key 已存在（如果要更新 key）
        """
        variable = await self.get_by_id(variable_id)

        # 如果要更新 key，检查是否重复
        if data.key is not None and data.key != variable.key:
            existing = await self.session.execute(
                select(GlobalVariable).where(
                    GlobalVariable.project_id == variable.project_id,
                    GlobalVariable.key == data.key,
                    GlobalVariable.id != variable_id,
                )
            )
            if existing.scalar_one_or_none():
                raise ConflictError(
                    detail=f"Global variable with key '{data.key}' already exists in this project",
                    conflict_field="key",
                    conflict_value=data.key,
                )
            variable.key = data.key

        if data.value is not None:
            variable.value = data.value

        if data.description is not None:
            variable.description = data.description

        await self.session.commit()
        await self.session.refresh(variable)

        return variable

    async def delete(self, variable_id: str) -> None:
        """
        删除全局变量

        Args:
            variable_id: 变量 ID

        Raises:
            NotFoundError: 变量不存在
        """
        variable = await self.get_by_id(variable_id)
        await self.session.delete(variable)
        await self.session.commit()
