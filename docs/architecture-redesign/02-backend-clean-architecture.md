# 后端 Clean Architecture 设计方案

> **生成时间**: 2025-02-17
> **设计专家**: 后端架构师
> **架构模式**: Clean Architecture + Hexagonal Architecture + DDD

---

## 📐 设计原则

### 核心原则

1. **依赖倒置** - 依赖关系指向内层
2. **领域独立** - 业务逻辑不依赖框架
3. **可测试性** - 所有层都可独立测试
4. **技术无关** - 核心不依赖具体技术

### 技术栈适配

- **FastAPI** → Adapters Layer (Controllers)
- **SQLModel** → Adapters Layer (Repositories)
- **PostgreSQL/SQLite** → Infrastructure Layer
- **LangChain/Claude** → Adapters Layer (AI Gateways)
- **Pydantic** → 跨层数据验证

---

## 🗂️ 新目录结构

```
backend/app/
├── domain/                           # 🔵 领域层 - 最内层
│   ├── entities/                     # 实体 (有 ID, 可变)
│   │   ├── project.py
│   │   │   ├── Project               # 项目实体
│   │   │   ├── Environment           # 环境实体
│   │   │   └── Datasource            # 数据源实体
│   │   ├── test_case.py
│   │   │   ├── ApiTestCase           # API测试用例实体
│   │   │   ├── Step                  # 测试步骤实体
│   │   │   └── Assertion             # 断言实体
│   │   ├── scenario.py
│   │   │   ├── Scenario              # 场景实体
│   │   │   ├── ScenarioNode          # 场景节点实体
│   │   │   └── Edge                  # 边关系实体
│   │   ├── requirement.py
│   │   │   └── TestRequirement       # 测试需求实体
│   │   ├── test_case_knowledge.py
│   │   │   └── TestCaseKnowledge     # 知识库实体
│   │   ├── ai_conversation.py
│   │   │   ├── AIConversation        # AI对话实体
│   │   │   └── Message               # 消息实体
│   │   └── user.py
│   │       └── User                  # 用户实体
│   │
│   ├── value_objects/                # 值对象 (无 ID, 不可变)
│   │   ├── email.py                  # Email 值对象
│   │   ├── http_method.py            # HTTPMethod 枚举
│   │   ├── assertion_type.py         # AssertionType 枚举
│   │   ├── node_type.py              # NodeType 枚举
│   │   └── execution_status.py       # ExecutionStatus 枚举
│   │
│   └── interfaces/                   # 仓储接口 (Ports)
│       ├── project_repository.py     # IProjectRepository
│       ├── test_case_repository.py   # ITestCaseRepository
│       ├── scenario_repository.py    # IScenarioRepository
│       ├── requirement_repository.py # IRequirementRepository
│       ├── knowledge_repository.py   # IKnowledgeRepository
│       ├── conversation_repository.py # IConversationRepository
│       └── user_repository.py        # IUserRepository
│
├── use_cases/                        # 🟢 用例层 - 业务规则
│   ├── project/
│   │   ├── create_project.py         # CreateProjectUseCase
│   │   ├── update_project.py         # UpdateProjectUseCase
│   │   ├── delete_project.py         # DeleteProjectUseCase
│   │   └── get_project_details.py    # GetProjectDetailsUseCase
│   │
│   ├── test_case/
│   │   ├── create_test_case.py       # CreateTestCaseUseCase
│   │   ├── execute_test_case.py      # ExecuteTestCaseUseCase
│   │   ├── import_from_swagger.py    # ImportFromSwaggerUseCase
│   │   └── generate_test_cases.py    # GenerateTestCasesUseCase (AI)
│   │
│   ├── scenario/
│   │   ├── create_scenario.py        # CreateScenarioUseCase
│   │   ├── execute_scenario.py       # ExecuteScenarioUseCase
│   │   └── validate_scenario.py      # ValidateScenarioUseCase
│   │
│   ├── requirement/
│   │   ├── clarify_requirement.py    # ClarifyRequirementUseCase (AI)
│   │   ├── create_requirement.py     # CreateRequirementUseCase
│   │   └── link_to_knowledge.py      # LinkToKnowledgeUseCase
│   │
│   ├── ai/
│   │   ├── generate_test_cases.py    # AI生成用例
│   │   ├── clarify_requirements.py   # AI需求澄清
│   │   └── optimize_test_cases.py    # AI优化用例
│   │
│   └── shared/
│       ├── dto.py                    # 请求/响应 DTO
│       └── exceptions.py             # 业务异常
│
├── adapters/                          # 🟡 适配器层 - 外部交互
│   ├── repositories/                 # 仓储实现 (Adapters)
│   │   ├── postgres_project_repository.py
│   │   ├── postgres_test_case_repository.py
│   │   ├── postgres_scenario_repository.py
│   │   ├── postgres_requirement_repository.py
│   │   ├── postgres_knowledge_repository.py
│   │   ├── postgres_conversation_repository.py
│   │   └── postgres_user_repository.py
│   │
│   ├── controllers/                  # 控制器 (FastAPI 路由)
│   │   ├── project_controller.py
│   │   ├── test_case_controller.py
│   │   ├── scenario_controller.py
│   │   ├── requirement_controller.py
│   │   ├── ai_controller.py
│   │   └── auth_controller.py
│   │
│   ├── gateways/                     # 外部服务适配器
│   │   ├── ai/
│   │   │   ├── anthropic_gateway.py  # Anthropic Claude 适配器
│   │   │   ├── openai_gateway.py     # OpenAI 适配器
│   │   │   └── ai_gateway_interface.py
│   │   ├── http/
│   │   │   └── http_client.py        # HTTP 客户端适配器
│   │   └── storage/
│   │       ├── minio_gateway.py      # MinIO 适配器
│   │       └── local_storage_gateway.py
│   │
│   └── presenters/                   # 响应格式化
│       ├── json_presenter.py
│       └── api_response_presenter.py
│
├── infrastructure/                   # 🔴 基础设施层 - 最外层
│   ├── database/
│   │   ├── connection.py             # 数据库连接管理
│   │   ├── session_factory.py        # Session 工厂
│   │   └── migrations.py             # Alembic 集成
│   │
│   ├── config/
│   │   ├── settings.py               # Pydantic Settings
│   │   └── logging_config.py         # 日志配置
│   │
│   ├── security/
│   │   ├── jwt.py                    # JWT 工具
│   │   ├── hashing.py                # 密码哈希
│   │   └── authentication.py         # 认证中间件
│   │
│   ├── logging/
│   │   └── logger.py                 # 日志器
│   │
│   └── middleware/
│       ├── cors.py                   # CORS 中间件
│       ├── error_handler.py          # 全局异常处理
│       └── request_logging.py        # 请求日志
│
├── dependencies/                     # 📦 依赖注入
│   └── container.py                  # DI 容器
│
└── main.py                           # 应用入口
```

---

## 🔵 Domain Layer (领域层)

### 1. 实体 (Entities)

**特点**:
- ✅ 有唯一标识 (ID)
- ✅ 可变状态
- ✅ 包含业务行为
- ✅ 无框架依赖

**示例: Project 实体**

```python
# backend/app/domain/entities/project.py
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
from domain.value_objects.execution_status import ProjectStatus

@dataclass
class Environment:
    """环境值对象 - 简化示例"""
    id: Optional[int]
    name: str
    base_url: str
    variables: dict

@dataclass
class Project:
    """项目实体 - 核心业务对象"""

    id: Optional[int]
    name: str
    description: str
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
    environments: List[Environment]

    # ✅ 业务行为在实体中
    def add_environment(self, name: str, base_url: str) -> Environment:
        """添加环境 - 业务规则"""
        if len(self.environments) >= 10:
            raise ValueError("最多支持 10 个环境")

        # 检查环境名称唯一性
        if any(env.name == name for env in self.environments):
            raise ValueError(f"环境名称 '{name}' 已存在")

        env = Environment(
            id=None,
            name=name,
            base_url=base_url,
            variables={}
        )
        self.environments.append(env)
        return env

    def remove_environment(self, environment_id: int) -> bool:
        """删除环境"""
        self.environments = [
            env for env in self.environments
            if env.id != environment_id
        ]
        return True

    def archive(self):
        """归档项目"""
        if self.status == ProjectStatus.ARCHIVED:
            raise ValueError("项目已归档")
        self.status = ProjectStatus.ARCHIVED
        self.updated_at = datetime.now()

    # ✅ 业务规则验证
    def can_execute_tests(self) -> bool:
        """是否可以执行测试"""
        return self.status == ProjectStatus.ACTIVE and len(self.environments) > 0
```

### 2. 值对象 (Value Objects)

**特点**:
- ✅ 无 ID
- ✅ 不可变 (frozen=True)
- ✅ 替换而非修改
- ✅ 自我验证

**示例: Email 值对象**

```python
# backend/app/domain/value_objects/email.py
from dataclasses import dataclass
import re

@dataclass(frozen=True)
class Email:
    """Email 值对象 - 不可变,自验证"""
    value: str

    def __post_init__(self):
        """创建时验证"""
        if not self._is_valid():
            raise ValueError(f"Invalid email: {self.value}")

    def _is_valid(self) -> bool:
        """Email 格式验证"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, self.value) is not None

    @property
    def domain(self) -> str:
        """提取域名"""
        return self.value.split('@')[1]

    def __str__(self) -> str:
        return self.value
```

**示例: HTTPMethod 枚举**

```python
# backend/app/domain/value_objects/http_method.py
from enum import Enum
from dataclasses import dataclass

class HTTPMethod(Enum):
    """HTTP 方法枚举"""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"
    HEAD = "HEAD"
    OPTIONS = "OPTIONS"

    def __str__(self) -> str:
        return self.value

@dataclass(frozen=True)
class HttpRequest:
    """HTTP 请求值对象"""
    method: HTTPMethod
    url: str
    headers: dict
    body: Optional[str]

    def __post_init__(self):
        """验证"""
        if not self.url.startswith(('http://', 'https://')):
            raise ValueError("Invalid URL")
```

### 3. 仓储接口 (Repository Interfaces)

**特点**:
- ✅ 抽象接口,无实现
- ✅ 返回领域实体
- ✅ 无数据库细节
- ✅ 可 mock 测试

**示例: IProjectRepository**

```python
# backend/app/domain/interfaces/project_repository.py
from abc import ABC, abstractmethod
from typing import List, Optional
from domain.entities.project import Project

class IProjectRepository(ABC):
    """项目仓储接口 - Port"""

    @abstractmethod
    async def find_by_id(self, project_id: int) -> Optional[Project]:
        """根据 ID 查找项目"""
        pass

    @abstractmethod
    async def find_by_name(self, name: str) -> Optional[Project]:
        """根据名称查找项目"""
        pass

    @abstractmethod
    async def find_all(self, user_id: int) -> List[Project]:
        """查找用户的所有项目"""
        pass

    @abstractmethod
    async def save(self, project: Project) -> Project:
        """保存项目"""
        pass

    @abstractmethod
    async def delete(self, project_id: int) -> bool:
        """删除项目"""
        pass

    @abstractmethod
    async def exists(self, name: str) -> bool:
        """检查项目是否存在"""
        pass
```

---

## 🟢 Use Cases Layer (用例层)

### 用例设计

**特点**:
- ✅ 编排业务流程
- ✅ 调用领域实体行为
- ✅ 通过仓储接口访问数据
- ✅ 返回 DTO 或异常

**示例: CreateProjectUseCase**

```python
# backend/app/use_cases/project/create_project.py
from dataclasses import dataclass
from datetime import datetime
from domain.entities.project import Project
from domain.interfaces.project_repository import IProjectRepository
from domain.value_objects.execution_status import ProjectStatus
from use_cases.shared.exceptions import AlreadyExistsError

@dataclass
class CreateProjectRequest:
    """创建项目请求 DTO"""
    name: str
    description: str
    user_id: int

@dataclass
class CreateProjectResponse:
    """创建项目响应 DTO"""
    project: Project
    success: bool
    error: Optional[str] = None

class CreateProjectUseCase:
    """创建项目用例 - 编排业务逻辑"""

    def __init__(self, project_repository: IProjectRepository):
        self.project_repository = project_repository

    async def execute(self, request: CreateProjectRequest) -> CreateProjectResponse:
        """执行用例"""

        # 1. 业务验证
        if await self.project_repository.exists(request.name):
            return CreateProjectResponse(
                project=None,
                success=False,
                error=f"项目名称 '{request.name}' 已存在"
            )

        # 2. 创建实体
        project = Project(
            id=None,
            name=request.name,
            description=request.description,
            status=ProjectStatus.ACTIVE,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            environments=[]
        )

        # 3. 持久化 (通过仓储接口)
        saved_project = await self.project_repository.save(project)

        # 4. 返回响应
        return CreateProjectResponse(
            project=saved_project,
            success=True
        )
```

**示例: GenerateTestCasesUseCase (AI 集成)**

```python
# backend/app/use_cases/test_case/generate_test_cases.py
from dataclasses import dataclass
from typing import List
from domain.entities.test_case import ApiTestCase
from domain.interfaces.test_case_repository import ITestCaseRepository
from adapters.gateways.ai.anthropic_gateway import IAGateway

@dataclass
class GenerateTestCasesRequest:
    """生成测试用例请求"""
    requirement_id: int
    requirement_text: str

@dataclass
class GenerateTestCasesResponse:
    """生成测试用例响应"""
    test_cases: List[ApiTestCase]
    success: bool
    error: str = None

class GenerateTestCasesUseCase:
    """AI 生成测试用例用例"""

    def __init__(
        self,
        test_case_repository: ITestCaseRepository,
        ai_gateway: IAGateway  # ✅ 依赖抽象接口
    ):
        self.test_case_repository = test_case_repository
        self.ai_gateway = ai_gateway

    async def execute(self, request: GenerateTestCasesRequest) -> GenerateTestCasesResponse:
        """执行用例"""

        # 1. 构建 AI 提示词
        prompt = self._build_prompt(request.requirement_text)

        # 2. 调用 AI Gateway (抽象接口)
        ai_response = await self.ai_gateway.generate(
            prompt=prompt,
            response_format="json"
        )

        if not ai_response.success:
            return GenerateTestCasesResponse(
                test_cases=[],
                success=False,
                error=f"AI 生成失败: {ai_response.error}"
            )

        # 3. 解析 AI 响应为实体
        test_cases = self._parse_to_entities(ai_response.content)

        # 4. 批量保存
        saved_cases = []
        for case in test_cases:
            saved_case = await self.test_case_repository.save(case)
            saved_cases.append(saved_case)

        return GenerateTestCasesResponse(
            test_cases=saved_cases,
            success=True
        )

    def _build_prompt(self, requirement: str) -> str:
        """构建 AI 提示词"""
        return f"""
        基于以下需求生成 API 测试用例:
        {requirement}

        返回 JSON 格式,包含:
        - name: 用例名称
        - description: 描述
        - steps: 测试步骤
        - assertions: 断言
        """

    def _parse_to_entities(self, content: str) -> List[ApiTestCase]:
        """解析 AI 响应为实体"""
        # 解析逻辑...
        pass
```

---

## 🟡 Adapters Layer (适配器层)

### 1. Repository 实现

**特点**:
- ✅ 实现仓储接口
- ✅ 处理数据库细节
- ✅ 映射 ORM → 实体
- ✅ 可被 mock

**示例: PostgresProjectRepository**

```python
# backend/app/adapters/repositories/postgres_project_repository.py
from typing import List, Optional
from sqlmodel import select
from domain.entities.project import Project
from domain.interfaces.project_repository import IProjectRepository
from infrastructure.database.session_factory import get_session

class PostgresProjectRepository(IProjectRepository):
    """PostgreSQL 项目仓储实现"""

    def __init__(self, session_factory):
        self.session_factory = session_factory

    async def find_by_id(self, project_id: int) -> Optional[Project]:
        """根据 ID 查找"""
        async with self.session_factory() as session:
            # ✅ ORM 查询
            result = await session.execute(
                select(ProjectModel).where(ProjectModel.id == project_id)
            )
            model = result.scalar_one_or_none()

            # ✅ 映射到领域实体
            return self._to_entity(model) if model else None

    async def save(self, project: Project) -> Project:
        """保存项目"""
        async with self.session_factory() as session:
            # ✅ 映射到 ORM 模型
            model = self._to_model(project)

            session.add(model)
            await session.commit()
            await session.refresh(model)

            # ✅ 映射回领域实体
            return self._to_entity(model)

    def _to_entity(self, model) -> Project:
        """ORM 模型 → 领域实体"""
        if not model:
            return None

        return Project(
            id=model.id,
            name=model.name,
            description=model.description,
            status=ProjectStatus(model.status),
            created_at=model.created_at,
            updated_at=model.updated_at,
            environments=[
                Environment(
                    id=env.id,
                    name=env.name,
                    base_url=env.base_url,
                    variables=env.variables
                )
                for env in model.environments
            ]
        )

    def _to_model(self, entity: Project) -> ProjectModel:
        """领域实体 → ORM 模型"""
        return ProjectModel(
            id=entity.id,
            name=entity.name,
            description=entity.description,
            status=entity.status.value,
            created_at=entity.created_at,
            updated_at=entity.updated_at
        )
```

### 2. Controller 实现

**特点**:
- ✅ 处理 HTTP 请求/响应
- ✅ 调用用例层
- ✅ 无业务逻辑
- ✅ FastAPI 集成

**示例: ProjectController**

```python
# backend/app/adapters/controllers/project_controller.py
from fastapi import APIRouter, Depends, HTTPException
from use_cases.project.create_project import (
    CreateProjectUseCase,
    CreateProjectRequest,
    CreateProjectResponse
)
from use_cases.project.update_project import UpdateProjectUseCase
from dependencies.container import get_create_project_use_case

router = APIRouter(prefix="/projects", tags=["projects"])

class ProjectDTO:
    """FastAPI 请求 DTO"""
    name: str
    description: str

@router.post("/")
async def create_project(
    dto: ProjectDTO,
    use_case: CreateProjectUseCase = Depends(get_create_project_use_case),
    current_user: User = Depends(get_current_user)
):
    """创建项目 - Controller 只处理 HTTP"""

    # ✅ DTO → UseCase Request
    request = CreateProjectRequest(
        name=dto.name,
        description=dto.description,
        user_id=current_user.id
    )

    # ✅ 调用用例
    response = await use_case.execute(request)

    # ✅ 处理响应
    if not response.success:
        raise HTTPException(status_code=400, detail=response.error)

    # ✅ 实体 → Response
    return {
        "id": response.project.id,
        "name": response.project.name,
        "status": response.project.status.value
    }
```

### 3. AI Gateway 实现

**特点**:
- ✅ 抽象 AI 服务
- ✅ 可切换提供商
- ✅ 统一响应格式

**示例: AnthropicGateway**

```python
# backend/app/adapters/gateways/ai/anthropic_gateway.py
from anthropic import AsyncAnthropic
from adapters.gateways.ai.ai_gateway_interface import IAGateway

@dataclass
class AIResponse:
    """AI 响应"""
    content: str
    success: bool
    error: str = None

class AnthropicGateway(IAGateway):
    """Anthropic Claude 适配器"""

    def __init__(self, api_key: str):
        self.client = AsyncAnthropic(api_key=api_key)

    async def generate(self, prompt: str, response_format: str = "text") -> AIResponse:
        """生成内容"""
        try:
            response = await self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}]
            )

            return AIResponse(
                content=response.content[0].text,
                success=True
            )

        except Exception as e:
            return AIResponse(
                content="",
                success=False,
                error=str(e)
            )

    async def chat(self, messages: List[dict]) -> AIResponse:
        """对话"""
        # 实现...
        pass
```

---

## 🔴 Infrastructure Layer (基础设施层)

### 数据库配置

```python
# backend/app/infrastructure/database/connection.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from infrastructure.config.settings import settings

class Database:
    """数据库连接管理"""

    def __init__(self):
        self.engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DEBUG
        )
        self.session_factory = sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

    async def get_session(self) -> AsyncSession:
        """获取 Session"""
        async with self.session_factory() as session:
            yield session

# 全局实例
db = Database()
```

### 配置管理

```python
# backend/app/infrastructure/config/settings.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """应用配置"""

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str

    # AI
    ANTHROPIC_API_KEY: str
    OPENAI_API_KEY: str = None

    # Security
    SECRET_KEY: str
    AUTH_DISABLED: bool = False

    # Logging
    LOG_LEVEL: str = "INFO"
    DEBUG: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## 📦 依赖注入 (DI Container)

```python
# backend/app/dependencies/container.py
from collections import deque
from infrastructure.database.connection import db
from adapters.repositories.postgres_project_repository import PostgresProjectRepository
from adapters.gateways.ai.anthropic_gateway import AnthropicGateway
from use_cases.project.create_project import CreateProjectUseCase
from infrastructure.config.settings import settings

# ✅ 依赖注入容器 (简化版)
class Container:
    """DI 容器"""

    def __init__(self):
        self._singletons = {}

    def register(self, interface, implementation):
        """注册依赖"""
        self._singletons[interface] = implementation

    def get(self, interface):
        """获取依赖"""
        return self._singletons.get(interface)

# 全局容器
container = Container()

# ✅ 注册仓储
container.register(
    IProjectRepository,
    PostgresProjectRepository(db.session_factory)
)

# ✅ 注册 AI Gateway
container.register(
    IAGateway,
    AnthropicGateway(settings.ANTHROPIC_API_KEY)
)

# ✅ 注册用例
container.register(
    CreateProjectUseCase,
    CreateProjectUseCase(
        project_repository=container.get(IProjectRepository)
    )
)

# ✅ FastAPI 依赖注入函数
def get_create_project_use_case() -> CreateProjectUseCase:
    return container.get(CreateProjectUseCase)
```

---

## 🔄 数据流示例

### 创建项目的完整流程

```
1. HTTP Request
   POST /api/v1/projects
   { "name": "测试项目", "description": "..." }
         ↓
2. Controller (adapters/controllers/project_controller.py)
   - 解析请求 → DTO
   - 调用用例
         ↓
3. Use Case (use_cases/project/create_project.py)
   - 业务验证
   - 创建 Project 实体
   - 调用仓储接口
         ↓
4. Repository Interface (domain/interfaces/project_repository.py)
   - 抽象接口
         ↓
5. Repository Implementation (adapters/repositories/postgres_project_repository.py)
   - ORM 操作
   - 映射 Model → Entity
         ↓
6. Infrastructure (infrastructure/database/connection.py)
   - 数据库连接
   - SQL 执行
         ↓
7. HTTP Response
   { "id": 123, "name": "测试项目", "status": "active" }
```

---

## 📋 迁移步骤

### Phase 1: 基础设施重构 (1-2周)

1. ✅ 创建新目录结构
2. ✅ 实现 Infrastructure 层
3. ✅ 配置 DI 容器

### Phase 2: 领域层迁移 (2-3周)

1. ✅ 提取 Entities
2. ✅ 定义 Value Objects
3. ✅ 定义 Repository Interfaces

### Phase 3: 用例层实现 (3-4周)

1. ✅ 实现 Use Cases
2. ✅ 编写单元测试

### Phase 4: 适配器层实现 (2-3周)

1. ✅ 实现 Repositories
2. ✅ 重构 Controllers
3. ✅ 实现 AI Gateways

### Phase 5: 测试和优化 (1-2周)

1. ✅ 集成测试
2. ✅ 性能优化
3. ✅ 文档完善

---

## ✅ 收益

| 方面 | 改进 |
|------|------|
| **可测试性** | 所有层都可独立测试 |
| **可维护性** | 职责清晰,易于修改 |
| **可扩展性** | 新增功能不影响现有代码 |
| **技术无关** | 核心业务不依赖框架 |
| **团队协作** | 并行开发,减少冲突 |

---

**状态**: ✅ 后端 Clean Architecture 设计完成,等待评审...
