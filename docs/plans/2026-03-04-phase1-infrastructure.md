# Phase 1: 基础设施 (Infrastructure) 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 搭建项目的核心基础设施，包括后端模块化架构、前端 Feature-based 结构、数据库模型、中间件配置。

**Architecture:** 模块化 Monolith 架构。后端按业务域划分模块 (project, interface, scenario, plan, execution, report, keyword, setting)。前端采用 Feature-based 结构。数据库使用 SQLAlchemy 2.0 async 模型。中间件包括 Celery + Redis 用于后台任务，MinIO 用于文件存储。

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (async), Alembic, Celery, Redis, MinIO, React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Zustand, React Query

---

## 前置条件

- Python 3.12+ 已安装
- Node.js 18+ 已安装
- Docker 和 Docker Compose 已安装
- uv 已安装 (Python 包管理器)

---

## Task 1: 后端模块化目录结构

**Files:**
- Create: `backend/app/modules/__init__.py`
- Create: `backend/app/modules/project/__init__.py`
- Create: `backend/app/modules/interface/__init__.py`
- Create: `backend/app/modules/scenario/__init__.py`
- Create: `backend/app/modules/plan/__init__.py`
- Create: `backend/app/modules/execution/__init__.py`
- Create: `backend/app/modules/report/__init__.py`
- Create: `backend/app/modules/keyword/__init__.py`
- Create: `backend/app/modules/setting/__init__.py`
- Create: `backend/app/modules/auth/__init__.py`

**Step 1: 创建模块目录结构**

```bash
mkdir -p backend/app/modules/{project,interface,scenario,plan,execution,report,keyword,setting,auth}
```

**Step 2: 创建 __init__.py 文件**

```bash
touch backend/app/modules/__init__.py
touch backend/app/modules/project/__init__.py
touch backend/app/modules/interface/__init__.py
touch backend/app/modules/scenario/__init__.py
touch backend/app/modules/plan/__init__.py
touch backend/app/modules/execution/__init__.py
touch backend/app/modules/report/__init__.py
touch backend/app/modules/keyword/__init__.py
touch backend/app/modules/setting/__init__.py
touch backend/app/modules/auth/__init__.py
```

**Step 3: 验证目录结构**

Run: `ls -la backend/app/modules/`
Expected: 看到 9 个模块目录 + __init__.py

**Step 4: Commit**

```bash
git add backend/app/modules/
git commit -m "feat(backend): create modular directory structure"
```

---

## Task 2: 后端核心配置模块

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/core/db.py`
- Create: `backend/app/core/celery_app.py`
- Create: `backend/app/core/redis.py`
- Create: `backend/app/core/response.py`

**Step 1: 更新配置文件**

读取现有 `backend/app/core/config.py`，添加 Celery 和 Redis 配置：

```python
# backend/app/core/config.py
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """应用配置"""

    # 基础配置
    APP_NAME: str = "Sisyphus-X"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # 数据库配置
    DATABASE_URL: str = "sqlite+aiosqlite:///./sisyphus.db"

    # 安全配置
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 天
    AUTH_DISABLED: bool = False  # 开发模式下设为 True

    # Redis 配置
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery 配置
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # MinIO 配置
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_SECURE: bool = False

    # CORS 配置
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
```

**Step 2: 创建 Celery 应用配置**

```python
# backend/app/core/celery_app.py
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "sisyphus",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.modules.execution.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 分钟超时
    task_soft_time_limit=25 * 60,  # 25 分钟软超时
)
```

**Step 3: 创建 Redis 连接管理**

```python
# backend/app/core/redis.py
import redis.asyncio as redis
from typing import Optional
from app.core.config import settings

redis_client: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    """获取 Redis 客户端"""
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
    return redis_client


async def close_redis():
    """关闭 Redis 连接"""
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None
```

**Step 4: 创建统一响应格式**

```python
# backend/app/core/response.py
from typing import Generic, TypeVar, Optional, List
from pydantic import BaseModel

T = TypeVar('T')


class ApiResponse(BaseModel, Generic[T]):
    """统一 API 响应格式"""
    code: int = 0
    message: str = "success"
    data: Optional[T] = None


class PagedData(BaseModel, Generic[T]):
    """分页数据格式"""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class PagedResponse(BaseModel, Generic[T]):
    """分页响应格式"""
    code: int = 0
    message: str = "success"
    data: PagedData[T]


def success(data=None, message: str = "success") -> dict:
    """成功响应快捷方法"""
    return {"code": 0, "message": message, "data": data}


def error(code: int = 400, message: str = "error", detail: str = None) -> dict:
    """错误响应快捷方法"""
    return {"code": code, "message": message, "detail": detail}
```

**Step 5: 验证配置**

Run: `cd backend && uv run python -c "from app.core.config import settings; print(settings.model_dump())"`
Expected: 打印配置信息，无报错

**Step 6: Commit**

```bash
git add backend/app/core/
git commit -m "feat(backend): add core configuration for celery, redis, and response"
```

---

## Task 3: 数据库模型 - 用户与项目

**Files:**
- Create: `backend/app/models_new/__init__.py`
- Create: `backend/app/models_new/user.py`
- Create: `backend/app/models_new/project.py`
- Create: `backend/app/models_new/database_config.py`

> 注意: 使用 models_new 目录避免与现有模型冲突，完成后再替换

**Step 1: 创建用户模型**

```python
# backend/app/models_new/user.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.db import Base


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    projects = relationship("Project", back_populates="created_by_user")
    executions = relationship("Execution", back_populates="created_by_user")

    def __repr__(self):
        return f"<User {self.email}>"
```

**Step 2: 创建项目模型**

```python
# backend/app/models_new/project.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.db import Base


class Project(Base):
    """项目表"""
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    created_by_user = relationship("User", back_populates="projects")
    database_configs = relationship("DatabaseConfig", back_populates="project", cascade="all, delete-orphan")
    environments = relationship("Environment", back_populates="project", cascade="all, delete-orphan")
    global_variables = relationship("GlobalVariable", back_populates="project", cascade="all, delete-orphan")
    interface_folders = relationship("InterfaceFolder", back_populates="project", cascade="all, delete-orphan")
    interfaces = relationship("Interface", back_populates="project", cascade="all, delete-orphan")
    scenarios = relationship("Scenario", back_populates="project", cascade="all, delete-orphan")
    test_plans = relationship("TestPlan", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Project {self.name}>"
```

**Step 3: 创建数据库配置模型**

```python
# backend/app/models_new/database_config.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.db import Base


class DatabaseConfig(Base):
    """数据库配置表"""
    __tablename__ = "database_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)  # 连接名称
    reference_var = Column(String(100), nullable=False)  # 引用变量
    db_type = Column(String(50), nullable=False)  # MySQL / PostgreSQL
    host = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False)
    database = Column(String(255), nullable=False)
    username = Column(String(255), nullable=False)
    password = Column(String(255), nullable=False)  # 加密存储
    connection_status = Column(String(50), default="unknown")  # unknown/connected/failed
    is_enabled = Column(Boolean, default=True)
    last_check_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    project = relationship("Project", back_populates="database_configs")

    def __repr__(self):
        return f"<DatabaseConfig {self.name}>"
```

**Step 4: 创建 __init__.py 导出所有模型**

```python
# backend/app/models_new/__init__.py
from app.models_new.user import User
from app.models_new.project import Project
from app.models_new.database_config import DatabaseConfig

__all__ = ["User", "Project", "DatabaseConfig"]
```

**Step 5: 验证模型导入**

Run: `cd backend && uv run python -c "from app.models_new import User, Project, DatabaseConfig; print('Models imported successfully')"`
Expected: 打印 "Models imported successfully"

**Step 6: Commit**

```bash
git add backend/app/models_new/
git commit -m "feat(backend): add user, project, and database_config models"
```

---

## Task 4: 数据库模型 - 环境管理

**Files:**
- Create: `backend/app/models_new/environment.py`
- Modify: `backend/app/models_new/__init__.py`

**Step 1: 创建环境管理模型**

```python
# backend/app/models_new/environment.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.db import Base


class Environment(Base):
    """环境表"""
    __tablename__ = "environments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    base_url = Column(String(500), nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    project = relationship("Project", back_populates="environments")
    variables = relationship("EnvironmentVariable", back_populates="environment", cascade="all, delete-orphan")
    executions = relationship("Execution", back_populates="environment")

    def __repr__(self):
        return f"<Environment {self.name}>"


class EnvironmentVariable(Base):
    """环境变量表"""
    __tablename__ = "environment_variables"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    environment_id = Column(UUID(as_uuid=True), ForeignKey("environments.id", ondelete="CASCADE"), nullable=False)
    key = Column(String(255), nullable=False)
    value = Column(Text, nullable=True)
    description = Column(Text, nullable=True)

    # 关系
    environment = relationship("Environment", back_populates="variables")

    def __repr__(self):
        return f"<EnvironmentVariable {self.key}>"


class GlobalVariable(Base):
    """全局变量表"""
    __tablename__ = "global_variables"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    key = Column(String(255), nullable=False)
    value = Column(Text, nullable=True)
    description = Column(Text, nullable=True)

    # 关系
    project = relationship("Project", back_populates="global_variables")

    def __repr__(self):
        return f"<GlobalVariable {self.key}>"
```

**Step 2: 更新 __init__.py**

```python
# backend/app/models_new/__init__.py
from app.models_new.user import User
from app.models_new.project import Project
from app.models_new.database_config import DatabaseConfig
from app.models_new.environment import Environment, EnvironmentVariable, GlobalVariable

__all__ = [
    "User",
    "Project",
    "DatabaseConfig",
    "Environment",
    "EnvironmentVariable",
    "GlobalVariable",
]
```

**Step 3: 验证模型导入**

Run: `cd backend && uv run python -c "from app.models_new import Environment, EnvironmentVariable, GlobalVariable; print('Environment models imported successfully')"`
Expected: 打印成功信息

**Step 4: Commit**

```bash
git add backend/app/models_new/
git commit -m "feat(backend): add environment, environment_variable, and global_variable models"
```

---

## Task 5: 数据库模型 - 接口定义

**Files:**
- Create: `backend/app/models_new/interface.py`
- Modify: `backend/app/models_new/__init__.py`

**Step 1: 创建接口定义模型**

```python
# backend/app/models_new/interface.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.db import Base


class InterfaceFolder(Base):
    """接口目录表"""
    __tablename__ = "interface_folders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("interface_folders.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    project = relationship("Project", back_populates="interface_folders")
    parent = relationship("InterfaceFolder", remote_side=[id], backref="children")
    interfaces = relationship("Interface", back_populates="folder")

    def __repr__(self):
        return f"<InterfaceFolder {self.name}>"


class Interface(Base):
    """接口表"""
    __tablename__ = "interfaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    folder_id = Column(UUID(as_uuid=True), ForeignKey("interface_folders.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)  # GET/POST/PUT/DELETE/PATCH
    path = Column(String(500), nullable=False)
    headers = Column(JSONB, nullable=True, default=dict)
    params = Column(JSONB, nullable=True, default=dict)
    body = Column(JSONB, nullable=True, default=dict)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    project = relationship("Project", back_populates="interfaces")
    folder = relationship("InterfaceFolder", back_populates="interfaces")

    def __repr__(self):
        return f"<Interface {self.method} {self.path}>"
```

**Step 2: 更新 __init__.py**

```python
# backend/app/models_new/__init__.py
from app.models_new.user import User
from app.models_new.project import Project
from app.models_new.database_config import DatabaseConfig
from app.models_new.environment import Environment, EnvironmentVariable, GlobalVariable
from app.models_new.interface import InterfaceFolder, Interface

__all__ = [
    "User",
    "Project",
    "DatabaseConfig",
    "Environment",
    "EnvironmentVariable",
    "GlobalVariable",
    "InterfaceFolder",
    "Interface",
]
```

**Step 3: 验证模型导入**

Run: `cd backend && uv run python -c "from app.models_new import InterfaceFolder, Interface; print('Interface models imported successfully')"`
Expected: 打印成功信息

**Step 4: Commit**

```bash
git add backend/app/models_new/
git commit -m "feat(backend): add interface_folder and interface models"
```

---

## Task 6: 数据库模型 - 场景编排

**Files:**
- Create: `backend/app/models_new/scenario.py`
- Modify: `backend/app/models_new/__init__.py`

**Step 1: 创建场景编排模型**

```python
# backend/app/models_new/scenario.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.db import Base


class Scenario(Base):
    """场景表"""
    __tablename__ = "scenarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(10), default="P2")  # P0/P1/P2/P3
    tags = Column(JSONB, default=list)
    variables = Column(JSONB, default=dict)
    pre_sql = Column(Text, nullable=True)
    post_sql = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    project = relationship("Project", back_populates="scenarios")
    steps = relationship("ScenarioStep", back_populates="scenario", cascade="all, delete-orphan", order_by="ScenarioStep.sort_order")
    datasets = relationship("TestDataset", back_populates="scenario", cascade="all, delete-orphan")
    plan_scenarios = relationship("PlanScenario", back_populates="scenario")

    def __repr__(self):
        return f"<Scenario {self.name}>"


class ScenarioStep(Base):
    """场景步骤表"""
    __tablename__ = "scenario_steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    keyword_type = Column(String(100), nullable=False)
    keyword_method = Column(String(100), nullable=False)
    config = Column(JSONB, default=dict)  # 关键字参数
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    scenario = relationship("Scenario", back_populates="steps")

    def __repr__(self):
        return f"<ScenarioStep {self.name}>"


class TestDataset(Base):
    """测试数据集表"""
    __tablename__ = "test_datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    headers = Column(JSONB, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    scenario = relationship("Scenario", back_populates="datasets")
    rows = relationship("DatasetRow", back_populates="dataset", cascade="all, delete-orphan", order_by="DatasetRow.sort_order")
    plan_scenarios = relationship("PlanScenario", back_populates="dataset")

    def __repr__(self):
        return f"<TestDataset {self.name}>"


class DatasetRow(Base):
    """数据集行表"""
    __tablename__ = "dataset_rows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("test_datasets.id", ondelete="CASCADE"), nullable=False)
    row_data = Column(JSONB, default=dict)
    sort_order = Column(Integer, default=0)

    # 关系
    dataset = relationship("TestDataset", back_populates="rows")

    def __repr__(self):
        return f"<DatasetRow {self.id}>"
```

**Step 2: 更新 __init__.py**

```python
# backend/app/models_new/__init__.py
from app.models_new.user import User
from app.models_new.project import Project
from app.models_new.database_config import DatabaseConfig
from app.models_new.environment import Environment, EnvironmentVariable, GlobalVariable
from app.models_new.interface import InterfaceFolder, Interface
from app.models_new.scenario import Scenario, ScenarioStep, TestDataset, DatasetRow

__all__ = [
    "User",
    "Project",
    "DatabaseConfig",
    "Environment",
    "EnvironmentVariable",
    "GlobalVariable",
    "InterfaceFolder",
    "Interface",
    "Scenario",
    "ScenarioStep",
    "TestDataset",
    "DatasetRow",
]
```

**Step 3: 验证模型导入**

Run: `cd backend && uv run python -c "from app.models_new import Scenario, ScenarioStep, TestDataset, DatasetRow; print('Scenario models imported successfully')"`
Expected: 打印成功信息

**Step 4: Commit**

```bash
git add backend/app/models_new/
git commit -m "feat(backend): add scenario, scenario_step, test_dataset, and dataset_row models"
```

---

## Task 7: 数据库模型 - 测试计划

**Files:**
- Create: `backend/app/models_new/plan.py`
- Modify: `backend/app/models_new/__init__.py`

**Step 1: 创建测试计划模型**

```python
# backend/app/models_new/plan.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.db import Base


class TestPlan(Base):
    """测试计划表"""
    __tablename__ = "test_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    project = relationship("Project", back_populates="test_plans")
    plan_scenarios = relationship("PlanScenario", back_populates="plan", cascade="all, delete-orphan", order_by="PlanScenario.sort_order")
    executions = relationship("Execution", back_populates="plan")

    def __repr__(self):
        return f"<TestPlan {self.name}>"


class PlanScenario(Base):
    """计划-场景关联表"""
    __tablename__ = "plan_scenarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("test_plans.id", ondelete="CASCADE"), nullable=False)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("test_datasets.id", ondelete="SET NULL"), nullable=True)
    variables_override = Column(JSONB, default=dict)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    plan = relationship("TestPlan", back_populates="plan_scenarios")
    scenario = relationship("Scenario", back_populates="plan_scenarios")
    dataset = relationship("TestDataset", back_populates="plan_scenarios")

    def __repr__(self):
        return f"<PlanScenario plan={self.plan_id} scenario={self.scenario_id}>"
```

**Step 2: 更新 __init__.py**

```python
# backend/app/models_new/__init__.py
from app.models_new.user import User
from app.models_new.project import Project
from app.models_new.database_config import DatabaseConfig
from app.models_new.environment import Environment, EnvironmentVariable, GlobalVariable
from app.models_new.interface import InterfaceFolder, Interface
from app.models_new.scenario import Scenario, ScenarioStep, TestDataset, DatasetRow
from app.models_new.plan import TestPlan, PlanScenario

__all__ = [
    "User",
    "Project",
    "DatabaseConfig",
    "Environment",
    "EnvironmentVariable",
    "GlobalVariable",
    "InterfaceFolder",
    "Interface",
    "Scenario",
    "ScenarioStep",
    "TestDataset",
    "DatasetRow",
    "TestPlan",
    "PlanScenario",
]
```

**Step 3: 验证模型导入**

Run: `cd backend && uv run python -c "from app.models_new import TestPlan, PlanScenario; print('Plan models imported successfully')"`
Expected: 打印成功信息

**Step 4: Commit**

```bash
git add backend/app/models_new/
git commit -m "feat(backend): add test_plan and plan_scenario models"
```

---

## Task 8: 数据库模型 - 执行与报告

**Files:**
- Create: `backend/app/models_new/execution.py`
- Modify: `backend/app/models_new/__init__.py`

**Step 1: 创建执行与报告模型**

```python
# backend/app/models_new/execution.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.db import Base


class Execution(Base):
    """执行记录表"""
    __tablename__ = "executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("test_plans.id", ondelete="SET NULL"), nullable=True)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey("scenarios.id", ondelete="SET NULL"), nullable=True)
    environment_id = Column(UUID(as_uuid=True), ForeignKey("environments.id"), nullable=True)
    status = Column(String(50), default="pending")  # pending/running/completed/failed/cancelled/paused
    celery_task_id = Column(String(255), nullable=True)
    total_scenarios = Column(Integer, default=0)
    passed_scenarios = Column(Integer, default=0)
    failed_scenarios = Column(Integer, default=0)
    skipped_scenarios = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    plan = relationship("TestPlan", back_populates="executions")
    environment = relationship("Environment", back_populates="executions")
    created_by_user = relationship("User", back_populates="executions")
    steps = relationship("ExecutionStep", back_populates="execution", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="execution", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Execution {self.id} status={self.status}>"


class ExecutionStep(Base):
    """执行步骤详情表"""
    __tablename__ = "execution_steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("executions.id", ondelete="CASCADE"), nullable=False)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey("scenarios.id"), nullable=True)
    step_name = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)  # passed/failed/skipped
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    request_data = Column(JSONB, nullable=True)
    response_data = Column(JSONB, nullable=True)
    assertions = Column(JSONB, nullable=True)
    error_message = Column(Text, nullable=True)

    # 关系
    execution = relationship("Execution", back_populates="steps")

    def __repr__(self):
        return f"<ExecutionStep {self.step_name} status={self.status}>"


class Report(Base):
    """报告表"""
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("executions.id", ondelete="CASCADE"), nullable=False, unique=True)
    report_type = Column(String(50), default="platform")  # platform/allure
    storage_path = Column(String(500), nullable=True)
    expires_at = Column(DateTime, nullable=True)  # 默认 30 天后过期
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    execution = relationship("Execution", back_populates="report")

    def __repr__(self):
        return f"<Report {self.id} type={self.report_type}>"
```

**Step 2: 更新 __init__.py**

```python
# backend/app/models_new/__init__.py
from app.models_new.user import User
from app.models_new.project import Project
from app.models_new.database_config import DatabaseConfig
from app.models_new.environment import Environment, EnvironmentVariable, GlobalVariable
from app.models_new.interface import InterfaceFolder, Interface
from app.models_new.scenario import Scenario, ScenarioStep, TestDataset, DatasetRow
from app.models_new.plan import TestPlan, PlanScenario
from app.models_new.execution import Execution, ExecutionStep, Report

__all__ = [
    "User",
    "Project",
    "DatabaseConfig",
    "Environment",
    "EnvironmentVariable",
    "GlobalVariable",
    "InterfaceFolder",
    "Interface",
    "Scenario",
    "ScenarioStep",
    "TestDataset",
    "DatasetRow",
    "TestPlan",
    "PlanScenario",
    "Execution",
    "ExecutionStep",
    "Report",
]
```

**Step 3: 验证模型导入**

Run: `cd backend && uv run python -c "from app.models_new import Execution, ExecutionStep, Report; print('Execution models imported successfully')"`
Expected: 打印成功信息

**Step 4: Commit**

```bash
git add backend/app/models_new/
git commit -m "feat(backend): add execution, execution_step, and report models"
```

---

## Task 9: 数据库模型 - 关键字与全局参数

**Files:**
- Create: `backend/app/models_new/keyword.py`
- Create: `backend/app/models_new/setting.py`
- Modify: `backend/app/models_new/__init__.py`

**Step 1: 创建关键字模型**

```python
# backend/app/models_new/keyword.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.db import Base


class Keyword(Base):
    """关键字表"""
    __tablename__ = "keywords"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    keyword_type = Column(String(100), nullable=False)  # 发送请求/断言类型/提取变量/数据库操作/自定义操作
    name = Column(String(255), nullable=False)
    method_name = Column(String(100), nullable=False)
    code = Column(Text, nullable=True)  # Monaco 编辑器代码
    params_schema = Column(JSONB, default=dict)  # 参数 schema
    is_builtin = Column(Boolean, default=False)  # 内置关键字不可删除
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Keyword {self.name}>"
```

**Step 2: 创建全局参数模型**

```python
# backend/app/models_new/setting.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.db import Base


class GlobalParam(Base):
    """全局参数表"""
    __tablename__ = "global_params"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_name = Column(String(255), nullable=False)
    method_name = Column(String(255), nullable=False)
    code = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    input_params = Column(JSONB, default=list)  # [{name, type, description}]
    output_params = Column(JSONB, default=list)  # [{name, type, description}]
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<GlobalParam {self.class_name}.{self.method_name}>"
```

**Step 3: 更新 __init__.py**

```python
# backend/app/models_new/__init__.py
from app.models_new.user import User
from app.models_new.project import Project
from app.models_new.database_config import DatabaseConfig
from app.models_new.environment import Environment, EnvironmentVariable, GlobalVariable
from app.models_new.interface import InterfaceFolder, Interface
from app.models_new.scenario import Scenario, ScenarioStep, TestDataset, DatasetRow
from app.models_new.plan import TestPlan, PlanScenario
from app.models_new.execution import Execution, ExecutionStep, Report
from app.models_new.keyword import Keyword
from app.models_new.setting import GlobalParam

__all__ = [
    "User",
    "Project",
    "DatabaseConfig",
    "Environment",
    "EnvironmentVariable",
    "GlobalVariable",
    "InterfaceFolder",
    "Interface",
    "Scenario",
    "ScenarioStep",
    "TestDataset",
    "DatasetRow",
    "TestPlan",
    "PlanScenario",
    "Execution",
    "ExecutionStep",
    "Report",
    "Keyword",
    "GlobalParam",
]
```

**Step 4: 验证所有模型导入**

Run: `cd backend && uv run python -c "from app.models_new import *; print('All models imported successfully')"`
Expected: 打印成功信息

**Step 5: Commit**

```bash
git add backend/app/models_new/
git commit -m "feat(backend): add keyword and global_param models"
```

---

## Task 10: 更新数据库连接配置

**Files:**
- Modify: `backend/app/core/db.py`

**Step 1: 更新 db.py 以支持新模型**

```python
# backend/app/core/db.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# 创建异步引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)

# 创建异步会话工厂
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """SQLAlchemy 基类"""
    pass


async def get_session() -> AsyncSession:
    """获取数据库会话（依赖注入）"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """初始化数据库（创建所有表）"""
    async with engine.begin() as conn:
        # 导入所有模型以确保它们被注册
        from app.models_new import *  # noqa: F401, F403
        await conn.run_sync(Base.metadata.create_all)


async def drop_db():
    """删除所有表（仅用于测试）"""
    async with engine.begin() as conn:
        from app.models_new import *  # noqa: F401, F403
        await conn.run_sync(Base.metadata.drop_all)
```

**Step 2: 验证数据库连接**

Run: `cd backend && uv run python -c "from app.core.db import engine, Base; print('Database config OK')"`
Expected: 打印成功信息

**Step 3: Commit**

```bash
git add backend/app/core/db.py
git commit -m "feat(backend): update database config for new models"
```

---

## Task 11: 创建 Alembic 迁移

**Files:**
- Modify: `backend/alembic/env.py`
- Create: `backend/alembic/versions/xxx_initial_migration.py` (通过命令生成)

**Step 1: 更新 alembic/env.py**

```python
# backend/alembic/env.py
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# 导入配置
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.db import Base

# 导入所有模型
from app.models_new import *  # noqa: F401, F403

# this is the Alembic Config object
config = context.config

# 设置数据库 URL
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine and associate a connection with the context."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

**Step 2: 生成初始迁移文件**

Run: `cd backend && uv run alembic revision --autogenerate -m "initial migration for refactor"`
Expected: 生成迁移文件

**Step 3: 应用迁移**

Run: `cd backend && uv run alembic upgrade head`
Expected: 迁移成功，无报错

**Step 4: 验证表创建**

Run: `cd backend && uv run python -c "import asyncio; from app.core.db import engine; from sqlalchemy import text; async def check(): async with engine.connect() as conn: result = await conn.execute(text('SELECT name FROM sqlite_master WHERE type=\"table\"')); print([r[0] for r in result]); asyncio.run(check())"`
Expected: 打印所有表名

**Step 5: Commit**

```bash
git add backend/alembic/
git commit -m "feat(backend): create initial alembic migration for all models"
```

---

## Task 12: 创建种子数据脚本

**Files:**
- Create: `backend/app/core/seed_data.py`

**Step 1: 创建种子数据脚本**

```python
# backend/app/core/seed_data.py
"""
种子数据脚本 - 用于初始化测试数据
"""
import asyncio
import uuid
from datetime import datetime
from sqlalchemy import select
from app.core.db import AsyncSessionLocal, init_db
from app.models_new import (
    User, Project, Environment, GlobalVariable,
    Keyword, GlobalParam
)


# 默认测试用户 ID
DEFAULT_TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


async def seed_users(session):
    """创建默认测试用户"""
    result = await session.execute(select(User).where(User.id == DEFAULT_TEST_USER_ID))
    if result.scalar_one_or_none():
        print("Test user already exists")
        return

    user = User(
        id=DEFAULT_TEST_USER_ID,
        email="default-test-user@example.com",
        username="default_user",
        password_hash="$2b$12$test_hash_not_for_production",  # 开发环境用
        is_active=True,
    )
    session.add(user)
    print("Created default test user")


async def seed_projects(session):
    """创建测试项目"""
    result = await session.execute(select(Project).where(Project.name == "Demo Project"))
    if result.scalar_one_or_none():
        print("Demo project already exists")
        return

    project = Project(
        id=uuid.uuid4(),
        name="Demo Project",
        description="演示项目，用于测试系统功能",
        created_by=DEFAULT_TEST_USER_ID,
    )
    session.add(project)
    await session.flush()

    # 创建默认环境
    env = Environment(
        id=uuid.uuid4(),
        project_id=project.id,
        name="开发环境",
        base_url="http://localhost:8000",
        is_default=True,
    )
    session.add(env)

    # 创建全局变量
    global_var = GlobalVariable(
        id=uuid.uuid4(),
        project_id=project.id,
        key="base_url",
        value="http://localhost:8000",
        description="基础 URL",
    )
    session.add(global_var)

    print(f"Created demo project with environment and global variable")


async def seed_keywords(session):
    """创建内置关键字"""
    builtin_keywords = [
        {
            "keyword_type": "发送请求",
            "name": "HTTP 请求",
            "method_name": "http_request",
            "is_builtin": True,
            "params_schema": {
                "method": {"type": "select", "options": ["GET", "POST", "PUT", "DELETE", "PATCH"]},
                "url": {"type": "string"},
                "headers": {"type": "key_value"},
                "body": {"type": "json"},
            }
        },
        {
            "keyword_type": "断言类型",
            "name": "JSON 断言",
            "method_name": "assert_json",
            "is_builtin": True,
            "params_schema": {
                "expression": {"type": "string", "description": "JSONPath 表达式"},
                "operator": {"type": "select", "options": ["==", "!=", ">", "<", ">=", "<=", "contains"]},
                "expected": {"type": "string"},
            }
        },
        {
            "keyword_type": "提取变量",
            "name": "JSON 提取",
            "method_name": "extract_json",
            "is_builtin": True,
            "params_schema": {
                "variable_name": {"type": "string"},
                "variable_type": {"type": "select", "options": ["全局", "环境"]},
                "expression": {"type": "string", "description": "JSONPath 表达式"},
            }
        },
        {
            "keyword_type": "数据库操作",
            "name": "执行 SQL",
            "method_name": "execute_sql",
            "is_builtin": True,
            "params_schema": {
                "datasource": {"type": "select", "options": []},  # 动态加载
                "sql": {"type": "code", "language": "sql"},
            }
        },
    ]

    for kw_data in builtin_keywords:
        result = await session.execute(
            select(Keyword).where(Keyword.method_name == kw_data["method_name"])
        )
        if result.scalar_one_or_none():
            continue

        keyword = Keyword(
            id=uuid.uuid4(),
            **kw_data
        )
        session.add(keyword)
        print(f"Created keyword: {kw_data['name']}")


async def seed_global_params(session):
    """创建全局参数示例"""
    sample_code = '''
class Utils:
    """工具函数类"""

    @staticmethod
    def random_string(length: int = 10) -> str:
        """
        生成随机字符串

        Args:
            length: 字符串长度，默认 10

        Returns:
            str: 随机字符串
        """
        import random
        import string
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
'''

    result = await session.execute(
        select(GlobalParam).where(GlobalParam.method_name == "random_string")
    )
    if result.scalar_one_or_none():
        print("Sample global param already exists")
        return

    param = GlobalParam(
        id=uuid.uuid4(),
        class_name="Utils",
        method_name="random_string",
        code=sample_code,
        description="生成随机字符串",
        input_params=[{"name": "length", "type": "int", "description": "字符串长度，默认 10"}],
        output_params=[{"name": "result", "type": "str", "description": "随机字符串"}],
    )
    session.add(param)
    print("Created sample global param")


async def main():
    """主函数"""
    print("Starting seed data...")

    # 初始化数据库
    await init_db()

    async with AsyncSessionLocal() as session:
        try:
            await seed_users(session)
            await seed_projects(session)
            await seed_keywords(session)
            await seed_global_params(session)
            await session.commit()
            print("Seed data completed successfully!")
        except Exception as e:
            await session.rollback()
            print(f"Seed data failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
```

**Step 2: 运行种子数据脚本**

Run: `cd backend && uv run python -m app.core.seed_data`
Expected: 打印种子数据创建成功信息

**Step 3: Commit**

```bash
git add backend/app/core/seed_data.py
git commit -m "feat(backend): add seed data script for initial test data"
```

---

## Task 13: 更新 FastAPI 应用入口

**Files:**
- Modify: `backend/app/main.py`

**Step 1: 更新 main.py**

```python
# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.db import init_db
from app.core.redis import close_redis
from app.middleware.error_handler import register_exception_handlers


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    await init_db()
    print("Database initialized")

    yield

    # 关闭时
    print("Shutting down...")
    await close_redis()
    print("Redis connection closed")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册异常处理器
register_exception_handlers(app)


# 健康检查
@app.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}


# 注册路由 (后续添加)
# from app.modules.auth.routes import router as auth_router
# from app.modules.project.routes import router as project_router
# app.include_router(auth_router, prefix="/api/v1")
# app.include_router(project_router, prefix="/api/v1")
```

**Step 2: 验证应用启动**

Run: `cd backend && timeout 5 uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 || true`
Expected: 应用启动，打印 "Starting Sisyphus-X" 和 "Database initialized"

**Step 3: Commit**

```bash
git add backend/app/main.py
git commit -m "feat(backend): update main.py with lifespan and middleware"
```

---

## Task 14: 前端目录结构重构

**Files:**
- Create: `frontend/src/features/auth/`
- Create: `frontend/src/features/project/`
- Create: `frontend/src/features/interface/`
- Create: `frontend/src/features/scenario/`
- Create: `frontend/src/features/plan/`
- Create: `frontend/src/features/execution/`
- Create: `frontend/src/features/report/`
- Create: `frontend/src/features/keyword/`
- Create: `frontend/src/features/setting/`
- Create: `frontend/src/stores/`
- Create: `frontend/src/router/`

**Step 1: 创建 features 目录结构**

```bash
cd frontend/src
mkdir -p features/{auth,project,interface,scenario,plan,execution,report,keyword,setting}/{components,hooks}
mkdir -p stores router
```

**Step 2: 创建 feature 模块占位文件**

```bash
# 为每个 feature 创建 index.ts
for feature in auth project interface scenario plan execution report keyword setting; do
  echo "export {}" > features/$feature/index.ts
done

# 创建 types.ts 占位
for feature in auth project interface scenario plan execution report keyword setting; do
  echo "// $feature types" > features/$feature/types.ts
done

# 创建 api.ts 占位
for feature in auth project interface scenario plan execution report keyword setting; do
  echo "// $feature API client" > features/$feature/api.ts
done
```

**Step 3: 验证目录结构**

Run: `ls -la frontend/src/features/`
Expected: 看到 9 个 feature 目录

**Step 4: Commit**

```bash
git add frontend/src/features/ frontend/src/stores/ frontend/src/router/
git commit -m "feat(frontend): create feature-based directory structure"
```

---

## Task 15: 前端 Zustand Store 设置

**Files:**
- Create: `frontend/src/stores/authStore.ts`
- Create: `frontend/src/stores/projectStore.ts`
- Create: `frontend/src/stores/environmentStore.ts`
- Create: `frontend/src/stores/tabStore.ts`
- Create: `frontend/src/stores/index.ts`

**Step 1: 创建 authStore**

```typescript
// frontend/src/stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  username: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) =>
        set({ user, token, isAuthenticated: true }),
      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
      setUser: (user) =>
        set({ user }),
    }),
    {
      name: 'auth-storage',
    }
  )
)
```

**Step 2: 创建 projectStore**

```typescript
// frontend/src/stores/projectStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Project {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

interface ProjectState {
  currentProject: Project | null
  currentProjectId: string | null
  setProject: (project: Project) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      currentProject: null,
      currentProjectId: null,
      setProject: (project) =>
        set({
          currentProject: project,
          currentProjectId: project.id,
        }),
      clearProject: () =>
        set({
          currentProject: null,
          currentProjectId: null,
        }),
    }),
    {
      name: 'project-storage',
    }
  )
)
```

**Step 3: 创建 environmentStore**

```typescript
// frontend/src/stores/environmentStore.ts
import { create } from 'zustand'

export interface Environment {
  id: string
  project_id: string
  name: string
  base_url?: string
  is_default: boolean
}

interface EnvironmentState {
  currentEnvironment: Environment | null
  environments: Environment[]
  setEnvironments: (envs: Environment[]) => void
  setCurrentEnvironment: (env: Environment) => void
  clearEnvironments: () => void
}

export const useEnvironmentStore = create<EnvironmentState>((set) => ({
  currentEnvironment: null,
  environments: [],
  setEnvironments: (envs) => {
    set({ environments: envs })
    // 如果没有当前环境，设置第一个默认环境
    set((state) => ({
      currentEnvironment:
        state.currentEnvironment ||
        envs.find((e) => e.is_default) ||
        envs[0] ||
        null,
    }))
  },
  setCurrentEnvironment: (env) => set({ currentEnvironment: env }),
  clearEnvironments: () =>
    set({ currentEnvironment: null, environments: [] }),
}))
```

**Step 4: 创建 tabStore**

```typescript
// frontend/src/stores/tabStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Tab {
  key: string
  title: string
  path: string
  closable: boolean
  icon?: string
}

interface TabState {
  tabs: Tab[]
  activeKey: string
  addTab: (tab: Tab) => void
  removeTab: (key: string) => void
  setActiveKey: (key: string) => void
  closeOtherTabs: (key: string) => void
  closeAllTabs: () => void
}

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeKey: '',
      addTab: (tab) => {
        const { tabs } = get()
        const exists = tabs.some((t) => t.key === tab.key)
        if (!exists) {
          set({ tabs: [...tabs, tab] })
        }
        set({ activeKey: tab.key })
      },
      removeTab: (key) => {
        const { tabs, activeKey } = get()
        const newTabs = tabs.filter((t) => t.key !== key)
        set({ tabs: newTabs })

        // 如果关闭的是当前激活的 tab，切换到前一个
        if (activeKey === key && newTabs.length > 0) {
          const index = tabs.findIndex((t) => t.key === key)
          const newActiveKey = newTabs[Math.max(0, index - 1)]?.key || ''
          set({ activeKey: newActiveKey })
        }
      },
      setActiveKey: (key) => set({ activeKey: key }),
      closeOtherTabs: (key) => {
        const { tabs } = get()
        const tab = tabs.find((t) => t.key === key)
        if (tab && !tab.closable) {
          set({ tabs: [tab], activeKey: key })
        } else {
          const homeTab = tabs.find((t) => !t.closable)
          const targetTab = tabs.find((t) => t.key === key)
          const newTabs = homeTab ? [homeTab] : []
          if (targetTab && targetTab.key !== homeTab?.key) {
            newTabs.push(targetTab)
          }
          set({ tabs: newTabs, activeKey: key })
        }
      },
      closeAllTabs: () => {
        const { tabs } = get()
        const homeTab = tabs.find((t) => !t.closable)
        set({
          tabs: homeTab ? [homeTab] : [],
          activeKey: homeTab?.key || '',
        })
      },
    }),
    {
      name: 'tab-storage',
    }
  )
)
```

**Step 5: 创建 stores/index.ts 导出**

```typescript
// frontend/src/stores/index.ts
export { useAuthStore, type User } from './authStore'
export { useProjectStore, type Project } from './projectStore'
export { useEnvironmentStore, type Environment } from './environmentStore'
export { useTabStore, type Tab } from './tabStore'
```

**Step 6: 验证 stores 编译**

Run: `cd frontend && npm run build 2>&1 | head -20`
Expected: 编译成功或只有与未使用变量相关的警告

**Step 7: Commit**

```bash
git add frontend/src/stores/
git commit -m "feat(frontend): add Zustand stores for auth, project, environment, and tabs"
```

---

## Task 16: 前端 API Client 封装

**Files:**
- Create: `frontend/src/lib/api-client.ts`
- Modify: `frontend/src/lib/utils.ts` (如需要)

**Step 1: 创建 API Client**

```typescript
// frontend/src/lib/api-client.ts
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'

// API 响应格式
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface PagedResponse<T = unknown> {
  code: number
  message: string
  data: {
    items: T[]
    total: number
    page: number
    page_size: number
    total_pages: number
  }
}

export interface ApiError {
  code: number
  message: string
  detail?: string | unknown
}

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Token 过期，清除登录状态
      useAuthStore.getState().logout()
      // 跳转到登录页
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 通用请求方法
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<ApiResponse<T>>(config)
  if (response.data.code !== 0) {
    throw new Error(response.data.message)
  }
  return response.data.data
}

// GET 请求
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  return request<T>({ method: 'GET', url, params })
}

// POST 请求
export async function post<T>(url: string, data?: unknown): Promise<T> {
  return request<T>({ method: 'POST', url, data })
}

// PUT 请求
export async function put<T>(url: string, data?: unknown): Promise<T> {
  return request<T>({ method: 'PUT', url, data })
}

// DELETE 请求
export async function del<T>(url: string): Promise<T> {
  return request<T>({ method: 'DELETE', url })
}

export default apiClient
```

**Step 2: 验证 API Client 编译**

Run: `cd frontend && npm run build 2>&1 | head -20`
Expected: 编译成功

**Step 3: Commit**

```bash
git add frontend/src/lib/api-client.ts
git commit -m "feat(frontend): add API client with axios interceptors"
```

---

## Task 17: Docker Compose 配置更新

**Files:**
- Modify: `docker-compose.yml`

**Step 1: 更新 docker-compose.yml**

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL 数据库
  postgres:
    image: postgres:15-alpine
    container_name: sisyphus-postgres
    environment:
      POSTGRES_USER: sisyphus
      POSTGRES_PASSWORD: sisyphus123
      POSTGRES_DB: sisyphus
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sisyphus"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis 缓存
  redis:
    image: redis:7-alpine
    container_name: sisyphus-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MinIO 对象存储
  minio:
    image: minio/minio:latest
    container_name: sisyphus-minio
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # MySQL 测试数据源 (用于造数据测试)
  mysql-test:
    image: mysql:8.0
    container_name: sisyphus-mysql-test
    environment:
      MYSQL_ROOT_PASSWORD: root123
      MYSQL_DATABASE: test_db
      MYSQL_USER: test_user
      MYSQL_PASSWORD: test123
    ports:
      - "3306:3306"
    volumes:
      - mysql_test_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
  minio_data:
  mysql_test_data:
```

**Step 2: 启动中间件服务**

Run: `docker compose up -d postgres redis minio mysql-test`
Expected: 所有服务启动成功

**Step 3: 验证服务状态**

Run: `docker compose ps`
Expected: 所有服务状态为 "running" 或 "healthy"

**Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: update docker-compose with postgres, redis, minio, and mysql-test"
```

---

## Task 18: 更新环境变量配置

**Files:**
- Modify: `backend/.env.example`
- Modify: `frontend/.env.example`

**Step 1: 更新后端环境变量示例**

```bash
# backend/.env.example
# 数据库配置
DATABASE_URL="sqlite+aiosqlite:///./sisyphus.db"
# DATABASE_URL="postgresql+asyncpg://sisyphus:sisyphus123@localhost:5432/sisyphus"

# 安全配置
SECRET_KEY="change-me-in-production-use-openssl-rand-hex-32"
AUTH_DISABLED=true

# Redis 配置
REDIS_URL="redis://localhost:6379/0"

# Celery 配置
CELERY_BROKER_URL="redis://localhost:6379/1"
CELERY_RESULT_BACKEND="redis://localhost:6379/2"

# MinIO 配置
MINIO_ENDPOINT="localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_SECURE=false

# 应用配置
DEBUG=true
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]
```

**Step 2: 更新前端环境变量示例**

```bash
# frontend/.env.example
VITE_API_BASE_URL="http://localhost:8000/api/v1"
VITE_WS_BASE_URL="ws://localhost:8000"
VITE_AUTH_DISABLED=true
```

**Step 3: 复制为实际配置文件（如果不存在）**

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**Step 4: Commit**

```bash
git add backend/.env.example frontend/.env.example
git commit -m "docs: update .env.example files with new configuration"
```

---

## Task 19: 验证整体集成

**Step 1: 启动后端服务**

Run: `cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &`
Expected: 后端启动成功

**Step 2: 测试健康检查**

Run: `curl http://localhost:8000/health`
Expected: `{"status":"ok","version":"1.0.0"}`

**Step 3: 测试 API 文档**

Run: `curl -s http://localhost:8000/api/docs | head -20`
Expected: 返回 HTML 文档页面

**Step 4: 停止后端服务**

Run: `pkill -f "uvicorn app.main:app" || true`

**Step 5: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 infrastructure setup

- Backend modular architecture with 9 domain modules
- All SQLAlchemy 2.0 async models defined
- Alembic migrations configured
- Celery + Redis configuration
- Frontend feature-based structure
- Zustand stores for state management
- API client with interceptors
- Docker Compose with all middleware
"
```

---

## Phase 1 完成检查清单

- [ ] 后端模块化目录结构创建完成
- [ ] 核心配置模块 (config, celery, redis, response) 完成
- [ ] 所有数据库模型定义完成 (18 个表)
- [ ] Alembic 迁移配置完成
- [ ] 种子数据脚本完成
- [ ] FastAPI 应用入口更新完成
- [ ] 前端 feature-based 目录结构创建完成
- [ ] Zustand stores 完成并验证
- [ ] 前端 API Client 封装完成
- [ ] Docker Compose 配置完成
- [ ] 环境变量配置完成
- [ ] 整体集成验证通过

---

## 后续 Phase

完成 Phase 1 后，继续实施：
- **Phase 2**: 认证与项目管理
- **Phase 3**: 接口定义
- **Phase 4**: 场景编排
- **Phase 5**: 测试计划
- **Phase 6**: 执行引擎（核心）
- **Phase 7**: 测试报告
- **Phase 8**: 辅助模块
- **Phase 9**: 测试与优化

---

> **文档结束** — Phase 1: 基础设施实施计划
