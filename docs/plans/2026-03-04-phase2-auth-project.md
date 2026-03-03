# Phase 2: 认证与项目管理 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现用户认证（登录、注册、JWT）和项目管理（CRUD）功能，包括数据库配置管理。

**Architecture:** 后端使用 FastAPI + JWT 认证，前端使用 React + Zustand + React Query。开发模式下支持认证绕过。

**Tech Stack:** FastAPI, python-jose (JWT), passlib (密码哈希), React, Zustand, React Query, shadcn/ui

---

## 前置条件

- Phase 1 基础设施已完成
- 数据库模型已定义
- Zustand stores 已配置

---

## Task 1: 后端认证服务层

**Files:**
- Create: `backend/app/modules/auth/service.py`
- Create: `backend/app/modules/auth/schemas.py`

**Step 1: 创建 schemas.py**

```python
# backend/app/modules/auth/schemas.py
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from uuid import UUID


class UserRegister(BaseModel):
    """用户注册请求"""
    email: EmailStr
    username: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    """用户登录请求"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """用户响应"""
    id: UUID
    email: str
    username: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Token 响应"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class PasswordChange(BaseModel):
    """修改密码请求"""
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=100)
```

**Step 2: 创建 service.py**

```python
# backend/app/modules/auth/service.py
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestError, UnauthorizedError
from app.models_new.user import User
from app.modules.auth.schemas import UserRegister, UserLogin, UserResponse, TokenResponse

# 密码哈希上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """哈希密码"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """创建 JWT Token"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt


def decode_token(token: str) -> Optional[str]:
    """解码 JWT Token，返回用户 ID"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except JWTError:
        return None


class AuthService:
    """认证服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def register(self, data: UserRegister) -> UserResponse:
        """用户注册"""
        # 检查邮箱是否已存在
        result = await self.session.execute(
            select(User).where(User.email == data.email)
        )
        if result.scalar_one_or_none():
            raise BadRequestError("该邮箱已被注册")

        # 创建用户
        user = User(
            email=data.email,
            username=data.username,
            password_hash=hash_password(data.password),
            is_active=True,
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        return UserResponse.model_validate(user)

    async def login(self, data: UserLogin) -> TokenResponse:
        """用户登录"""
        # 查找用户
        result = await self.session.execute(
            select(User).where(User.email == data.email)
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(data.password, user.password_hash):
            raise UnauthorizedError("邮箱或密码错误")

        if not user.is_active:
            raise UnauthorizedError("账户已被禁用")

        # 创建 Token
        access_token = create_access_token(str(user.id))

        return TokenResponse(
            access_token=access_token,
            user=UserResponse.model_validate(user),
        )

    async def get_user(self, user_id: str) -> Optional[UserResponse]:
        """获取用户信息"""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user:
            return UserResponse.model_validate(user)
        return None

    async def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """修改密码"""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise UnauthorizedError("用户不存在")

        if not verify_password(old_password, user.password_hash):
            raise BadRequestError("原密码错误")

        user.password_hash = hash_password(new_password)
        user.updated_at = datetime.utcnow()
        await self.session.commit()

        return True
```

**Step 3: 验证导入**

Run: `cd backend && uv run python -c "from app.modules.auth.service import AuthService; print('Auth service OK')"`
Expected: Print "Auth service OK"

**Step 4: Commit**

```bash
git add backend/app/modules/auth/
git commit -m "feat(backend): add auth service with JWT and password hashing"
```

---

## Task 2: 后端认证路由

**Files:**
- Create: `backend/app/modules/auth/routes.py`
- Modify: `backend/app/core/deps.py` (创建认证依赖)
- Modify: `backend/app/main.py` (注册路由)

**Step 1: 创建 deps.py (认证依赖)**

```python
# backend/app/core/deps.py
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.config import settings
from app.core.exceptions import UnauthorizedError
from app.modules.auth.service import decode_token
from app.models_new.user import User
from sqlalchemy import select

security = HTTPBearer(auto_error=False)

# 默认测试用户 ID (开发模式使用)
DEFAULT_TEST_USER_ID = "00000000-0000-0000-0000-000000000001"


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_session),
) -> User:
    """
    获取当前用户

    开发模式: 如果 AUTH_DISABLED=true，返回默认测试用户
    生产模式: 验证 JWT Token
    """
    if settings.AUTH_DISABLED:
        # 开发模式：返回默认测试用户
        result = await session.execute(
            select(User).where(User.id == DEFAULT_TEST_USER_ID)
        )
        user = result.scalar_one_or_none()
        if user:
            return user
        # 如果不存在，创建默认用户
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        user = User(
            id=DEFAULT_TEST_USER_ID,
            email="default-test-user@example.com",
            username="default_user",
            password_hash=pwd_context.hash("default_password"),
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

    # 生产模式：验证 Token
    if not credentials:
        raise UnauthorizedError("未提供认证信息")

    user_id = decode_token(credentials.credentials)
    if not user_id:
        raise UnauthorizedError("无效的 Token")

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedError("用户不存在")

    if not user.is_active:
        raise UnauthorizedError("账户已被禁用")

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_session),
) -> Optional[User]:
    """可选的用户认证（不强制要求登录）"""
    try:
        return await get_current_user(credentials, session)
    except UnauthorizedError:
        return None
```

**Step 2: 创建 routes.py**

```python
# backend/app/modules/auth/routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.response import success
from app.models_new.user import User
from app.modules.auth import service, schemas

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/register", response_model=schemas.UserResponse)
async def register(
    data: schemas.UserRegister,
    session: AsyncSession = Depends(get_session),
):
    """用户注册"""
    auth_service = service.AuthService(session)
    user = await auth_service.register(data)
    return success(data=user, message="注册成功")


@router.post("/login", response_model=schemas.TokenResponse)
async def login(
    data: schemas.UserLogin,
    session: AsyncSession = Depends(get_session),
):
    """用户登录"""
    auth_service = service.AuthService(session)
    token = await auth_service.login(data)
    return success(data=token, message="登录成功")


@router.get("/me", response_model=schemas.UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """获取当前用户信息"""
    return success(data=schemas.UserResponse.model_validate(current_user))


@router.post("/logout")
async def logout():
    """用户登出（前端清除 Token 即可）"""
    return success(message="登出成功")


@router.post("/change-password")
async def change_password(
    data: schemas.PasswordChange,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """修改密码"""
    auth_service = service.AuthService(session)
    await auth_service.change_password(
        str(current_user.id),
        data.old_password,
        data.new_password,
    )
    return success(message="密码修改成功")
```

**Step 3: 更新 main.py 注册路由**

在 `backend/app/main.py` 中添加路由注册：

```python
# 在文件顶部添加导入
from app.modules.auth.routes import router as auth_router

# 在 app 创建后添加路由
app.include_router(auth_router, prefix="/api/v1")
```

**Step 4: 验证路由**

Run: `cd backend && uv run python -c "from app.modules.auth.routes import router; print(f'Routes: {[r.path for r in router.routes]}')"`
Expected: Print all auth routes

**Step 5: Commit**

```bash
git add backend/app/modules/auth/routes.py backend/app/core/deps.py backend/app/main.py
git commit -m "feat(backend): add auth routes with JWT authentication"
```

---

## Task 3: 项目管理服务层

**Files:**
- Create: `backend/app/modules/project/service.py`
- Create: `backend/app/modules/project/schemas.py`

**Step 1: 创建 schemas.py**

```python
# backend/app/modules/project/schemas.py
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional, List


class ProjectCreate(BaseModel):
    """创建项目请求"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    """更新项目请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    """项目响应"""
    id: UUID
    name: str
    description: Optional[str]
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """项目列表响应"""
    items: List[ProjectResponse]
    total: int
    page: int
    page_size: int
```

**Step 2: 创建 service.py**

```python
# backend/app/modules/project/service.py
from typing import List, Optional, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models_new.project import Project
from app.modules.project.schemas import ProjectCreate, ProjectUpdate, ProjectResponse


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
            raise NotFoundError("项目不存在")

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
```

**Step 3: 验证导入**

Run: `cd backend && uv run python -c "from app.modules.project.service import ProjectService; print('Project service OK')"`
Expected: Print "Project service OK"

**Step 4: Commit**

```bash
git add backend/app/modules/project/
git commit -m "feat(backend): add project service with CRUD operations"
```

---

## Task 4: 项目管理路由

**Files:**
- Create: `backend/app/modules/project/routes.py`
- Modify: `backend/app/main.py` (注册路由)

**Step 1: 创建 routes.py**

```python
# backend/app/modules/project/routes.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.response import success, PagedData
from app.models_new.user import User
from app.modules.project import service, schemas

router = APIRouter(prefix="/projects", tags=["项目管理"])


@router.get("", response_model=schemas.ProjectListResponse)
async def list_projects(
    search: str = Query(None, description="搜索关键词"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取项目列表"""
    project_service = service.ProjectService(session)
    projects, total = await project_service.list_projects(
        search=search,
        page=page,
        page_size=page_size,
    )

    return success(data=PagedData(
        items=[schemas.ProjectResponse.model_validate(p) for p in projects],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    ))


@router.post("", response_model=schemas.ProjectResponse)
async def create_project(
    data: schemas.ProjectCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """创建项目"""
    project_service = service.ProjectService(session)
    project = await project_service.create_project(data, str(current_user.id))
    return success(data=schemas.ProjectResponse.model_validate(project), message="创建成功")


@router.get("/{project_id}", response_model=schemas.ProjectResponse)
async def get_project(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取项目详情"""
    project_service = service.ProjectService(session)
    project = await project_service.get_project(project_id)
    return success(data=schemas.ProjectResponse.model_validate(project))


@router.put("/{project_id}", response_model=schemas.ProjectResponse)
async def update_project(
    project_id: str,
    data: schemas.ProjectUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """更新项目"""
    project_service = service.ProjectService(session)
    project = await project_service.update_project(project_id, data)
    return success(data=schemas.ProjectResponse.model_validate(project), message="更新成功")


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """删除项目"""
    project_service = service.ProjectService(session)
    await project_service.delete_project(project_id)
    return success(message="删除成功")
```

**Step 2: 更新 main.py 注册路由**

```python
# 添加导入
from app.modules.project.routes import router as project_router

# 注册路由
app.include_router(project_router, prefix="/api/v1")
```

**Step 3: 验证路由**

Run: `cd backend && timeout 5 uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 2>&1 || true`
Expected: Server starts with routes registered

**Step 4: Commit**

```bash
git add backend/app/modules/project/routes.py backend/app/main.py
git commit -m "feat(backend): add project routes with CRUD endpoints"
```

---

## Task 5: 数据库配置服务层

**Files:**
- Create: `backend/app/modules/project/database_schemas.py`
- Create: `backend/app/modules/project/database_service.py`

**Step 1: 创建 database_schemas.py**

```python
# backend/app/modules/project/database_schemas.py
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional, List


class DatabaseConfigCreate(BaseModel):
    """创建数据库配置请求"""
    name: str = Field(..., min_length=1, max_length=255)
    reference_var: str = Field(..., min_length=1, max_length=100)
    db_type: str = Field(..., pattern="^(MySQL|PostgreSQL)$")
    host: str = Field(..., min_length=1, max_length=255)
    port: int = Field(..., ge=1, le=65535)
    database: str = Field(..., min_length=1, max_length=255)
    username: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=255)


class DatabaseConfigUpdate(BaseModel):
    """更新数据库配置请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    reference_var: Optional[str] = Field(None, min_length=1, max_length=100)
    db_type: Optional[str] = Field(None, pattern="^(MySQL|PostgreSQL)$")
    host: Optional[str] = Field(None, min_length=1, max_length=255)
    port: Optional[int] = Field(None, ge=1, le=65535)
    database: Optional[str] = Field(None, min_length=1, max_length=255)
    username: Optional[str] = Field(None, min_length=1, max_length=255)
    password: Optional[str] = Field(None, min_length=1, max_length=255)
    is_enabled: Optional[bool] = None


class DatabaseConfigResponse(BaseModel):
    """数据库配置响应"""
    id: UUID
    project_id: UUID
    name: str
    reference_var: str
    db_type: str
    host: str
    port: int
    database: str
    username: str
    password: str  # 前端应显示为 ******
    connection_status: str
    is_enabled: bool
    last_check_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ConnectionTestResult(BaseModel):
    """连接测试结果"""
    success: bool
    message: str
    tested_at: datetime
```

**Step 2: 创建 database_service.py**

```python
# backend/app/modules/project/database_service.py
import asyncio
from datetime import datetime
from typing import List
import asyncpg
import aiomysql
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, BadRequestError
from app.models_new.database_config import DatabaseConfig
from app.modules.project.database_schemas import (
    DatabaseConfigCreate,
    DatabaseConfigUpdate,
    DatabaseConfigResponse,
    ConnectionTestResult,
)


class DatabaseConfigService:
    """数据库配置服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_by_project(self, project_id: str) -> List[DatabaseConfig]:
        """获取项目的所有数据库配置"""
        result = await self.session.execute(
            select(DatabaseConfig)
            .where(DatabaseConfig.project_id == project_id)
            .order_by(DatabaseConfig.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, db_config_id: str) -> DatabaseConfig:
        """获取数据库配置详情"""
        result = await self.session.execute(
            select(DatabaseConfig).where(DatabaseConfig.id == db_config_id)
        )
        config = result.scalar_one_or_none()

        if not config:
            raise NotFoundError("数据库配置不存在")

        return config

    async def create(
        self, project_id: str, data: DatabaseConfigCreate
    ) -> DatabaseConfig:
        """创建数据库配置"""
        # 检查引用变量是否重复
        result = await self.session.execute(
            select(DatabaseConfig).where(
                DatabaseConfig.project_id == project_id,
                DatabaseConfig.reference_var == data.reference_var,
            )
        )
        if result.scalar_one_or_none():
            raise BadRequestError(f"引用变量 '{data.reference_var}' 已存在")

        config = DatabaseConfig(
            project_id=project_id,
            name=data.name,
            reference_var=data.reference_var,
            db_type=data.db_type,
            host=data.host,
            port=data.port,
            database=data.database,
            username=data.username,
            password=data.password,  # TODO: 加密存储
            connection_status="unknown",
            is_enabled=True,
        )
        self.session.add(config)
        await self.session.commit()
        await self.session.refresh(config)

        return config

    async def update(
        self, db_config_id: str, data: DatabaseConfigUpdate
    ) -> DatabaseConfig:
        """更新数据库配置"""
        config = await self.get(db_config_id)

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(config, field, value)

        # 如果连接参数变更，重置连接状态
        connection_fields = {"host", "port", "database", "username", "password", "db_type"}
        if any(field in update_data for field in connection_fields):
            config.connection_status = "unknown"

        await self.session.commit()
        await self.session.refresh(config)

        return config

    async def delete(self, db_config_id: str) -> None:
        """删除数据库配置"""
        config = await self.get(db_config_id)
        await self.session.delete(config)
        await self.session.commit()

    async def test_connection(self, db_config_id: str) -> ConnectionTestResult:
        """测试数据库连接"""
        config = await self.get(db_config_id)

        try:
            if config.db_type == "PostgreSQL":
                conn = await asyncpg.connect(
                    host=config.host,
                    port=config.port,
                    database=config.database,
                    user=config.username,
                    password=config.password,
                    timeout=10,
                )
                await conn.close()
            elif config.db_type == "MySQL":
                conn = await aiomysql.connect(
                    host=config.host,
                    port=config.port,
                    db=config.database,
                    user=config.username,
                    password=config.password,
                    connect_timeout=10,
                )
                conn.close()
            else:
                raise BadRequestError(f"不支持的数据库类型: {config.db_type}")

            # 更新连接状态
            config.connection_status = "connected"
            config.last_check_at = datetime.utcnow()
            await self.session.commit()

            return ConnectionTestResult(
                success=True,
                message="连接成功",
                tested_at=datetime.utcnow(),
            )

        except Exception as e:
            # 更新连接状态
            config.connection_status = "failed"
            config.last_check_at = datetime.utcnow()
            await self.session.commit()

            return ConnectionTestResult(
                success=False,
                message=f"连接失败: {str(e)}",
                tested_at=datetime.utcnow(),
            )

    async def toggle_enabled(self, db_config_id: str) -> DatabaseConfig:
        """切换启用状态"""
        config = await self.get(db_config_id)
        config.is_enabled = not config.is_enabled
        await self.session.commit()
        await self.session.refresh(config)
        return config
```

**Step 3: 验证导入**

Run: `cd backend && uv run python -c "from app.modules.project.database_service import DatabaseConfigService; print('Database service OK')"`
Expected: Print "Database service OK"

**Step 4: Commit**

```bash
git add backend/app/modules/project/database_schemas.py backend/app/modules/project/database_service.py
git commit -m "feat(backend): add database config service with connection test"
```

---

## Task 6: 数据库配置路由

**Files:**
- Create: `backend/app/modules/project/database_routes.py`
- Modify: `backend/app/main.py` (注册路由)

**Step 1: 创建 database_routes.py**

```python
# backend/app/modules/project/database_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.response import success
from app.models_new.user import User
from app.modules.project import database_service, database_schemas
from app.modules.project.service import ProjectService

router = APIRouter(prefix="/projects/{project_id}/databases", tags=["数据库配置"])


async def verify_project_access(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """验证项目访问权限"""
    project_service = ProjectService(session)
    await project_service.get_project(project_id)
    return project_id


@router.get("", response_model=List[database_schemas.DatabaseConfigResponse])
async def list_databases(
    project_id: str = Depends(verify_project_access),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取项目的数据库配置列表"""
    db_service = database_service.DatabaseConfigService(session)
    configs = await db_service.list_by_project(project_id)
    return success(data=[
        database_schemas.DatabaseConfigResponse.model_validate(c)
        for c in configs
    ])


@router.post("", response_model=database_schemas.DatabaseConfigResponse)
async def create_database(
    data: database_schemas.DatabaseConfigCreate,
    project_id: str = Depends(verify_project_access),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """创建数据库配置"""
    db_service = database_service.DatabaseConfigService(session)
    config = await db_service.create(project_id, data)
    return success(
        data=database_schemas.DatabaseConfigResponse.model_validate(config),
        message="创建成功"
    )


@router.get("/{db_id}", response_model=database_schemas.DatabaseConfigResponse)
async def get_database(
    db_id: str,
    project_id: str = Depends(verify_project_access),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """获取数据库配置详情"""
    db_service = database_service.DatabaseConfigService(session)
    config = await db_service.get(db_id)
    return success(data=database_schemas.DatabaseConfigResponse.model_validate(config))


@router.put("/{db_id}", response_model=database_schemas.DatabaseConfigResponse)
async def update_database(
    db_id: str,
    data: database_schemas.DatabaseConfigUpdate,
    project_id: str = Depends(verify_project_access),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """更新数据库配置"""
    db_service = database_service.DatabaseConfigService(session)
    config = await db_service.update(db_id, data)
    return success(
        data=database_schemas.DatabaseConfigResponse.model_validate(config),
        message="更新成功"
    )


@router.delete("/{db_id}")
async def delete_database(
    db_id: str,
    project_id: str = Depends(verify_project_access),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """删除数据库配置"""
    db_service = database_service.DatabaseConfigService(session)
    await db_service.delete(db_id)
    return success(message="删除成功")


@router.post("/{db_id}/test", response_model=database_schemas.ConnectionTestResult)
async def test_connection(
    db_id: str,
    project_id: str = Depends(verify_project_access),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """测试数据库连接"""
    db_service = database_service.DatabaseConfigService(session)
    result = await db_service.test_connection(db_id)
    return success(data=result)


@router.post("/{db_id}/toggle", response_model=database_schemas.DatabaseConfigResponse)
async def toggle_database(
    db_id: str,
    project_id: str = Depends(verify_project_access),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """切换数据库配置启用状态"""
    db_service = database_service.DatabaseConfigService(session)
    config = await db_service.toggle_enabled(db_id)
    return success(
        data=database_schemas.DatabaseConfigResponse.model_validate(config)
    )
```

**Step 2: 更新 main.py 注册路由**

```python
# 添加导入
from app.modules.project.database_routes import router as database_router

# 注册路由
app.include_router(database_router, prefix="/api/v1")
```

**Step 3: Commit**

```bash
git add backend/app/modules/project/database_routes.py backend/app/main.py
git commit -m "feat(backend): add database config routes with connection test"
```

---

## Task 7: 前端认证页面

**Files:**
- Create: `frontend/src/features/auth/components/LoginPage.tsx`
- Create: `frontend/src/features/auth/components/RegisterForm.tsx`
- Create: `frontend/src/features/auth/api.ts`

**Step 1: 创建 api.ts**

```typescript
// frontend/src/features/auth/api.ts
import { post, get } from '@/lib/api-client'
import type { User } from '@/stores/authStore'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface PasswordChangeRequest {
  old_password: string
  new_password: string
}

export const authApi = {
  login: (data: LoginRequest) =>
    post<TokenResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    post<User>('/auth/register', data),

  getMe: () =>
    get<User>('/auth/me'),

  logout: () =>
    post<void>('/auth/logout'),

  changePassword: (data: PasswordChangeRequest) =>
    post<void>('/auth/change-password', data),
}
```

**Step 2: 创建 LoginPage.tsx**

```typescript
// frontend/src/features/auth/components/LoginPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '../api'
import { Loader2 } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const loginMutation = useMutation({
    mutationFn: () => authApi.login({ email, password }),
    onSuccess: (data) => {
      login(data.user, data.access_token)
      navigate('/')
    },
    onError: (err: Error) => {
      setError(err.message || '登录失败')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    loginMutation.mutate()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Sisyphus-X</CardTitle>
          <CardDescription>自动化测试管理平台</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">邮箱</label>
              <Input
                type="email"
                placeholder="请输入邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-md"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">密码</label>
              <Input
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-md"
              />
            </div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full rounded-md"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              登录
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add frontend/src/features/auth/
git commit -m "feat(frontend): add login page with auth API"
```

---

## Task 8: 前端项目列表页面

**Files:**
- Create: `frontend/src/features/project/api.ts`
- Create: `frontend/src/features/project/types.ts`
- Create: `frontend/src/features/project/components/ProjectList.tsx`
- Create: `frontend/src/features/project/components/ProjectForm.tsx`

**Step 1: 创建 types.ts**

```typescript
// frontend/src/features/project/types.ts
export interface Project {
  id: string
  name: string
  description?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ProjectCreate {
  name: string
  description?: string
}

export interface ProjectUpdate {
  name?: string
  description?: string
}

export interface PagedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
```

**Step 2: 创建 api.ts**

```typescript
// frontend/src/features/project/api.ts
import { get, post, put, del } from '@/lib/api-client'
import type { Project, ProjectCreate, ProjectUpdate, PagedResponse } from './types'

export const projectApi = {
  list: (params?: { search?: string; page?: number; page_size?: number }) =>
    get<PagedResponse<Project>>('/projects', params),

  get: (id: string) =>
    get<Project>(`/projects/${id}`),

  create: (data: ProjectCreate) =>
    post<Project>('/projects', data),

  update: (id: string, data: ProjectUpdate) =>
    put<Project>(`/projects/${id}`, data),

  delete: (id: string) =>
    del<void>(`/projects/${id}`),
}
```

**Step 3: 创建 ProjectList.tsx**

```typescript
// frontend/src/features/project/components/ProjectList.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, Edit, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { projectApi } from '../api'
import type { Project } from '../types'
import { ProjectForm } from './ProjectForm'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useToast } from '@/hooks/useToast'

export function ProjectList() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, page }],
    queryFn: () => projectApi.list({ search, page }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('删除成功')
      setDeleteId(null)
    },
    onError: (err: Error) => {
      toast.error(err.message || '删除失败')
    },
  })

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeleteId(id)
  }

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>项目管理</CardTitle>
              <CardDescription>管理测试项目和数据库配置</CardDescription>
            </div>
            <Button onClick={() => { setEditingProject(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              新建项目
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 搜索框 */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索项目名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-md"
              />
            </div>
          </div>

          {/* 项目列表 */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>项目名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.description || '-'}</TableCell>
                    <TableCell>
                      {new Date(project.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {/* TODO: 跳转数据库配置 */}}
                          title="数据库配置"
                        >
                          <Database className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(project)}
                          title="编辑"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(project.id)}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      暂无项目
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 项目表单弹窗 */}
      <ProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editingProject}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="确认删除"
        description="确定要删除此项目吗？删除后将无法恢复。"
        variant="destructive"
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
```

**Step 4: 创建 ProjectForm.tsx**

```typescript
// frontend/src/features/project/components/ProjectForm.tsx
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { projectApi } from '../api'
import type { Project, ProjectCreate, ProjectUpdate } from '../types'
import { useToast } from '@/hooks/useToast'

interface ProjectFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
}

export function ProjectForm({ open, onOpenChange, project }: ProjectFormProps) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const { register, handleSubmit, reset } = useForm<ProjectCreate | ProjectUpdate>()

  useEffect(() => {
    if (project) {
      reset({ name: project.name, description: project.description })
    } else {
      reset({ name: '', description: '' })
    }
  }, [project, reset])

  const createMutation = useMutation({
    mutationFn: (data: ProjectCreate) => projectApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('创建成功')
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || '创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: ProjectUpdate) => projectApi.update(project!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('更新成功')
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || '更新失败')
    },
  })

  const onSubmit = (data: ProjectCreate | ProjectUpdate) => {
    if (project) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data as ProjectCreate)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg">
        <DialogHeader>
          <DialogTitle>{project ? '编辑项目' : '新建项目'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">项目名称 *</label>
            <Input
              {...register('name', { required: true })}
              placeholder="请输入项目名称"
              className="rounded-md"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">项目描述</label>
            <Input
              {...register('description')}
              placeholder="请输入项目描述"
              className="rounded-md"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-md"
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading} className="rounded-md">
              {isLoading ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 5: Commit**

```bash
git add frontend/src/features/project/
git commit -m "feat(frontend): add project list and form components"
```

---

## Task 9: 集成测试与验证

**Step 1: 启动后端服务**

Run: `cd backend && timeout 10 uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 2>&1 || true`

**Step 2: 测试认证 API**

```bash
# 注册
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"test123456"}'

# 登录
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'
```

**Step 3: 测试项目 API**

```bash
# 创建项目 (需要 token)
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Test Project","description":"测试项目"}'

# 获取项目列表
curl http://localhost:8000/api/v1/projects \
  -H "Authorization: Bearer <token>"
```

**Step 4: 运行后端测试**

Run: `cd backend && uv run pytest ../tests/unit -v -k "auth or project" --tb=short 2>&1 | head -50`

**Step 5: 最终 Commit**

```bash
git add -A
git status
git diff --quiet || git commit -m "feat: complete Phase 2 auth and project management"
```

---

## Phase 2 完成检查清单

- [ ] 后端认证服务层 (JWT, 密码哈希)
- [ ] 后端认证路由 (登录、注册、登出)
- [ ] 项目管理服务层 (CRUD)
- [ ] 项目管理路由 (CRUD)
- [ ] 数据库配置服务层 (连接测试)
- [ ] 数据库配置路由 (CRUD, 测试连接)
- [ ] 前端认证页面 (登录)
- [ ] 前端项目列表页面 (列表、表单)
- [ ] 集成测试验证

---

> **文档结束** — Phase 2: 认证与项目管理实施计划
