# Sisyphus-X 后端 Clean Architecture 设计文档

> **版本**: 1.0
> **创建日期**: 2025-02-17
> **作者**: Backend Architect
> **状态**: 设计阶段

---

## 1. 架构概览

### 1.1 当前架构问题

**现有架构** (传统分层架构):
```
app/
├── api/           # 路由层 (Controller)
├── models/        # 数据模型 (ORM Model)
├── schemas/       # Pydantic Schema
├── services/      # 业务逻辑
└── core/          # 基础设施
```

**主要问题**:
1. **业务逻辑泄漏**: 路由层包含大量业务逻辑 (如 `projects.py:42-256`)
2. **模型紧耦合**: 直接使用 SQLAlchemy ORM 模型,难以切换数据库
3. **缺乏领域模型**: 没有 DDD 聚合根和值对象概念
4. **测试困难**: 依赖数据库,无法进行单元测试
5. **可扩展性差**: 添加新功能需要修改多个层次

### 1.2 目标架构 - Clean Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frameworks & Drivers                      │
│                      (FastAPI, SQLAlchemy, Redis)               │
└─────────────────────────────────────────────────────────────────┘
                                ▲
                                │
┌─────────────────────────────────────────────────────────────────┐
│                     Interface Adapters Layer                     │
│          Controllers, Repositories, Presenters, Gateways         │
└─────────────────────────────────────────────────────────────────┘
                                ▲
                                │
┌─────────────────────────────────────────────────────────────────┐
│                         Use Cases Layer                          │
│                    Application Business Rules                    │
└─────────────────────────────────────────────────────────────────┘
                                ▲
                                │
┌─────────────────────────────────────────────────────────────────┐
│                          Domain Layer                            │
│                    Entities & Value Objects                      │
└─────────────────────────────────────────────────────────────────┘
```

**核心原则**:
- **依赖规则**: 内层不依赖外层,依赖指向中心
- **框架无关**: Domain 层不知道 FastAPI/SQLAlchemy 的存在
- **可测试**: 核心逻辑可以在不依赖数据库的情况下测试
- **UI 独立**: 业务逻辑不绑定到 Web 框架

---

## 2. 新目录结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                          # FastAPI 应用入口
│   │
│   ├── domain/                          # [领域层] 核心业务逻辑
│   │   ├── __init__.py
│   │   ├── entities/                    # 实体 (聚合根)
│   │   │   ├── __init__.py
│   │   │   ├── project.py               # 项目聚合根
│   │   │   ├── api_test_case.py         # API测试用例聚合根
│   │   │   ├── scenario.py              # 场景聚合根
│   │   │   ├── requirement.py           # 需求聚合根
│   │   │   └── ai_conversation.py       # AI对话聚合根
│   │   │
│   │   ├── value_objects/               # 值对象 (不可变)
│   │   │   ├── __init__.py
│   │   │   ├── project_key.py           # 项目唯一标识 (PROJ-XXXX)
│   │   │   ├── environment_config.py    # 环境配置
│   │   │   ├── datasource_config.py     # 数据源配置
│   │   │   ├── priority.py              # 优先级 (P0-P3)
│   │   │   └── test_status.py           # 测试状态
│   │   │
│   │   ├── interfaces/                  # 仓储接口 (抽象)
│   │   │   ├── __init__.py
│   │   │   ├── repository.py            # 基础仓储接口
│   │   │   ├── project_repository.py    # 项目仓储接口
│   │   │   ├── api_test_case_repository.py
│   │   │   ├── scenario_repository.py
│   │   │   ├── requirement_repository.py
│   │   │   └── ai_conversation_repository.py
│   │   │
│   │   └── exceptions.py                # 领域异常
│   │
│   ├── application/                     # [用例层] 应用业务规则
│   │   ├── __init__.py
│   │   ├── use_cases/                   # 用例 (业务流程编排)
│   │   │   ├── __init__.py
│   │   │   ├── project/                 # 项目相关用例
│   │   │   │   ├── __init__.py
│   │   │   │   ├── create_project.py
│   │   │   │   ├── update_project.py
│   │   │   │   ├── delete_project.py
│   │   │   │   ├── list_projects.py
│   │   │   │   └── get_project.py
│   │   │   │
│   │   │   ├── api_test_case/           # API测试用例用例
│   │   │   │   ├── __init__.py
│   │   │   │   ├── create_test_case.py
│   │   │   │   ├── update_test_case.py
│   │   │   │   ├── delete_test_case.py
│   │   │   │   ├── execute_test_case.py
│   │   │   │   └── import_from_swagger.py
│   │   │   │
│   │   │   ├── scenario/                # 场景用例
│   │   │   │   ├── __init__.py
│   │   │   │   ├── create_scenario.py
│   │   │   │   ├── execute_scenario.py
│   │   │   │   └── validate_scenario.py
│   │   │   │
│   │   │   ├── requirement/             # 需求管理用例
│   │   │   │   ├── __init__.py
│   │   │   │   ├── create_requirement.py
│   │   │   │   ├── clarify_requirement.py
│   │   │   │   └── generate_test_points.py
│   │   │   │
│   │   │   └── ai/                      # AI助手用例
│   │   │       ├── __init__.py
│   │   │       ├── start_conversation.py
│   │   │       └── continue_conversation.py
│   │   │
│   │   ├── dto/                         # 数据传输对象
│   │   │   ├── __init__.py
│   │   │   ├── project_dto.py
│   │   │   ├── api_test_case_dto.py
│   │   │   └── scenario_dto.py
│   │   │
│   │   ├── services/                    # 应用服务 (跨聚合根业务)
│   │   │   ├── __init__.py
│   │   │   ├── ai_service.py            # AI 服务封装
│   │   │   ├── test_executor_service.py # 测试执行服务
│   │   │   └── yaml_generator_service.py # YAML生成服务
│   │   │
│   │   └── errors.py                    # 应用层错误
│   │
│   ├── infrastructure/                  # [适配器层] 技术实现
│   │   ├── __init__.py
│   │   ├── persistence/                 # 持久化适配器
│   │   │   ├── __init__.py
│   │   │   ├── models/                  # SQLAlchemy ORM 模型
│   │   │   │   ├── __init__.py
│   │   │   │   ├── project_model.py
│   │   │   │   ├── api_test_case_model.py
│   │   │   │   └── scenario_model.py
│   │   │   │
│   │   │   └── repositories/            # 仓储实现
│   │   │       ├── __init__.py
│   │   │       ├── base_repository.py
│   │   │       ├── sqlalchemy_project_repository.py
│   │   │       ├── sqlalchemy_api_test_case_repository.py
│   │   │       └── sqlalchemy_scenario_repository.py
│   │   │
│   │   ├── api/                         # API 适配器 (Controllers)
│   │   │   ├── __init__.py
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── api.py               # 路由注册
│   │   │   │   └── endpoints/           # 控制器
│   │   │   │       ├── __init__.py
│   │   │   │       ├── projects.py
│   │   │   │       ├── api_test_cases.py
│   │   │   │       ├── scenarios.py
│   │   │   │       ├── requirements.py
│   │   │   │       └── ai.py
│   │   │   │
│   │   │   ├── dependencies.py          # FastAPI 依赖注入
│   │   │   └── schemas/                 # Pydantic 请求/响应模型
│   │   │       ├── __init__.py
│   │   │       ├── project_schema.py
│   │   │       └── api_test_case_schema.py
│   │   │
│   │   ├── external/                    # 外部服务适配器
│   │   │   ├── __init__.py
│   │   │   ├── anthropic_client.py      # Claude API 客户端
│   │   │   ├── vector_store.py          # 向量数据库适配器
│   │   │   └── engine_executor.py       # 测试引擎适配器
│   │   │
│   │   ├── messaging/                   # 消息队列适配器
│   │   │   ├── __init__.py
│   │   │   └── redis_publisher.py
│   │   │
│   │   └── cache/                       # 缓存适配器
│   │       ├── __init__.py
│   │       └── redis_cache.py
│   │
│   ├── core/                            # [基础设施层] 横切关注点
│   │   ├── __init__.py
│   │   ├── config.py                    # 配置管理
│   │   ├── security.py                  # 安全/认证
│   │   ├── logging_config.py            # 日志配置
│   │   ├── exceptions.py                # 全局异常
│   │   └── container.py                 # 依赖注入容器
│   │
│   └── shared/                          # 共享工具
│       ├── __init__.py
│       ├── utils/
│       │   ├── __init__.py
│       │   ├── validators.py            # 验证器
│       │   ├── mappers.py               # 对象映射
│       │   └── helpers.py
│       │
│       └── constants/
│           ├── __init__.py
│           └── error_codes.py           # 错误码
│
├── tests/                               # 测试目录
│   ├── unit/                            # 单元测试 (不依赖 DB)
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   └── value_objects/
│   │   └── application/
│   │       └── use_cases/
│   │
│   ├── integration/                     # 集成测试
│   │   ├── repositories/
│   │   └── api/
│   │
│   └── e2e/                             # 端到端测试
│
├── alembic/                             # 数据库迁移
├── pyproject.toml
└── README.md
```

---

## 3. 领域层设计

### 3.1 核心领域划分

基于 DDD 的 **Ubiquitous Language**,识别以下核心领域:

1. **项目上下文 (Project Context)**
   - 聚合根: `Project`
   - 值对象: `ProjectKey`, `EnvironmentConfig`

2. **测试用例上下文 (Test Case Context)**
   - 聚合根: `ApiTestCase`, `Scenario`
   - 值对象: `Priority`, `TestStatus`, `Assertion`

3. **需求上下文 (Requirement Context)**
   - 聚合根: `Requirement`, `TestCaseKnowledge`
   - 值对象: `RequirementStatus`

4. **AI 助手上下文 (AI Assistant Context)**
   - 聚合根: `AIConversation`
   - 值对象: `MessageType`, `SessionType`

### 3.2 实体设计示例

#### 3.2.1 项目聚合根

```python
# domain/entities/project.py
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from domain.value_objects.project_key import ProjectKey
from domain.value_objects.environment_config import EnvironmentConfig
from domain.exceptions import DomainException


@dataclass
class Project:
    """项目聚合根

    聚合边界:
    - 包含 EnvironmentConfig 实体
    - 包含 DataSourceConfig 实体

    不变式 (Invariants):
    - 项目名称不能为空
    - 项目 key 必须唯一 (由仓储保证)
    - 同一用户下项目名称唯一
    """

    # 标识符
    id: UUID = field(default_factory=uuid4)
    project_key: ProjectKey = field(default_factory=ProjectKey.generate)

    # 属性
    name: str
    description: Optional[str] = None
    created_by: UUID = field(default_factory=uuid4)
    owner: Optional[UUID] = None

    # 时间戳
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    # 聚合内部的实体 (通过方法维护一致性)
    environments: List[EnvironmentConfig] = field(default_factory=list)

    def __post_init__(self):
        """验证不变式"""
        if not self.name or not self.name.strip():
            raise DomainException("项目名称不能为空")

        if len(self.name) > 255:
            raise DomainException("项目名称长度不能超过255个字符")

    def add_environment(self, config: EnvironmentConfig) -> None:
        """添加环境配置

        业务规则:
        - 同一项目下环境名称不能重复
        """
        if any(env.name == config.name for env in self.environments):
            raise DomainException(f"环境名称 '{config.name}' 已存在")

        self.environments.append(config)
        self.updated_at = datetime.utcnow()

    def remove_environment(self, environment_id: UUID) -> None:
        """删除环境配置"""
        self.environments = [
            env for env in self.environments
            if env.id != environment_id
        ]
        self.updated_at = datetime.utcnow()

    def update_info(self, name: str, description: Optional[str] = None) -> None:
        """更新项目基本信息"""
        if not name or not name.strip():
            raise DomainException("项目名称不能为空")

        if len(name) > 255:
            raise DomainException("项目名称长度不能超过255个字符")

        self.name = name
        self.description = description
        self.updated_at = datetime.utcnow()

    def transfer_ownership(self, new_owner: UUID) -> None:
        """转移项目所有权"""
        if new_owner == self.owner:
            return

        self.owner = new_owner
        self.updated_at = datetime.utcnow()
```

#### 3.2.2 API 测试用例聚合根

```python
# domain/entities/api_test_case.py
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4

from domain.value_objects.priority import Priority
from domain.value_objects.test_status import TestStatus
from domain.exceptions import DomainException


@dataclass
class TestStep:
    """测试步骤 (实体)"""

    order: int
    step_type: str  # request, database, wait, loop, script
    config: Dict[str, Any]
    name: str
    description: Optional[str] = None


@dataclass
class ApiTestCase:
    """API 测试用例聚合根

    聚合边界:
    - 包含 TestStep 实体列表

    不变式:
    - 用例名称不能为空
    - 项目 ID 必须有效
    - 步骤序号必须连续
    """

    # 标识符
    id: UUID = field(default_factory=uuid4)
    project_id: UUID
    environment_id: Optional[UUID] = None

    # 属性
    name: str
    description: Optional[str] = None
    yaml_content: str = ""
    config_data: Dict[str, Any] = field(default_factory=dict)

    # 聚合内部实体
    steps: List[TestStep] = field(default_factory=list)

    # 元数据
    priority: Priority = field(default_factory=lambda: Priority.P2)
    tags: List[str] = field(default_factory=list)
    enabled: bool = True

    # 时间戳
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        """验证不变式"""
        if not self.name or not self.name.strip():
            raise DomainException("用例名称不能为空")

        self._validate_steps()

    def _validate_steps(self) -> None:
        """验证步骤序号连续性"""
        if not self.steps:
            return

        sorted_orders = sorted(step.order for step in self.steps)
        for i, order in enumerate(sorted_orders):
            if i != order:
                raise DomainException("步骤序号必须连续且从0开始")

    def add_step(self, step: TestStep) -> None:
        """添加测试步骤"""
        self.steps.append(step)
        self.steps.sort(key=lambda s: s.order)
        self.updated_at = datetime.utcnow()

    def remove_step(self, step_order: int) -> None:
        """删除步骤并重新排序"""
        self.steps = [s for s in self.steps if s.order != step_order]

        # 重新排序
        for i, step in enumerate(sorted(self.steps, key=lambda s: s.order)):
            step.order = i

        self.updated_at = datetime.utcnow()

    def update_step(self, step_order: int, new_config: Dict[str, Any]) -> None:
        """更新步骤配置"""
        for step in self.steps:
            if step.order == step_order:
                step.config = new_config
                self.updated_at = datetime.utcnow()
                return

        raise DomainException(f"步骤 {step_order} 不存在")

    def disable(self) -> None:
        """禁用用例"""
        self.enabled = False
        self.updated_at = datetime.utcnow()

    def enable(self) -> None:
        """启用用例"""
        self.enabled = True
        self.updated_at = datetime.utcnow()
```

### 3.3 值对象设计

```python
# domain/value_objects/project_key.py
from dataclasses import dataclass
import uuid


@dataclass(frozen=True)
class ProjectKey:
    """项目唯一标识值对象

    特性:
    - 不可变 (frozen=True)
    - 自我验证
    - 格式: PROJ-XXXXXXXX (8位大写16进制)
    """

    value: str

    def __post_init__(self):
        """验证格式"""
        if not self.value.startswith("PROJ-"):
            raise ValueError("项目 key 必须以 'PROJ-' 开头")

        suffix = self.value[5:]
        if len(suffix) != 8 or not suffix.isalnum():
            raise ValueError("项目 key 后缀必须是8位字母数字")

    @classmethod
    def generate(cls) -> "ProjectKey":
        """生成新的项目 key"""
        suffix = uuid.uuid4().hex[:8].upper()
        return cls(value=f"PROJ-{suffix}")

    def __str__(self) -> str:
        return self.value
```

```python
# domain/value_objects/priority.py
from enum import Enum
from dataclasses import dataclass


class PriorityLevel(Enum):
    """优先级枚举"""
    P0 = "P0"  # 最高 (核心功能)
    P1 = "P1"  # 高 (重要功能)
    P2 = "P2"  # 中 (一般功能)
    P3 = "P3"  # 低 (边缘功能)


@dataclass(frozen=True)
class Priority:
    """优先级值对象"""

    level: PriorityLevel

    @classmethod
    def from_string(cls, value: str) -> "Priority":
        """从字符串创建"""
        try:
            level = PriorityLevel(value.upper())
            return cls(level=level)
        except ValueError:
            raise ValueError(f"无效的优先级: {value}")

    def __str__(self) -> str:
        return self.level.value

    def is_higher_than(self, other: "Priority") -> bool:
        """比较优先级"""
        order = {PriorityLevel.P0: 0, PriorityLevel.P1: 1, PriorityLevel.P2: 2, PriorityLevel.P3: 3}
        return order[self.level] < order[other.level]
```

### 3.4 仓储接口设计

```python
# domain/interfaces/repository.py
from abc import ABC, abstractmethod
from typing import TypeVar, Generic, List, Optional
from uuid import UUID

T = TypeVar("T")


class Repository(ABC, Generic[T]):
    """基础仓储接口

    定义通用的 CRUD 操作
    """

    @abstractmethod
    async def save(self, entity: T) -> T:
        """保存实体 (创建或更新)"""
        pass

    @abstractmethod
    async def find_by_id(self, id: UUID) -> Optional[T]:
        """根据 ID 查找实体"""
        pass

    @abstractmethod
    async def find_all(self) -> List[T]:
        """查找所有实体"""
        pass

    @abstractmethod
    async def delete(self, id: UUID) -> None:
        """删除实体"""
        pass
```

```python
# domain/interfaces/project_repository.py
from abc import abstractmethod
from typing import List, Optional
from uuid import UUID

from domain.interfaces.repository import Repository
from domain.entities.project import Project


class ProjectRepository(Repository[Project]):
    """项目仓储接口

    定义项目相关的持久化操作
    """

    @abstractmethod
    async def find_by_key(self, key: str) -> Optional[Project]:
        """根据项目 key 查找"""
        pass

    @abstractmethod
    async def find_by_user(self, user_id: UUID) -> List[Project]:
        """查找用户的所有项目"""
        pass

    @abstractmethod
    async def exists_by_name(self, user_id: UUID, name: str) -> bool:
        """检查用户下是否存在同名项目"""
        pass

    @abstractmethod
    async def find_by_name_containing(self, user_id: UUID, keyword: str) -> List[Project]:
        """根据项目名称模糊查询"""
        pass
```

---

## 4. 用例层设计

### 4.1 用例基类

```python
# application/use_cases/base.py
from abc import ABC, abstractmethod
from typing import Generic, TypeVar

InputDTO = TypeVar("InputDTO")
OutputDTO = TypeVar("OutputDTO")


class UseCase(ABC, Generic[InputDTO, OutputDTO]):
    """用例基类

    所有业务用例的抽象基类
    """

    @abstractmethod
    async def execute(self, input_dto: InputDTO) -> OutputDTO:
        """执行用例"""
        pass
```

### 4.2 项目用例示例

#### 4.2.1 创建项目用例

```python
# application/use_cases/project/create_project.py
from typing import Optional
from uuid import UUID

from application.use_cases.base import UseCase
from application.dto.project_dto import CreateProjectInput, ProjectOutput
from domain.entities.project import Project
from domain.interfaces.project_repository import ProjectRepository
from domain.exceptions import DomainException
from application.errors import ApplicationError


class CreateProject(UseCase[CreateProjectInput, ProjectOutput]):
    """创建项目用例

    业务规则:
    1. 项目名称不能为空
    2. 同一用户下项目名称唯一
    3. 自动生成项目 key
    """

    def __init__(self, project_repository: ProjectRepository):
        self.project_repository = project_repository

    async def execute(self, input_dto: CreateProjectInput) -> ProjectOutput:
        # 1. 验证业务规则
        existing = await self.project_repository.exists_by_name(
            user_id=input_dto.user_id,
            name=input_dto.name
        )

        if existing:
            raise ApplicationError.PROJECT_NAME_ALREADY_EXISTS(
                name=input_dto.name
            )

        # 2. 创建领域实体 (通过不变式自我验证)
        project = Project(
            name=input_dto.name,
            description=input_dto.description,
            created_by=input_dto.user_id,
            owner=input_dto.owner_id
        )

        # 3. 持久化
        saved_project = await self.project_repository.save(project)

        # 4. 返回 DTO
        return ProjectOutput.from_entity(saved_project)
```

#### 4.2.2 列出项目用例

```python
# application/use_cases/project/list_projects.py
from typing import List

from application.use_cases.base import UseCase
from application.dto.project_dto import ListProjectsInput, ProjectOutput
from domain.entities.project import Project
from domain.interfaces.project_repository import ProjectRepository


class ListProjects(UseCase[ListProjectsInput, List[ProjectOutput]]):
    """列出项目用例

    支持功能:
    - 分页
    - 搜索
    - 排序
    """

    def __init__(self, project_repository: ProjectRepository):
        self.project_repository = project_repository

    async def execute(self, input_dto: ListProjectsInput) -> List[ProjectOutput]:
        # 1. 查询
        if input_dto.search_keyword:
            projects = await self.project_repository.find_by_name_containing(
                user_id=input_dto.user_id,
                keyword=input_dto.search_keyword
            )
        else:
            projects = await self.project_repository.find_by_user(
                user_id=input_dto.user_id
            )

        # 2. 排序
        projects.sort(
            key=lambda p: p.updated_at,
            reverse=True
        )

        # 3. 分页
        start = (input_dto.page - 1) * input_dto.page_size
        end = start + input_dto.page_size
        paginated = projects[start:end]

        # 4. 转换为 DTO
        return [ProjectOutput.from_entity(p) for p in paginated]
```

### 4.3 API 测试用例用例

```python
# application/use_cases/api_test_case/execute_test_case.py
from uuid import UUID

from application.use_cases.base import UseCase
from application.dto.api_test_case_dto import ExecuteTestCaseInput, ExecutionOutput
from domain.entities.api_test_case import ApiTestCase
from domain.interfaces.api_test_case_repository import ApiTestCaseRepository
from application.services.test_executor_service import TestExecutorService
from domain.exceptions import DomainException


class ExecuteTestCase(UseCase[ExecuteTestCaseInput, ExecutionOutput]):
    """执行测试用例

    业务流程:
    1. 加载测试用例
    2. 加载环境配置
    3. 变量替换
    4. 调用测试引擎
    5. 保存执行结果
    """

    def __init__(
        self,
        test_case_repository: ApiTestCaseRepository,
        executor_service: TestExecutorService
    ):
        self.test_case_repository = test_case_repository
        self.executor_service = executor_service

    async def execute(self, input_dto: ExecuteTestCaseInput) -> ExecutionOutput:
        # 1. 加载用例
        test_case = await self.test_case_repository.find_by_id(input_dto.test_case_id)

        if not test_case:
            raise DomainException("测试用例不存在")

        if not test_case.enabled:
            raise DomainException("测试用例已禁用")

        # 2. 执行测试
        execution_result = await self.executor_service.execute(
            test_case=test_case,
            environment_id=input_dto.environment_id,
            variables=input_dto.variables
        )

        # 3. 返回结果
        return ExecutionOutput(
            test_case_id=test_case.id,
            status=execution_result.status,
            duration=execution_result.duration,
            result_data=execution_result.data
        )
```

### 4.4 AI 助手用例

```python
# application/use_cases/ai/continue_conversation.py
from typing import Dict, Any

from application.use_cases.base import UseCase
from application.dto.ai_dto import ConversationInput, ConversationOutput
from domain.entities.ai_conversation import AIConversation
from domain.interfaces.ai_conversation_repository import AIConversationRepository
from application.services.ai_service import AIService


class ContinueConversation(UseCase[ConversationInput, ConversationOutput]):
    """继续 AI 对话

    业务流程:
    1. 加载历史对话
    2. 追加新消息
    3. 调用 AI 服务
    4. 保存新状态
    """

    def __init__(
        self,
        conversation_repository: AIConversationRepository,
        ai_service: AIService
    ):
        self.conversation_repository = conversation_repository
        self.ai_service = ai_service

    async def execute(self, input_dto: ConversationInput) -> ConversationOutput:
        # 1. 加载对话历史
        conversation = await self.conversation_repository.find_by_conversation_id(
            input_dto.conversation_id
        )

        # 2. 追加用户消息
        conversation.add_message(
            role="user",
            content=input_dto.message
        )

        # 3. 调用 AI
        response = await self.ai_service.chat(
            messages=conversation.messages,
            session_type=conversation.session_type
        )

        # 4. 追加 AI 响应
        conversation.add_message(
            role="assistant",
            content=response.content
        )

        # 5. 保存
        await self.conversation_repository.save(conversation)

        # 6. 返回
        return ConversationOutput(
            conversation_id=conversation.conversation_id,
            message=response.content,
            metadata=response.metadata
        )
```

---

## 5. 适配器层设计

### 5.1 持久化适配器

#### 5.1.1 SQLAlchemy 仓储实现

```python
# infrastructure/persistence/repositories/sqlalchemy_project_repository.py
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from domain.interfaces.project_repository import ProjectRepository
from domain.entities.project import Project
from infrastructure.persistence.models.project_model import ProjectModel
from shared.utils.mappers import ProjectMapper


class SQLAlchemyProjectRepository(ProjectRepository):
    """项目仓储的 SQLAlchemy 实现

    职责:
    - ORM 模型与领域实体之间的转换
    - 数据库操作的封装
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.mapper = ProjectMapper()

    async def save(self, entity: Project) -> Project:
        """保存项目"""
        model = self.mapper.to_model(entity)

        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)

        return self.mapper.to_entity(model)

    async def find_by_id(self, id: UUID) -> Optional[Project]:
        """根据 ID 查找"""
        result = await self.session.get(ProjectModel, str(id))

        if not result:
            return None

        return self.mapper.to_entity(result)

    async def find_by_key(self, key: str) -> Optional[Project]:
        """根据项目 key 查找"""
        stmt = select(ProjectModel).where(ProjectModel.key == key)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return None

        return self.mapper.to_entity(model)

    async def find_by_user(self, user_id: UUID) -> List[Project]:
        """查找用户的所有项目"""
        stmt = select(ProjectModel).where(
            ProjectModel.created_by == str(user_id)
        ).order_by(ProjectModel.updated_at.desc())

        result = await self.session.execute(stmt)
        models = result.scalars().all()

        return [self.mapper.to_entity(m) for m in models]

    async def exists_by_name(self, user_id: UUID, name: str) -> bool:
        """检查同名项目"""
        stmt = select(ProjectModel).where(
            ProjectModel.created_by == str(user_id),
            ProjectModel.name == name
        )

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def find_by_name_containing(self, user_id: UUID, keyword: str) -> List[Project]:
        """模糊查询"""
        stmt = select(ProjectModel).where(
            ProjectModel.created_by == str(user_id),
            ProjectModel.name.contains(keyword)
        ).order_by(ProjectModel.updated_at.desc())

        result = await self.session.execute(stmt)
        models = result.scalars().all()

        return [self.mapper.to_entity(m) for m in models]

    async def find_all(self) -> List[Project]:
        """查找所有项目"""
        stmt = select(ProjectModel)
        result = await self.session.execute(stmt)
        models = result.scalars().all()

        return [self.mapper.to_entity(m) for m in models]

    async def delete(self, id: UUID) -> None:
        """删除项目"""
        model = await self.session.get(ProjectModel, str(id))

        if model:
            await self.session.delete(model)
            await self.session.commit()
```

#### 5.1.2 对象映射器

```python
# shared/utils/mappers.py
from domain.entities.project import Project
from infrastructure.persistence.models.project_model import ProjectModel


class ProjectMapper:
    """项目实体与 ORM 模型映射器"""

    def to_model(self, entity: Project) -> ProjectModel:
        """实体 → 模型"""
        return ProjectModel(
            id=str(entity.id),
            key=str(entity.project_key),
            name=entity.name,
            description=entity.description,
            created_by=str(entity.created_by),
            owner=str(entity.owner) if entity.owner else None,
            created_at=entity.created_at,
            updated_at=entity.updated_at
        )

    def to_entity(self, model: ProjectModel) -> Project:
        """模型 → 实体"""
        from domain.value_objects.project_key import ProjectKey

        return Project(
            id=UUID(model.id),
            project_key=ProjectKey(value=model.key),
            name=model.name,
            description=model.description,
            created_by=UUID(model.created_by),
            owner=UUID(model.owner) if model.owner else None,
            created_at=model.created_at,
            updated_at=model.updated_at
        )
```

### 5.2 API 适配器

#### 5.2.1 控制器

```python
# infrastructure/api/v1/endpoints/projects.py
from typing import List
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from application.use_cases.project.create_project import CreateProject
from application.use_cases.project.list_projects import ListProjects
from application.dto.project_dto import CreateProjectInput, ProjectOutput
from infrastructure.api.dependencies import get_create_project_use_case, get_list_projects_use_case


router = APIRouter()


@router.post("/", response_model=ProjectOutput, status_code=status.HTTP_201_CREATED)
async def create_project(
    request: CreateProjectRequest,
    use_case: CreateProject = Depends(get_create_project_use_case)
) -> ProjectOutput:
    """创建项目 API"""
    input_dto = CreateProjectInput(
        name=request.name,
        description=request.description,
        user_id=request.current_user_id,  # 来自 JWT
        owner_id=request.owner_id
    )

    return await use_case.execute(input_dto)


@router.get("/", response_model=List[ProjectOutput])
async def list_projects(
    page: int = 1,
    size: int = 10,
    search: str = None,
    use_case: ListProjects = Depends(get_list_projects_use_case)
) -> List[ProjectOutput]:
    """列出项目 API"""
    input_dto = ListProjectsInput(
        user_id="",  # 从 JWT 中提取
        page=page,
        page_size=size,
        search_keyword=search
    )

    return await use_case.execute(input_dto)
```

#### 5.2.2 依赖注入

```python
# infrastructure/api/dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.container import Container
from infrastructure.persistence.repositories.sqlalchemy_project_repository import SQLAlchemyProjectRepository
from application.use_cases.project.create_project import CreateProject
from application.use_cases.project.list_projects import ListProjects


async def get_db_session() -> AsyncSession:
    """获取数据库会话"""
    # from core.db import get_session
    # async for session in get_session():
    #     yield session
    pass


def get_project_repository(session: AsyncSession = Depends(get_db_session)) -> SQLAlchemyProjectRepository:
    """获取项目仓储"""
    return SQLAlchemyProjectRepository(session=session)


def get_create_project_use_case(
    repo: SQLAlchemyProjectRepository = Depends(get_project_repository)
) -> CreateProject:
    """获取创建项目用例"""
    return CreateProject(project_repository=repo)


def get_list_projects_use_case(
    repo: SQLAlchemyProjectRepository = Depends(get_project_repository)
) -> ListProjects:
    """获取列出项目用例"""
    return ListProjects(project_repository=repo)
```

---

## 6. 依赖注入方案

### 6.1 使用依赖注入容器

```python
# core/container.py
from dependency_injector import containers, providers
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.persistence.repositories.sqlalchemy_project_repository import SQLAlchemyProjectRepository
from application.use_cases.project.create_project import CreateProject
from application.use_cases.project.list_projects import ListProjects


class Container(containers.DeclarativeContainer):
    """依赖注入容器"""

    # 配置
    config = providers.Configuration()

    # 数据库会话
    db_session = providers.Singleton(AsyncSession)

    # 仓储层
    project_repository = providers.Factory(
        SQLAlchemyProjectRepository,
        session=db_session
    )

    # 用例层
    create_project_use_case = providers.Factory(
        CreateProject,
        project_repository=project_repository
    )

    list_projects_use_case = providers.Factory(
        ListProjects,
        project_repository=project_repository
    )
```

### 6.2 FastAPI 集成

```python
# main.py
from fastapi import FastAPI
from core.container import Container

container = Container()

app = FastAPI()

# 设置容器
app.container = container

# 通过容器获取依赖
@app.post("/projects")
async def create_project(
    use_case: CreateProject = Depends(container.create_project_use_case.provider)
):
    ...
```

---

## 7. 错误处理策略

### 7.1 异常层次结构

```python
# domain/exceptions.py
class DomainException(Exception):
    """领域异常基类"""
    pass


class ProjectNotFoundException(DomainException):
    """项目不存在"""
    pass


class ProjectNameDuplicateException(DomainException):
    """项目名称重复"""
    pass
```

```python
# application/errors.py
class ApplicationError(Exception):
    """应用层错误基类"""

    class _:
        @staticmethod
        def PROJECT_NAME_ALREADY_EXISTS(name: str):
            return ApplicationError(f"项目名称 '{name}' 已存在")
```

```python
# infrastructure/api/exception_handlers.py
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from domain.exceptions import DomainException


def register_exception_handlers(app: FastAPI):
    """注册全局异常处理器"""

    @app.exception_handler(DomainException)
    async def domain_exception_handler(request, exc: DomainException):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": str(exc)}
        )
```

---

## 8. 迁移策略

### 8.1 渐进式迁移路径

**阶段 1: 准备 (Week 1-2)**
1. 创建新目录结构
2. 实现核心领域实体和值对象
3. 实现仓储接口
4. 编写单元测试

**阶段 2: 迁移核心模块 (Week 3-6)**
1. **项目管理模块**
   - 创建 Project 聚合根
   - 实现 ProjectRepository
   - 迁移所有项目相关用例
   - 更新 API 控制器

2. **API 测试用例模块**
   - 创建 ApiTestCase 聚合根
   - 实现 ApiTestCaseRepository
   - 迁移用例执行逻辑

**阶段 3: 迁移其他模块 (Week 7-10)**
1. 场景编排模块
2. 需求管理模块
3. AI 助手模块

**阶段 4: 清理 (Week 11-12)**
1. 删除旧代码
2. 更新文档
3. 性能优化

### 8.2 共存策略

在迁移期间,新旧代码可以共存:

```python
# 旧路由 (保留)
@router.get("/v1/projects/old")
async def list_projects_old(...):
    # 直接使用 SQLAlchemy
    pass

# 新路由 (Clean Architecture)
@router.get("/v1/projects")
async def list_projects(
    use_case: ListProjects = Depends(...)
):
    # 使用用例
    pass
```

---

## 9. 测试策略

### 9.1 单元测试 (Domain + Application)

```python
# tests/unit/domain/entities/test_project.py
import pytest
from uuid import uuid4

from domain.entities.project import Project
from domain.exceptions import DomainException


def test_project_creation_with_empty_name():
    """测试项目名称不能为空"""
    with pytest.raises(DomainException):
        Project(name="")


def test_project_add_environment_duplicate():
    """测试环境名称不能重复"""
    project = Project(name="Test", created_by=uuid4())

    env1 = EnvironmentConfig(name="Dev", domain="http://dev.com")
    env2 = EnvironmentConfig(name="Dev", domain="http://dev2.com")

    project.add_environment(env1)

    with pytest.raises(DomainException):
        project.add_environment(env2)
```

```python
# tests/unit/application/use_cases/test_create_project.py
import pytest
from uuid import uuid4

from application.use_cases.project.create_project import CreateProject
from domain.entities.project import Project


class MockProjectRepository:
    """Mock 仓储"""
    async def exists_by_name(self, user_id, name):
        return False

    async def save(self, entity):
        return entity


@pytest.mark.asyncio
async def test_create_project_success():
    """测试创建项目成功"""
    repo = MockProjectRepository()
    use_case = CreateProject(project_repository=repo)

    input_dto = CreateProjectInput(
        name="Test Project",
        user_id=uuid4()
    )

    result = await use_case.execute(input_dto)

    assert result.name == "Test Project"
    assert result.project_key.startswith("PROJ-")
```

### 9.2 集成测试

```python
# tests/integration/repositories/test_project_repository.py
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.persistence.repositories.sqlalchemy_project_repository import SQLAlchemyProjectRepository


@pytest.mark.asyncio
async def test_save_and_find_project(db_session: AsyncSession):
    """测试仓储保存和查询"""
    repo = SQLAlchemyProjectRepository(session=db_session)

    project = Project(name="Test", created_by=uuid4())
    saved = await repo.save(project)

    found = await repo.find_by_id(saved.id)

    assert found is not None
    assert found.name == "Test"
```

---

## 10. 性能考虑

### 10.1 仓储优化

- **批量操作**: 实现批量保存/删除方法
- **延迟加载**: 使用 SQLAlchemy 的 relationship lazy loading
- **查询优化**: 使用索引和 select/load 优化

### 10.2 缓存策略

```python
# infrastructure/cache/redis_cache.py
class CachedProjectRepository(ProjectRepository):
    """带缓存的项目仓储"""

    def __init__(self, repository: ProjectRepository, cache: RedisCache):
        self.repository = repository
        self.cache = cache

    async def find_by_id(self, id: UUID):
        # 1. 尝试从缓存读取
        cached = await self.cache.get(f"project:{id}")
        if cached:
            return cached

        # 2. 从数据库读取
        entity = await self.repository.find_by_id(id)

        # 3. 写入缓存
        if entity:
            await self.cache.set(f"project:{id}", entity, ttl=300)

        return entity
```

---

## 11. 总结

### 11.1 架构优势

1. **可测试性**: 核心业务逻辑完全独立,可以不依赖数据库进行测试
2. **可维护性**: 清晰的层次划分,职责明确
3. **可扩展性**: 添加新功能不需要修改现有代码
4. **技术无关**: 可以轻松替换框架 (FastAPI → Flask) 或数据库 (PostgreSQL → MySQL)

### 11.2 实施建议

1. **渐进式迁移**: 不要一次性重写所有代码
2. **测试先行**: 在重构之前先编写测试保护
3. **团队培训**: 确保团队理解 Clean Architecture 原则
4. **代码审查**: 严格审查边界是否清晰

### 11.3 参考资源

- **Clean Architecture** by Robert C. Martin
- **Domain-Driven Design** by Eric Evans
- **FastAPI 最佳实践**: https://fastapi.tiangolo.com/
- **Python Clean Architecture**: https://github.com/cosmic-python/code

---

**文档版本**: 1.0
**最后更新**: 2025-02-17
**审核状态**: 待审核
