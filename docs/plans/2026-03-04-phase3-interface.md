# Phase 3: 接口定义模块 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现接口定义（CRUD、目录管理）和环境管理（环境变量、全局变量）功能。

**Architecture:** 后端使用 FastAPI + SQLAlchemy 2.0 async，前端使用 React + Zustand + React Query。接口支持目录树结构，环境支持变量管理。

**Tech Stack:** FastAPI, Pydantic v2, SQLAlchemy 2.0, React, Zustand, React Query, shadcn/ui

---

## 前置条件

- Phase 1 基础设施已完成
- Phase 2 认证与项目管理已完成
- 数据库模型已定义 (Interface, InterfaceFolder, Environment, EnvironmentVariable, GlobalVariable)

---

## Task 1: 接口目录服务层

**Files:**
- Create: `backend/app/modules/interface/schemas.py`
- Create: `backend/app/modules/interface/service.py`

**Step 1: 创建 schemas.py**

```python
# backend/app/modules/interface/schemas.py
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional, List, Dict, Any


# ============ 接口目录 Schemas ============

class FolderCreate(BaseModel):
    """创建目录请求"""
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[str] = None
    sort_order: int = 0


class FolderUpdate(BaseModel):
    """更新目录请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    parent_id: Optional[str] = None
    sort_order: Optional[int] = None


class FolderResponse(BaseModel):
    """目录响应"""
    id: UUID
    project_id: UUID
    parent_id: Optional[UUID]
    name: str
    sort_order: int
    created_at: datetime
    children: List["FolderResponse"] = []
    interface_count: int = 0

    class Config:
        from_attributes = True


# ============ 接口 Schemas ============

class InterfaceCreate(BaseModel):
    """创建接口请求"""
    name: str = Field(..., min_length=1, max_length=255)
    method: str = Field(..., pattern="^(GET|POST|PUT|DELETE|PATCH)$")
    path: str = Field(..., min_length=1, max_length=500)
    folder_id: Optional[str] = None
    headers: Optional[Dict[str, Any]] = None
    params: Optional[Dict[str, Any]] = None
    body: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    sort_order: int = 0


class InterfaceUpdate(BaseModel):
    """更新接口请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    method: Optional[str] = Field(None, pattern="^(GET|POST|PUT|DELETE|PATCH)$")
    path: Optional[str] = Field(None, min_length=1, max_length=500)
    folder_id: Optional[str] = None
    headers: Optional[Dict[str, Any]] = None
    params: Optional[Dict[str, Any]] = None
    body: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None


class InterfaceResponse(BaseModel):
    """接口响应"""
    id: UUID
    project_id: UUID
    folder_id: Optional[UUID]
    name: str
    method: str
    path: str
    headers: Optional[Dict[str, Any]]
    params: Optional[Dict[str, Any]]
    body: Optional[Dict[str, Any]]
    description: Optional[str]
    sort_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InterfaceListResponse(BaseModel):
    """接口列表响应"""
    items: List[InterfaceResponse]
    total: int


# 更新 ForwardRef
FolderResponse.model_rebuild()
```

**Step 2: 创建 service.py**

```python
# backend/app/modules/interface/service.py
from typing import List, Optional, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError, BadRequestError
from app.models_new.interface import Interface, InterfaceFolder
from app.modules.interface.schemas import (
    FolderCreate, FolderUpdate, FolderResponse,
    InterfaceCreate, InterfaceUpdate, InterfaceResponse,
)


class FolderService:
    """接口目录服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_by_project(self, project_id: str) -> List[InterfaceFolder]:
        """获取项目的所有目录（扁平列表）"""
        result = await self.session.execute(
            select(InterfaceFolder)
            .where(InterfaceFolder.project_id == project_id)
            .order_by(InterfaceFolder.sort_order, InterfaceFolder.created_at)
        )
        return list(result.scalars().all())

    async def get_tree(self, project_id: str) -> List[FolderResponse]:
        """获取目录树结构"""
        folders = await self.list_by_project(project_id)

        # 统计每个目录下的接口数量
        folder_ids = [f.id for f in folders]
        if folder_ids:
            count_result = await self.session.execute(
                select(Interface.folder_id, func.count(Interface.id))
                .where(Interface.folder_id.in_(folder_ids))
                .group_by(Interface.folder_id)
            )
            counts = dict(count_result.all())
        else:
            counts = {}

        # 构建树结构
        folder_map = {}
        root_folders = []

        for folder in folders:
            folder_resp = FolderResponse(
                id=folder.id,
                project_id=folder.project_id,
                parent_id=folder.parent_id,
                name=folder.name,
                sort_order=folder.sort_order,
                created_at=folder.created_at,
                children=[],
                interface_count=counts.get(folder.id, 0),
            )
            folder_map[folder.id] = folder_resp

        for folder in folder_map.values():
            if folder.parent_id and folder.parent_id in folder_map:
                folder_map[folder.parent_id].children.append(folder)
            else:
                root_folders.append(folder)

        return root_folders

    async def create(self, project_id: str, data: FolderCreate) -> InterfaceFolder:
        """创建目录"""
        # 检查父目录是否存在
        if data.parent_id:
            parent = await self.session.get(InterfaceFolder, data.parent_id)
            if not parent or parent.project_id != project_id:
                raise BadRequestError("父目录不存在或不属于当前项目")

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
        """更新目录"""
        folder = await self.session.get(InterfaceFolder, folder_id)
        if not folder:
            raise NotFoundError("目录不存在")

        update_data = data.model_dump(exclude_unset=True)

        # 检查父目录是否有效
        if "parent_id" in update_data:
            if update_data["parent_id"] == folder_id:
                raise BadRequestError("不能将目录设为自己的子目录")
            if update_data["parent_id"]:
                parent = await self.session.get(InterfaceFolder, update_data["parent_id"])
                if not parent or parent.project_id != folder.project_id:
                    raise BadRequestError("父目录不存在或不属于当前项目")

        for field, value in update_data.items():
            setattr(folder, field, value)

        await self.session.commit()
        await self.session.refresh(folder)
        return folder

    async def delete(self, folder_id: str) -> None:
        """删除目录（子目录和接口会被级联删除）"""
        folder = await self.session.get(InterfaceFolder, folder_id)
        if not folder:
            raise NotFoundError("目录不存在")

        await self.session.delete(folder)
        await self.session.commit()


class InterfaceService:
    """接口服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(
        self,
        project_id: str,
        folder_id: Optional[str] = None,
        search: Optional[str] = None,
        method: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[Interface], int]:
        """获取接口列表"""
        query = select(Interface).where(Interface.project_id == project_id)

        if folder_id:
            query = query.where(Interface.folder_id == folder_id)
        if search:
            query = query.where(
                Interface.name.ilike(f"%{search}%") |
                Interface.path.ilike(f"%{search}%")
            )
        if method:
            query = query.where(Interface.method == method.upper())

        # 计算总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar()

        # 分页
        query = query.order_by(Interface.sort_order, Interface.updated_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        interfaces = list(result.scalars().all())

        return interfaces, total

    async def get(self, interface_id: str) -> Interface:
        """获取接口详情"""
        interface = await self.session.get(Interface, interface_id)
        if not interface:
            raise NotFoundError("接口不存在")
        return interface

    async def create(self, project_id: str, data: InterfaceCreate) -> Interface:
        """创建接口"""
        # 检查目录是否存在
        if data.folder_id:
            folder = await self.session.get(InterfaceFolder, data.folder_id)
            if not folder or folder.project_id != project_id:
                raise BadRequestError("目录不存在或不属于当前项目")

        interface = Interface(
            project_id=project_id,
            name=data.name,
            method=data.method.upper(),
            path=data.path,
            folder_id=data.folder_id,
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
        """更新接口"""
        interface = await self.get(interface_id)

        update_data = data.model_dump(exclude_unset=True)

        # 检查目录是否存在
        if "folder_id" in update_data and update_data["folder_id"]:
            folder = await self.session.get(InterfaceFolder, update_data["folder_id"])
            if not folder or folder.project_id != interface.project_id:
                raise BadRequestError("目录不存在或不属于当前项目")

        for field, value in update_data.items():
            setattr(interface, field, value)

        await self.session.commit()
        await self.session.refresh(interface)
        return interface

    async def delete(self, interface_id: str) -> None:
        """删除接口"""
        interface = await self.get(interface_id)
        await self.session.delete(interface)
        await self.session.commit()

    async def move(self, interface_id: str, folder_id: Optional[str]) -> Interface:
        """移动接口到其他目录"""
        interface = await self.get(interface_id)

        if folder_id:
            folder = await self.session.get(InterfaceFolder, folder_id)
            if not folder or folder.project_id != interface.project_id:
                raise BadRequestError("目标目录不存在或不属于当前项目")

        interface.folder_id = folder_id
        await self.session.commit()
        await self.session.refresh(interface)
        return interface
```

**Step 3: 验证导入**

Run: `cd backend && uv run python -c "from app.modules.interface.service import FolderService, InterfaceService; print('Interface service OK')"`
Expected: Print "Interface service OK"

**Step 4: Commit**

```bash
git add backend/app/modules/interface/
git commit -m "feat(backend): add interface service with folder management"
```

---

## Task 2: 接口定义路由

**Files:**
- Create: `backend/app/modules/interface/routes.py`
- Modify: `backend/app/main.py` (注册路由)

**Step 1: 创建 routes.py**

```python
# backend/app/modules/interface/routes.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.response import success, PagedData
from app.models_new.user import User
from app.modules.interface import service, schemas

router = APIRouter(prefix="/projects/{project_id}/interfaces", tags=["接口定义"])


# ============ 目录管理 ============

@router.get("/folders", response_model=list[schemas.FolderResponse])
async def list_folders(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取目录树"""
    folder_service = service.FolderService(session)
    tree = await folder_service.get_tree(project_id)
    return success(data=tree)


@router.post("/folders", response_model=schemas.FolderResponse)
async def create_folder(
    data: schemas.FolderCreate,
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """创建目录"""
    folder_service = service.FolderService(session)
    folder = await folder_service.create(project_id, data)
    return success(data=schemas.FolderResponse.model_validate(folder), message="创建成功")


@router.put("/folders/{folder_id}", response_model=schemas.FolderResponse)
async def update_folder(
    folder_id: str,
    data: schemas.FolderUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """更新目录"""
    folder_service = service.FolderService(session)
    folder = await folder_service.update(folder_id, data)
    return success(data=schemas.FolderResponse.model_validate(folder), message="更新成功")


@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """删除目录"""
    folder_service = service.FolderService(session)
    await folder_service.delete(folder_id)
    return success(message="删除成功")


# ============ 接口管理 ============

@router.get("", response_model=schemas.InterfaceListResponse)
async def list_interfaces(
    project_id: str,
    folder_id: str = Query(None, description="目录ID"),
    search: str = Query(None, description="搜索关键词"),
    method: str = Query(None, description="HTTP方法"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取接口列表"""
    interface_service = service.InterfaceService(session)
    interfaces, total = await interface_service.list(
        project_id=project_id,
        folder_id=folder_id,
        search=search,
        method=method,
        page=page,
        page_size=page_size,
    )
    return success(data=PagedData(
        items=[schemas.InterfaceResponse.model_validate(i) for i in interfaces],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total > 0 else 0,
    ))


@router.post("", response_model=schemas.InterfaceResponse)
async def create_interface(
    data: schemas.InterfaceCreate,
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """创建接口"""
    interface_service = service.InterfaceService(session)
    interface = await interface_service.create(project_id, data)
    return success(data=schemas.InterfaceResponse.model_validate(interface), message="创建成功")


@router.get("/{interface_id}", response_model=schemas.InterfaceResponse)
async def get_interface(
    interface_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取接口详情"""
    interface_service = service.InterfaceService(session)
    interface = await interface_service.get(interface_id)
    return success(data=schemas.InterfaceResponse.model_validate(interface))


@router.put("/{interface_id}", response_model=schemas.InterfaceResponse)
async def update_interface(
    interface_id: str,
    data: schemas.InterfaceUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """更新接口"""
    interface_service = service.InterfaceService(session)
    interface = await interface_service.update(interface_id, data)
    return success(data=schemas.InterfaceResponse.model_validate(interface), message="更新成功")


@router.delete("/{interface_id}")
async def delete_interface(
    interface_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """删除接口"""
    interface_service = service.InterfaceService(session)
    await interface_service.delete(interface_id)
    return success(message="删除成功")


@router.post("/{interface_id}/move", response_model=schemas.InterfaceResponse)
async def move_interface(
    interface_id: str,
    folder_id: str = Query(None, description="目标目录ID，为空则移动到根目录"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """移动接口到其他目录"""
    interface_service = service.InterfaceService(session)
    interface = await interface_service.move(interface_id, folder_id)
    return success(data=schemas.InterfaceResponse.model_validate(interface), message="移动成功")
```

**Step 2: 更新 main.py 注册路由**

```python
# 添加导入
from app.modules.interface.routes import router as interface_router

# 注册路由
app.include_router(interface_router, prefix="/api/v1")
```

**Step 3: 验证路由**

Run: `cd backend && uv run python -c "from app.modules.interface.routes import router; print(f'Routes: {[r.path for r in router.routes]}')"`
Expected: Print all interface routes

**Step 4: Commit**

```bash
git add backend/app/modules/interface/routes.py backend/app/main.py
git commit -m "feat(backend): add interface routes with CRUD and folder management"
```

---

## Task 3: 环境管理服务层

**Files:**
- Create: `backend/app/modules/environment/schemas.py`
- Create: `backend/app/modules/environment/service.py`

**Step 1: 创建 schemas.py**

```python
# backend/app/modules/environment/schemas.py
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional, List


# ============ 环境变量 Schemas ============

class EnvironmentVariableCreate(BaseModel):
    """创建环境变量请求"""
    key: str = Field(..., min_length=1, max_length=255)
    value: Optional[str] = None
    description: Optional[str] = None


class EnvironmentVariableUpdate(BaseModel):
    """更新环境变量请求"""
    key: Optional[str] = Field(None, min_length=1, max_length=255)
    value: Optional[str] = None
    description: Optional[str] = None


class EnvironmentVariableResponse(BaseModel):
    """环境变量响应"""
    id: UUID
    environment_id: UUID
    key: str
    value: Optional[str]
    description: Optional[str]

    class Config:
        from_attributes = True


# ============ 环境 Schemas ============

class EnvironmentCreate(BaseModel):
    """创建环境请求"""
    name: str = Field(..., min_length=1, max_length=255)
    base_url: Optional[str] = Field(None, max_length=500)
    is_default: bool = False
    variables: Optional[List[EnvironmentVariableCreate]] = None


class EnvironmentUpdate(BaseModel):
    """更新环境请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    base_url: Optional[str] = Field(None, max_length=500)
    is_default: Optional[bool] = None


class EnvironmentResponse(BaseModel):
    """环境响应"""
    id: UUID
    project_id: UUID
    name: str
    base_url: Optional[str]
    is_default: bool
    created_at: datetime
    variables: List[EnvironmentVariableResponse] = []

    class Config:
        from_attributes = True


class EnvironmentListResponse(BaseModel):
    """环境列表响应"""
    items: List[EnvironmentResponse]
    total: int
```

**Step 2: 创建 service.py**

```python
# backend/app/modules/environment/service.py
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, BadRequestError
from app.models_new.environment import Environment, EnvironmentVariable
from app.modules.environment.schemas import (
    EnvironmentCreate, EnvironmentUpdate, EnvironmentResponse,
    EnvironmentVariableCreate, EnvironmentVariableUpdate, EnvironmentVariableResponse,
)


class EnvironmentService:
    """环境管理服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_by_project(self, project_id: str) -> List[Environment]:
        """获取项目的所有环境"""
        result = await self.session.execute(
            select(Environment)
            .where(Environment.project_id == project_id)
            .order_by(Environment.is_default.desc(), Environment.created_at)
        )
        return list(result.scalars().all())

    async def get(self, environment_id: str, with_variables: bool = True) -> Environment:
        """获取环境详情"""
        query = select(Environment).where(Environment.id == environment_id)
        if with_variables:
            query = query.options(selectinload(Environment.variables))

        result = await self.session.execute(query)
        environment = result.scalar_one_or_none()

        if not environment:
            raise NotFoundError("环境不存在")
        return environment

    async def create(self, project_id: str, data: EnvironmentCreate) -> Environment:
        """创建环境"""
        # 如果设置为默认环境，取消其他默认环境
        if data.is_default:
            await self._unset_default(project_id)

        environment = Environment(
            project_id=project_id,
            name=data.name,
            base_url=data.base_url,
            is_default=data.is_default,
        )
        self.session.add(environment)
        await self.session.flush()  # 获取 ID

        # 创建环境变量
        if data.variables:
            for var_data in data.variables:
                var = EnvironmentVariable(
                    environment_id=environment.id,
                    key=var_data.key,
                    value=var_data.value,
                    description=var_data.description,
                )
                self.session.add(var)

        await self.session.commit()
        await self.session.refresh(environment)
        return environment

    async def update(self, environment_id: str, data: EnvironmentUpdate) -> Environment:
        """更新环境"""
        environment = await self.get(environment_id, with_variables=False)

        update_data = data.model_dump(exclude_unset=True)

        # 如果设置为默认环境，取消其他默认环境
        if update_data.get("is_default"):
            await self._unset_default(str(environment.project_id))

        for field, value in update_data.items():
            setattr(environment, field, value)

        await self.session.commit()
        await self.session.refresh(environment)
        return environment

    async def delete(self, environment_id: str) -> None:
        """删除环境"""
        environment = await self.get(environment_id, with_variables=False)
        await self.session.delete(environment)
        await self.session.commit()

    async def set_default(self, environment_id: str) -> Environment:
        """设置为默认环境"""
        environment = await self.get(environment_id, with_variables=False)
        await self._unset_default(str(environment.project_id))
        environment.is_default = True
        await self.session.commit()
        await self.session.refresh(environment)
        return environment

    async def _unset_default(self, project_id: str) -> None:
        """取消项目的所有默认环境"""
        result = await self.session.execute(
            select(Environment).where(
                Environment.project_id == project_id,
                Environment.is_default == True,
            )
        )
        for env in result.scalars().all():
            env.is_default = False
        await self.session.flush()

    # ============ 环境变量管理 ============

    async def add_variable(
        self, environment_id: str, data: EnvironmentVariableCreate
    ) -> EnvironmentVariable:
        """添加环境变量"""
        # 检查 key 是否已存在
        result = await self.session.execute(
            select(EnvironmentVariable).where(
                EnvironmentVariable.environment_id == environment_id,
                EnvironmentVariable.key == data.key,
            )
        )
        if result.scalar_one_or_none():
            raise BadRequestError(f"变量 '{data.key}' 已存在")

        var = EnvironmentVariable(
            environment_id=environment_id,
            key=data.key,
            value=data.value,
            description=data.description,
        )
        self.session.add(var)
        await self.session.commit()
        await self.session.refresh(var)
        return var

    async def update_variable(
        self, variable_id: str, data: EnvironmentVariableUpdate
    ) -> EnvironmentVariable:
        """更新环境变量"""
        var = await self.session.get(EnvironmentVariable, variable_id)
        if not var:
            raise NotFoundError("变量不存在")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(var, field, value)

        await self.session.commit()
        await self.session.refresh(var)
        return var

    async def delete_variable(self, variable_id: str) -> None:
        """删除环境变量"""
        var = await self.session.get(EnvironmentVariable, variable_id)
        if not var:
            raise NotFoundError("变量不存在")
        await self.session.delete(var)
        await self.session.commit()
```

**Step 3: 添加 selectinload 导入**

在 service.py 顶部添加：
```python
from sqlalchemy.orm import selectinload
```

**Step 4: 验证导入**

Run: `cd backend && uv run python -c "from app.modules.environment.service import EnvironmentService; print('Environment service OK')"`
Expected: Print "Environment service OK"

**Step 5: Commit**

```bash
git add backend/app/modules/environment/
git commit -m "feat(backend): add environment service with variables management"
```

---

## Task 4: 环境管理路由

**Files:**
- Create: `backend/app/modules/environment/routes.py`
- Modify: `backend/app/main.py` (注册路由)

**Step 1: 创建 routes.py**

```python
# backend/app/modules/environment/routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.response import success
from app.models_new.user import User
from app.modules.environment import service, schemas

router = APIRouter(prefix="/projects/{project_id}/environments", tags=["环境管理"])


# ============ 环境管理 ============

@router.get("", response_model=list[schemas.EnvironmentResponse])
async def list_environments(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取环境列表"""
    env_service = service.EnvironmentService(session)
    environments = await env_service.list_by_project(project_id)
    return success(data=[schemas.EnvironmentResponse.model_validate(e) for e in environments])


@router.post("", response_model=schemas.EnvironmentResponse)
async def create_environment(
    data: schemas.EnvironmentCreate,
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """创建环境"""
    env_service = service.EnvironmentService(session)
    environment = await env_service.create(project_id, data)
    return success(data=schemas.EnvironmentResponse.model_validate(environment), message="创建成功")


@router.get("/{environment_id}", response_model=schemas.EnvironmentResponse)
async def get_environment(
    environment_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取环境详情"""
    env_service = service.EnvironmentService(session)
    environment = await env_service.get(environment_id)
    return success(data=schemas.EnvironmentResponse.model_validate(environment))


@router.put("/{environment_id}", response_model=schemas.EnvironmentResponse)
async def update_environment(
    environment_id: str,
    data: schemas.EnvironmentUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """更新环境"""
    env_service = service.EnvironmentService(session)
    environment = await env_service.update(environment_id, data)
    return success(data=schemas.EnvironmentResponse.model_validate(environment), message="更新成功")


@router.delete("/{environment_id}")
async def delete_environment(
    environment_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """删除环境"""
    env_service = service.EnvironmentService(session)
    await env_service.delete(environment_id)
    return success(message="删除成功")


@router.post("/{environment_id}/set-default", response_model=schemas.EnvironmentResponse)
async def set_default_environment(
    environment_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """设置为默认环境"""
    env_service = service.EnvironmentService(session)
    environment = await env_service.set_default(environment_id)
    return success(data=schemas.EnvironmentResponse.model_validate(environment), message="设置成功")


# ============ 环境变量管理 ============

@router.post("/{environment_id}/variables", response_model=schemas.EnvironmentVariableResponse)
async def add_variable(
    environment_id: str,
    data: schemas.EnvironmentVariableCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """添加环境变量"""
    env_service = service.EnvironmentService(session)
    var = await env_service.add_variable(environment_id, data)
    return success(data=schemas.EnvironmentVariableResponse.model_validate(var), message="添加成功")


@router.put("/variables/{variable_id}", response_model=schemas.EnvironmentVariableResponse)
async def update_variable(
    variable_id: str,
    data: schemas.EnvironmentVariableUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """更新环境变量"""
    env_service = service.EnvironmentService(session)
    var = await env_service.update_variable(variable_id, data)
    return success(data=schemas.EnvironmentVariableResponse.model_validate(var), message="更新成功")


@router.delete("/variables/{variable_id}")
async def delete_variable(
    variable_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """删除环境变量"""
    env_service = service.EnvironmentService(session)
    await env_service.delete_variable(variable_id)
    return success(message="删除成功")
```

**Step 2: 更新 main.py 注册路由**

```python
# 添加导入
from app.modules.environment.routes import router as environment_router

# 注册路由
app.include_router(environment_router, prefix="/api/v1")
```

**Step 3: Commit**

```bash
git add backend/app/modules/environment/routes.py backend/app/main.py
git commit -m "feat(backend): add environment routes with variables management"
```

---

## Task 5: 全局变量服务层和路由

**Files:**
- Create: `backend/app/modules/setting/schemas.py` (全局变量在 setting 模块)
- Create: `backend/app/modules/setting/global_variable_service.py`
- Create: `backend/app/modules/setting/global_variable_routes.py`

**Step 1: 创建 schemas.py**

```python
# backend/app/modules/setting/schemas.py
from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional, List


class GlobalVariableCreate(BaseModel):
    """创建全局变量请求"""
    key: str = Field(..., min_length=1, max_length=255)
    value: Optional[str] = None
    description: Optional[str] = None


class GlobalVariableUpdate(BaseModel):
    """更新全局变量请求"""
    key: Optional[str] = Field(None, min_length=1, max_length=255)
    value: Optional[str] = None
    description: Optional[str] = None


class GlobalVariableResponse(BaseModel):
    """全局变量响应"""
    id: UUID
    project_id: UUID
    key: str
    value: Optional[str]
    description: Optional[str]

    class Config:
        from_attributes = True


class GlobalVariableListResponse(BaseModel):
    """全局变量列表响应"""
    items: List[GlobalVariableResponse]
    total: int
```

**Step 2: 创建 global_variable_service.py**

```python
# backend/app/modules/setting/global_variable_service.py
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, BadRequestError
from app.models_new.environment import GlobalVariable
from app.modules.setting.schemas import (
    GlobalVariableCreate, GlobalVariableUpdate, GlobalVariableResponse,
)


class GlobalVariableService:
    """全局变量服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_by_project(self, project_id: str) -> List[GlobalVariable]:
        """获取项目的所有全局变量"""
        result = await self.session.execute(
            select(GlobalVariable)
            .where(GlobalVariable.project_id == project_id)
            .order_by(GlobalVariable.key)
        )
        return list(result.scalars().all())

    async def create(self, project_id: str, data: GlobalVariableCreate) -> GlobalVariable:
        """创建全局变量"""
        # 检查 key 是否已存在
        result = await self.session.execute(
            select(GlobalVariable).where(
                GlobalVariable.project_id == project_id,
                GlobalVariable.key == data.key,
            )
        )
        if result.scalar_one_or_none():
            raise BadRequestError(f"变量 '{data.key}' 已存在")

        var = GlobalVariable(
            project_id=project_id,
            key=data.key,
            value=data.value,
            description=data.description,
        )
        self.session.add(var)
        await self.session.commit()
        await self.session.refresh(var)
        return var

    async def update(self, variable_id: str, data: GlobalVariableUpdate) -> GlobalVariable:
        """更新全局变量"""
        var = await self.session.get(GlobalVariable, variable_id)
        if not var:
            raise NotFoundError("变量不存在")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(var, field, value)

        await self.session.commit()
        await self.session.refresh(var)
        return var

    async def delete(self, variable_id: str) -> None:
        """删除全局变量"""
        var = await self.session.get(GlobalVariable, variable_id)
        if not var:
            raise NotFoundError("变量不存在")
        await self.session.delete(var)
        await self.session.commit()
```

**Step 3: 创建 global_variable_routes.py**

```python
# backend/app/modules/setting/global_variable_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.response import success
from app.models_new.user import User
from app.modules.setting import global_variable_service, schemas

router = APIRouter(prefix="/projects/{project_id}/global-variables", tags=["全局变量"])


@router.get("", response_model=schemas.GlobalVariableListResponse)
async def list_global_variables(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取全局变量列表"""
    service = global_variable_service.GlobalVariableService(session)
    variables = await service.list_by_project(project_id)
    return success(data=schemas.GlobalVariableListResponse(
        items=[schemas.GlobalVariableResponse.model_validate(v) for v in variables],
        total=len(variables),
    ))


@router.post("", response_model=schemas.GlobalVariableResponse)
async def create_global_variable(
    data: schemas.GlobalVariableCreate,
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """创建全局变量"""
    service = global_variable_service.GlobalVariableService(session)
    var = await service.create(project_id, data)
    return success(data=schemas.GlobalVariableResponse.model_validate(var), message="创建成功")


@router.put("/{variable_id}", response_model=schemas.GlobalVariableResponse)
async def update_global_variable(
    variable_id: str,
    data: schemas.GlobalVariableUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """更新全局变量"""
    service = global_variable_service.GlobalVariableService(session)
    var = await service.update(variable_id, data)
    return success(data=schemas.GlobalVariableResponse.model_validate(var), message="更新成功")


@router.delete("/{variable_id}")
async def delete_global_variable(
    variable_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """删除全局变量"""
    service = global_variable_service.GlobalVariableService(session)
    await service.delete(variable_id)
    return success(message="删除成功")
```

**Step 4: 更新 main.py 注册路由**

```python
# 添加导入
from app.modules.setting.global_variable_routes import router as global_variable_router

# 注册路由
app.include_router(global_variable_router, prefix="/api/v1")
```

**Step 5: Commit**

```bash
git add backend/app/modules/setting/
git commit -m "feat(backend): add global variable service and routes"
```

---

## Task 6: 前端接口 API 和类型

**Files:**
- Create: `frontend/src/features/interface/types.ts`
- Create: `frontend/src/features/interface/api.ts`

**Step 1: 创建 types.ts**

```typescript
// frontend/src/features/interface/types.ts

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface InterfaceFolder {
  id: string
  project_id: string
  parent_id: string | null
  name: string
  sort_order: number
  created_at: string
  children: InterfaceFolder[]
  interface_count: number
}

export interface Interface {
  id: string
  project_id: string
  folder_id: string | null
  name: string
  method: HttpMethod
  path: string
  headers: Record<string, unknown> | null
  params: Record<string, unknown> | null
  body: Record<string, unknown> | null
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface FolderCreate {
  name: string
  parent_id?: string
  sort_order?: number
}

export interface FolderUpdate {
  name?: string
  parent_id?: string
  sort_order?: number
}

export interface InterfaceCreate {
  name: string
  method: HttpMethod
  path: string
  folder_id?: string
  headers?: Record<string, unknown>
  params?: Record<string, unknown>
  body?: Record<string, unknown>
  description?: string
  sort_order?: number
}

export interface InterfaceUpdate {
  name?: string
  method?: HttpMethod
  path?: string
  folder_id?: string
  headers?: Record<string, unknown>
  params?: Record<string, unknown>
  body?: Record<string, unknown>
  description?: string
  sort_order?: number
}
```

**Step 2: 创建 api.ts**

```typescript
// frontend/src/features/interface/api.ts
import { get, post, put, del } from '@/lib/api-client'
import type { PagedResponse } from '@/features/project/types'
import type {
  InterfaceFolder,
  Interface,
  FolderCreate,
  FolderUpdate,
  InterfaceCreate,
  InterfaceUpdate,
} from './types'

const baseUrl = (projectId: string) => `/projects/${projectId}/interfaces`

export const interfaceApi = {
  // 目录管理
  getFolders: (projectId: string) =>
    get<InterfaceFolder[]>(`${baseUrl(projectId)}/folders`),

  createFolder: (projectId: string, data: FolderCreate) =>
    post<InterfaceFolder>(`${baseUrl(projectId)}/folders`, data),

  updateFolder: (projectId: string, folderId: string, data: FolderUpdate) =>
    put<InterfaceFolder>(`${baseUrl(projectId)}/folders/${folderId}`, data),

  deleteFolder: (projectId: string, folderId: string) =>
    del<void>(`${baseUrl(projectId)}/folders/${folderId}`),

  // 接口管理
  list: (projectId: string, params?: {
    folder_id?: string
    search?: string
    method?: string
    page?: number
    page_size?: number
  }) =>
    get<PagedResponse<Interface>>(baseUrl(projectId), params),

  get: (projectId: string, interfaceId: string) =>
    get<Interface>(`${baseUrl(projectId)}/${interfaceId}`),

  create: (projectId: string, data: InterfaceCreate) =>
    post<Interface>(baseUrl(projectId), data),

  update: (projectId: string, interfaceId: string, data: InterfaceUpdate) =>
    put<Interface>(`${baseUrl(projectId)}/${interfaceId}`, data),

  delete: (projectId: string, interfaceId: string) =>
    del<void>(`${baseUrl(projectId)}/${interfaceId}`),

  move: (projectId: string, interfaceId: string, folderId: string | null) =>
    post<Interface>(`${baseUrl(projectId)}/${interfaceId}/move`, null, {
      folder_id: folderId,
    }),
}
```

**Step 3: Commit**

```bash
git add frontend/src/features/interface/
git commit -m "feat(frontend): add interface API client and types"
```

---

## Task 7: 前端环境 API 和类型

**Files:**
- Create: `frontend/src/features/environment/types.ts`
- Create: `frontend/src/features/environment/api.ts`

**Step 1: 创建 types.ts**

```typescript
// frontend/src/features/environment/types.ts

export interface EnvironmentVariable {
  id: string
  environment_id: string
  key: string
  value: string | null
  description: string | null
}

export interface Environment {
  id: string
  project_id: string
  name: string
  base_url: string | null
  is_default: boolean
  created_at: string
  variables: EnvironmentVariable[]
}

export interface EnvironmentCreate {
  name: string
  base_url?: string
  is_default?: boolean
  variables?: EnvironmentVariableCreate[]
}

export interface EnvironmentUpdate {
  name?: string
  base_url?: string
  is_default?: boolean
}

export interface EnvironmentVariableCreate {
  key: string
  value?: string
  description?: string
}

export interface EnvironmentVariableUpdate {
  key?: string
  value?: string
  description?: string
}

export interface GlobalVariable {
  id: string
  project_id: string
  key: string
  value: string | null
  description: string | null
}

export interface GlobalVariableCreate {
  key: string
  value?: string
  description?: string
}

export interface GlobalVariableUpdate {
  key?: string
  value?: string
  description?: string
}
```

**Step 2: 创建 api.ts**

```typescript
// frontend/src/features/environment/api.ts
import { get, post, put, del } from '@/lib/api-client'
import type {
  Environment,
  EnvironmentCreate,
  EnvironmentUpdate,
  EnvironmentVariableCreate,
  EnvironmentVariableUpdate,
  GlobalVariable,
  GlobalVariableCreate,
  GlobalVariableUpdate,
} from './types'

const envBaseUrl = (projectId: string) => `/projects/${projectId}/environments`
const globalVarBaseUrl = (projectId: string) => `/projects/${projectId}/global-variables`

export const environmentApi = {
  // 环境管理
  list: (projectId: string) =>
    get<Environment[]>(envBaseUrl(projectId)),

  get: (projectId: string, environmentId: string) =>
    get<Environment>(`${envBaseUrl(projectId)}/${environmentId}`),

  create: (projectId: string, data: EnvironmentCreate) =>
    post<Environment>(envBaseUrl(projectId), data),

  update: (projectId: string, environmentId: string, data: EnvironmentUpdate) =>
    put<Environment>(`${envBaseUrl(projectId)}/${environmentId}`, data),

  delete: (projectId: string, environmentId: string) =>
    del<void>(`${envBaseUrl(projectId)}/${environmentId}`),

  setDefault: (projectId: string, environmentId: string) =>
    post<Environment>(`${envBaseUrl(projectId)}/${environmentId}/set-default`, {}),

  // 环境变量管理
  addVariable: (projectId: string, environmentId: string, data: EnvironmentVariableCreate) =>
    post<EnvironmentVariable>(`${envBaseUrl(projectId)}/${environmentId}/variables`, data),

  updateVariable: (projectId: string, variableId: string, data: EnvironmentVariableUpdate) =>
    put<EnvironmentVariable>(`/projects/${projectId}/environments/variables/${variableId}`, data),

  deleteVariable: (projectId: string, variableId: string) =>
    del<void>(`/projects/${projectId}/environments/variables/${variableId}`),
}

export const globalVariableApi = {
  list: (projectId: string) =>
    get<{ items: GlobalVariable[]; total: number }>(globalVarBaseUrl(projectId)),

  create: (projectId: string, data: GlobalVariableCreate) =>
    post<GlobalVariable>(globalVarBaseUrl(projectId), data),

  update: (projectId: string, variableId: string, data: GlobalVariableUpdate) =>
    put<GlobalVariable>(`${globalVarBaseUrl(projectId)}/${variableId}`, data),

  delete: (projectId: string, variableId: string) =>
    del<void>(`${globalVarBaseUrl(projectId)}/${variableId}`),
}
```

**Step 3: Commit**

```bash
git add frontend/src/features/environment/
git commit -m "feat(frontend): add environment API client and types"
```

---

## Task 8: 集成测试与验证

**Step 1: 验证后端路由**

Run: `cd backend && uv run python -c "from app.main import app; print(f'Total routes: {len(app.routes)}')"`
Expected: Print total routes count

**Step 2: 验证接口路由注册**

Run: `cd backend && uv run python -c "
from app.main import app
interface_routes = [r for r in app.routes if hasattr(r, 'path') and '/interfaces' in r.path]
print(f'Interface routes: {len(interface_routes)}')
for r in interface_routes[:5]:
    if hasattr(r, 'methods'):
        print(f'  {list(r.methods)} {r.path}')
"`
Expected: Print interface routes

**Step 3: 验证环境路由注册**

Run: `cd backend && uv run python -c "
from app.main import app
env_routes = [r for r in app.routes if hasattr(r, 'path') and '/environments' in r.path]
print(f'Environment routes: {len(env_routes)}')
for r in env_routes[:5]:
    if hasattr(r, 'methods'):
        print(f'  {list(r.methods)} {r.path}')
"`
Expected: Print environment routes

**Step 4: 最终 Commit**

```bash
git add -A
git status
git diff --quiet || git commit -m "feat: complete Phase 3 interface and environment modules"
```

---

## Phase 3 完成检查清单

- [ ] 接口目录服务层 (CRUD, 树结构)
- [ ] 接口定义服务层 (CRUD, 搜索, 移动)
- [ ] 接口定义路由 (目录 + 接口 CRUD)
- [ ] 环境管理服务层 (CRUD, 变量)
- [ ] 环境管理路由 (环境 + 变量 CRUD)
- [ ] 全局变量服务层和路由
- [ ] 前端接口 API 和类型
- [ ] 前端环境 API 和类型
- [ ] 集成测试验证

---

> **文档结束** — Phase 3: 接口定义模块实施计划
