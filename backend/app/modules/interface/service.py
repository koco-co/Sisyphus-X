"""接口模块服务层

提供接口目录和接口定义的业务逻辑处理。
"""


from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models_new.interface import Interface, InterfaceFolder
from app.modules.interface.schemas import (
    FolderCreate,
    FolderResponse,
    FolderUpdate,
    InterfaceCreate,
    InterfaceUpdate,
)
from app.utils.exceptions import NotFoundError, ValidationError


class FolderService:
    """接口目录服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_by_project(self, project_id: str) -> list[InterfaceFolder]:
        """获取项目下所有目录列表（扁平结构）

        Args:
            project_id: 项目 ID

        Returns:
            目录列表
        """
        result = await self.session.execute(
            select(InterfaceFolder)
            .where(InterfaceFolder.project_id == project_id)
            .order_by(InterfaceFolder.sort_order, InterfaceFolder.created_at)
        )
        return list(result.scalars().all())

    async def get_tree(self, project_id: str) -> list[FolderResponse]:
        """获取项目下目录树结构（包含接口计数）

        Args:
            project_id: 项目 ID

        Returns:
            树形结构的目录列表
        """
        # 获取所有目录
        folders = await self.list_by_project(project_id)

        # 统计每个目录下的接口数量
        interface_count_query = (
            select(
                Interface.folder_id,
                func.count(Interface.id).label("count")
            )
            .where(Interface.project_id == project_id)
            .group_by(Interface.folder_id)
        )
        count_result = await self.session.execute(interface_count_query)
        interface_counts = {
            row.folder_id: row.count
            for row in count_result.all()
        }

        # 构建目录映射
        folder_map: dict[str, FolderResponse] = {}
        for folder in folders:
            folder_response = FolderResponse(
                id=folder.id,
                project_id=folder.project_id,
                parent_id=folder.parent_id,
                name=folder.name,
                sort_order=folder.sort_order,
                interface_count=interface_counts.get(folder.id, 0),
                children=[],
                created_at=folder.created_at,
            )
            folder_map[folder.id] = folder_response

        # 构建树结构
        root_folders: list[FolderResponse] = []
        for folder in folder_map.values():
            if folder.parent_id is None:
                root_folders.append(folder)
            elif folder.parent_id in folder_map:
                folder_map[folder.parent_id].children.append(folder)

        # 递归排序子目录
        def sort_children(folders: list[FolderResponse]) -> None:
            folders.sort(key=lambda f: (f.sort_order, f.created_at))
            for folder in folders:
                sort_children(folder.children)

        sort_children(root_folders)

        return root_folders

    async def get(self, folder_id: str) -> InterfaceFolder:
        """获取目录详情

        Args:
            folder_id: 目录 ID

        Returns:
            目录对象

        Raises:
            NotFoundError: 目录不存在
        """
        result = await self.session.execute(
            select(InterfaceFolder).where(InterfaceFolder.id == folder_id)
        )
        folder = result.scalar_one_or_none()

        if not folder:
            raise NotFoundError("目录", folder_id)

        return folder

    async def create(self, project_id: str, data: FolderCreate) -> InterfaceFolder:
        """创建目录

        Args:
            project_id: 项目 ID
            data: 创建数据

        Returns:
            创建的目录对象

        Raises:
            NotFoundError: 父目录不存在
        """
        # 验证父目录
        if data.parent_id:
            parent = await self.session.get(InterfaceFolder, data.parent_id)
            if not parent:
                raise NotFoundError("父目录", data.parent_id)
            # 确保父目录属于同一项目
            if parent.project_id != project_id:
                raise ValidationError("父目录不属于当前项目")

        folder = InterfaceFolder(
            project_id=project_id,
            name=data.name,
            parent_id=data.parent_id,
            sort_order=data.sort_order,
        )
        self.session.add(folder)
        await self.session.commit()
        await self.session.refresh(folder)

        return folder

    async def update(self, folder_id: str, data: FolderUpdate) -> InterfaceFolder:
        """更新目录

        Args:
            folder_id: 目录 ID
            data: 更新数据

        Returns:
            更新后的目录对象

        Raises:
            NotFoundError: 目录或父目录不存在
            ValidationError: 循环引用检查失败
        """
        folder = await self.get(folder_id)

        # 更新名称
        if data.name is not None:
            folder.name = data.name

        # 更新排序
        if data.sort_order is not None:
            folder.sort_order = data.sort_order

        # 更新父目录（需要检查循环引用）
        if data.parent_id != folder.parent_id:
            if data.parent_id is not None:
                # 检查父目录是否存在
                parent = await self.session.get(InterfaceFolder, data.parent_id)
                if not parent:
                    raise NotFoundError("父目录", data.parent_id)

                # 检查是否会造成循环引用
                if await self._would_create_cycle(folder_id, data.parent_id):
                    raise ValidationError("不能将目录移动到自身或其子目录下")

            folder.parent_id = data.parent_id

        await self.session.commit()
        await self.session.refresh(folder)

        return folder

    async def delete(self, folder_id: str) -> None:
        """删除目录

        Args:
            folder_id: 目录 ID

        Raises:
            NotFoundError: 目录不存在
        """
        folder = await self.get(folder_id)
        await self.session.delete(folder)
        await self.session.commit()

    async def _would_create_cycle(self, folder_id: str, new_parent_id: str) -> bool:
        """检查移动目录是否会造成循环引用

        Args:
            folder_id: 要移动的目录 ID
            new_parent_id: 新的父目录 ID

        Returns:
            True 表示会造成循环引用
        """
        # 如果新父目录是自身，则是循环
        if folder_id == new_parent_id:
            return True

        # 检查新父目录是否是当前目录的后代
        current_id = new_parent_id
        while current_id:
            if current_id == folder_id:
                return True

            result = await self.session.execute(
                select(InterfaceFolder.parent_id).where(
                    InterfaceFolder.id == current_id
                )
            )
            parent_id = result.scalar_one_or_none()
            current_id = parent_id

        return False


class InterfaceService:
    """接口定义服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(
        self,
        project_id: str,
        folder_id: str | None = None,
        search: str | None = None,
        method: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Interface], int]:
        """获取接口列表

        Args:
            project_id: 项目 ID
            folder_id: 目录 ID（可选，不传则返回所有接口）
            search: 搜索关键词（匹配名称、路径）
            method: HTTP 方法过滤
            page: 页码
            page_size: 每页数量

        Returns:
            (接口列表, 总数)
        """
        query = select(Interface).where(Interface.project_id == project_id)

        # 目录过滤
        if folder_id is not None:
            query = query.where(Interface.folder_id == folder_id)

        # 方法过滤
        if method:
            query = query.where(Interface.method == method.upper())

        # 搜索条件
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Interface.name.ilike(search_pattern),
                    Interface.path.ilike(search_pattern),
                )
            )

        # 计算总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        # 分页
        query = query.order_by(Interface.sort_order, Interface.updated_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        interfaces = list(result.scalars().all())

        return interfaces, total

    async def get(self, interface_id: str) -> Interface:
        """获取接口详情

        Args:
            interface_id: 接口 ID

        Returns:
            接口对象

        Raises:
            NotFoundError: 接口不存在
        """
        result = await self.session.execute(
            select(Interface).where(Interface.id == interface_id)
        )
        interface = result.scalar_one_or_none()

        if not interface:
            raise NotFoundError("接口", interface_id)

        return interface

    async def create(self, project_id: str, data: InterfaceCreate) -> Interface:
        """创建接口

        Args:
            project_id: 项目 ID
            data: 创建数据

        Returns:
            创建的接口对象

        Raises:
            NotFoundError: 目录不存在
            ValidationError: 目录不属于当前项目
        """
        # 验证目录
        if data.folder_id:
            folder = await self.session.get(InterfaceFolder, data.folder_id)
            if not folder:
                raise NotFoundError("目录", data.folder_id)
            if folder.project_id != project_id:
                raise ValidationError("目录不属于当前项目")

        interface = Interface(
            project_id=project_id,
            folder_id=data.folder_id,
            name=data.name,
            method=data.method,
            path=data.path,
            headers=data.headers or {},
            params=data.params or {},
            body=data.body or {},
            description=data.description,
            sort_order=data.sort_order,
        )
        self.session.add(interface)
        await self.session.commit()
        await self.session.refresh(interface)

        return interface

    async def update(self, interface_id: str, data: InterfaceUpdate) -> Interface:
        """更新接口

        Args:
            interface_id: 接口 ID
            data: 更新数据

        Returns:
            更新后的接口对象

        Raises:
            NotFoundError: 接口或目录不存在
            ValidationError: 目录不属于当前项目
        """
        interface = await self.get(interface_id)

        # 验证目录（如果更新了 folder_id）
        if data.folder_id is not None and data.folder_id != interface.folder_id:
            folder = await self.session.get(InterfaceFolder, data.folder_id)
            if not folder:
                raise NotFoundError("目录", data.folder_id)
            if folder.project_id != interface.project_id:
                raise ValidationError("目录不属于当前项目")

        # 更新字段
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(interface, field, value)

        await self.session.commit()
        await self.session.refresh(interface)

        return interface

    async def delete(self, interface_id: str) -> None:
        """删除接口

        Args:
            interface_id: 接口 ID

        Raises:
            NotFoundError: 接口不存在
        """
        interface = await self.get(interface_id)
        await self.session.delete(interface)
        await self.session.commit()

    async def move(self, interface_id: str, folder_id: str | None) -> Interface:
        """移动接口到指定目录

        Args:
            interface_id: 接口 ID
            folder_id: 目标目录 ID（None 表示移动到根目录）

        Returns:
            更新后的接口对象

        Raises:
            NotFoundError: 接口或目录不存在
            ValidationError: 目录不属于当前项目
        """
        interface = await self.get(interface_id)

        # 验证目录
        if folder_id is not None:
            folder = await self.session.get(InterfaceFolder, folder_id)
            if not folder:
                raise NotFoundError("目录", folder_id)
            if folder.project_id != interface.project_id:
                raise ValidationError("目录不属于当前项目")

        interface.folder_id = folder_id
        await self.session.commit()
        await self.session.refresh(interface)

        return interface
