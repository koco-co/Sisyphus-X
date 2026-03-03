from typing import List, Optional, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.exceptions import NotFoundError
from app.models_new.project import Project
from app.modules.project.schemas import ProjectCreate, ProjectUpdate


class ProjectService:
    """项目管理服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_projects(
        self,
        user_id: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Project], int]:
        """获取项目列表"""
        query = select(Project)

        # 搜索条件
        if search:
            query = query.where(
                or_(
                    Project.name.ilike(f"%{search}%"),
                    Project.description.ilike(f"%{search}%"),
                )
            )

        # 计算总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar()

        # 分页
        query = query.order_by(Project.updated_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        projects = list(result.scalars().all())

        return projects, total

    async def get_project(self, project_id: str) -> Project:
        """获取项目详情"""
        result = await self.session.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()

        if not project:
            raise NotFoundError("项目", project_id)

        return project

    async def create_project(self, data: ProjectCreate, user_id: str) -> Project:
        """创建项目"""
        project = Project(
            name=data.name,
            description=data.description,
            created_by=user_id,
        )
        self.session.add(project)
        await self.session.commit()
        await self.session.refresh(project)

        return project

    async def update_project(self, project_id: str, data: ProjectUpdate) -> Project:
        """更新项目"""
        project = await self.get_project(project_id)

        if data.name is not None:
            project.name = data.name
        if data.description is not None:
            project.description = data.description

        await self.session.commit()
        await self.session.refresh(project)

        return project

    async def delete_project(self, project_id: str) -> None:
        """删除项目"""
        project = await self.get_project(project_id)
        await self.session.delete(project)
        await self.session.commit()
