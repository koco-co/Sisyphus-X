# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Sisyphus-X 是一款面向测试团队的自动化测试管理平台,提供从「接口定义 → 场景编排 → 测试计划 → 测试报告」的全链路接口自动化能力。核心执行器 `sisyphus-api-engine` 以 YAML 驱动,支持 CLI 调用和多种报告格式输出。

### 技术栈

- **前端**: Vite 7.2 + React 18.2 + TypeScript 5.9 + Tailwind CSS + shadcn/ui + React Query v5 + Zustand
- **后端**: Python 3.12 + UV + FastAPI 0.115+ + SQLAlchemy 2.0 (async) + Alembic
- **中间件**: PostgreSQL 15 / SQLite + Redis 7 + MinIO
- **引擎**: sisyphus-api-engine (独立子项目,YAML 驱动)

---

## 核心架构

### 三层架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│  页面组件 + React Query (状态管理) + API Client (Axios)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ API Routes  │→ │   Services   │→ │ sisyphus-engine   │  │
│  │ (endpoints) │  │ (业务逻辑层)  │  │  (YAML 驱动)      │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
│         │                                                  │
│         ▼                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Schemas   │  │    Models    │  │  Middleware      │  │
│  │  (Pydantic) │  │  (SQLAlchemy)│  │ (Auth/Log/Error) │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Database (PostgreSQL/SQLite)                   │
│  + Redis (缓存/任务队列) + MinIO (对象存储)                 │
└─────────────────────────────────────────────────────────────┘
```

### 关键设计模式

1. **异步优先**: 所有数据库操作使用 SQLAlchemy 2.0 async,API 端点使用 `async def`
2. **依赖注入**: FastAPI 的 `Depends()` 用于数据库会话、认证、权限检查
3. **Service 层模式**: 复杂业务逻辑封装在 `backend/app/services/`,特别是执行服务
4. **测试覆盖**: 统一测试目录 `tests/`,包含单元测试、接口测试、E2E 测试

---

## 常用开发命令

### 项目管理 (推荐)

```bash
./sisyphus_init.sh start     # 启动所有服务 (Docker 中间件 + 后端 + 前端)
./sisyphus_init.sh stop      # 停止所有服务
./sisyphus_init.sh restart   # 重启所有服务
./sisyphus_init.sh status    # 查看服务状态
./sisyphus_init.sh install   # 安装所有依赖
./sisyphus_init.sh test --all        # 运行所有测试 (后端 + 引擎 Python 单测 + 引擎 YAML 用例 + 自动化 + 前端)
./sisyphus_init.sh test --unit       # 仅运行单元测试 (tests/unit + 引擎 tests/unit)
./sisyphus_init.sh test --interface  # 仅运行接口测试 (tests/interface)
./sisyphus_init.sh test --auto       # 仅运行自动化测试 (tests/auto, Playwright)
./sisyphus_init.sh test --e2e        # 仅运行前端自身 E2E 测试
./sisyphus_init.sh lint      # 运行代码检查
./sisyphus_init.sh migrate   # 数据库迁移
```

### 后端开发

```bash
cd backend

# 依赖管理
uv sync                                    # 同步依赖
uv pip install -e ../Sisyphus-api-engine   # 本地开发时安装引擎

# 开发服务器
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 数据库迁移
uv run alembic revision --autogenerate -m "描述"
uv run alembic upgrade head

# 代码质量
uv run ruff check app/                     # 代码检查
uv run ruff format app/                    # 代码格式化
uv run pyright app/                        # 类型检查

# 测试
uv run --with pytest-asyncio pytest ../tests/unit ../tests/interface -v
uv run pytest tests/unit/test_specific.py -k "test_name" -v
```

### 前端开发

```bash
cd frontend

# 开发服务器
npm run dev

# 代码质量
npm run lint                               # ESLint 检查

# 测试
npm run test                               # Vitest 单元测试
npm run test:e2e                           # Playwright E2E 测试
npm run test:e2e:ui                        # Playwright UI 模式
```

### 引擎开发

```bash
cd Sisyphus-api-engine

# 安装引擎 (开发模式)
uv pip install -e .

# 执行测试用例
sisyphus --case <yaml_file_path>                    # 默认文本报告
sisyphus --case <yaml_file_path> -O json            # JSON 输出 (平台集成)
sisyphus --case <yaml_file_path> -O allure          # Allure 报告
sisyphus --case <yaml_file_path> -O html            # HTML 报告

# 单元测试
uv run python -m pytest tests -v
```

---

## 测试策略

### 测试分层

```
tests/
├── unit/              # 单元测试 (业务逻辑、工具函数)
├── interface/         # API 接口测试 (FastAPI 端点)
└── auto/              # E2E 测试 (Playwright)
```

### 关键测试配置

**pytest-asyncio 要求**:
- 所有异步 fixture 必须使用 `@pytest_asyncio.fixture` 装饰器
- 后端 pyproject.toml 已配置 `asyncio_mode = "auto"`
- 运行测试时需加 `--with pytest-asyncio` 参数

**测试覆盖要求**: 80%+ (单元 + 集成 + E2E)

**默认测试用户**:
```python
# tests/conftest.py
DEFAULT_TEST_USER_ID = "00000000-0000-0000-0000-000000000001"
DEFAULT_TEST_USER_EMAIL = "default-test-user@example.com"
DEFAULT_TEST_USERNAME = "seed_user"
```

**测试认证覆盖**:
- 测试环境下 `get_current_user` 依赖会被覆盖
- 支持从 JWT token 解析或返回默认测试用户
- Token 无效时返回 401 (模拟生产行为)

---

## 数据库操作

### Alembic 迁移流程

1. **修改模型** (`backend/app/models/*.py`)
2. **生成迁移**:
   ```bash
   cd backend
   uv run alembic revision --autogenerate -m "描述变更"
   ```
3. **检查迁移文件** (`backend/alembic/versions/*.py`)
4. **应用迁移**:
   ```bash
   uv run alembic upgrade head
   ```

### 重要: 模型导入规则

**`backend/app/core/db.py` 必须导入所有模型**:
```python
from app import models  # noqa: F401
```

这确保 Alembic 能检测到所有表的变更。新增模型时更新 `backend/app/models/__init__.py`。

### 异步数据库操作

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# 查询
async def get_user(session: AsyncSession, user_id: str):
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

# 创建
async def create_user(session: AsyncSession, data: UserCreate):
    user = User(**data.dict())
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

# 更新
async def update_user(session: AsyncSession, user_id: str, data: UserUpdate):
    user = await session.get(User, user_id)
    if user:
        for field, value in data.dict(exclude_unset=True).items():
            setattr(user, field, value)
        user.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(user)
    return user

# 删除
async def delete_user(session: AsyncSession, user_id: str):
    user = await session.get(User, user_id)
    if user:
        await session.delete(user)
        await session.commit()
```

---

## sisyphus-api-engine 集成

### YAML 驱动核心

引擎通过 YAML 文件驱动测试执行,一个 YAML 文件 = 一个完整测试场景。

**YAML 顶层结构**:
```yaml
config:        # 场景配置 (名称、变量、环境、预处理 SQL)
  name: "测试场景名称"
  project_id: "proj-uuid"
  variables:
    token: "Bearer xxx"
  environment:
    base_url: "https://api-test.example.com"

teststeps:     # 测试步骤列表 (有序执行)
  - name: "步骤1: 登录"
    request:
      method: POST
      url: /auth/login
      json:
        username: "test"
        password: "123456"
    extract:
      login_token: response.json.token

  - name: "步骤2: 获取用户信息"
    request:
      method: GET
      url: /user/info
      headers:
        Authorization: "${login_token}"
    assertion:
      - response.json.code == 0
```

### 后端集成流程

**Service 层** (`backend/app/services/execution/`):

1. **yaml_generator.py**: 前端参数 → YAML 文件 (保存至 `temp/` 目录,UUID 命名)
2. **executor_adapter.py**: 调用引擎 CLI (`sisyphus --case <yaml> -O json`)
3. **result_parser.py**: 解析 JSON 响应 → 数据库记录
4. **keyword_injector.py**: 注入自定义关键字代码
5. **parameter_parser.py**: 解析变量引用 (`${var}`, `{{func()}}`)

**WebSocket 实时推送**:
- 引擎执行过程中通过 WebSocket 推送进度
- 前端建立 WebSocket 连接监听执行状态

---

## API 开发规范

### FastAPI 端点结构

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_session
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/resources", response_model=List[ResourceResponse])
async def list_resources(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # 权限检查
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 业务逻辑
    result = await session.execute(
        select(Resource).where(Resource.project_id == project_id)
    )
    return result.scalars().all()
```

### Pydantic Schema 规范

**创建/更新 Schema** (`backend/app/schemas/`):
```python
from pydantic import BaseModel, ConfigDict

class ResourceCreate(BaseModel):
    name: str
    description: str | None = None
    # 使用 Field 定义验证规则
    priority: str = Field(default="P2", pattern="^P[0-3]$")

class ResourceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    model_config = ConfigDict(from_attributes=True)  # Pydantic v2

class ResourceResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
```

### 错误处理

```python
from fastapi import HTTPException, status
from starlette import status

# 404 Not Found
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Resource not found"
)

# 400 Bad Request
raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Invalid request parameters"
)

# 401 Unauthorized
raise HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid authentication credentials",
)
```

---

## 前端开发规范

### API 调用模式

**React Query 集成**:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '@/api/client'

// 查询
const { data, isLoading, error } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.get(projectId)
})

// 变更
const queryClient = useQueryClient()

const mutation = useMutation({
    mutationFn: (data: ProjectUpdate) => projectsApi.update(projectId, data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
})
```

### Key-Value 工具函数模式

多个页面使用 Key-Value 编辑器 (环境变量、请求头等),**必须使用 trimmedKey**:

```typescript
// ❌ 错误: 可能包含空格键
const keyValueArrayToObject = (pairs: KeyValuePair[]): Record<string, string> => {
    return pairs.reduce((acc, { key, value }) => {
        if (key.trim()) {
            acc[key] = value  // BUG: 未使用 trim 后的 key
        }
        return acc
    }, {} as Record<string, string>)
}

// ✅ 正确: 使用 trimmedKey
const keyValueArrayToObject = (pairs: KeyValuePair[]): Record<string, string> => {
    return pairs.reduce((acc, { key, value }) => {
        const trimmedKey = key.trim()
        if (trimmedKey) {
            acc[trimmedKey] = value
        }
        return acc
    }, {} as Record<string, string>)
}
```

### 代码规范

- 使用 TypeScript 严格模式
- React 组件使用函数式组件 + Hooks
- 状态管理: Zustand (全局状态) + React Query (服务器状态)
- 样式: Tailwind CSS + shadcn/ui 组件

---

## 代码质量工具

### 后端

- **Ruff**: 替代 Flake8 + Black + isort
  - 检查: `uv run ruff check app/`
  - 格式化: `uv run ruff format app/`
  - 配置: `backend/pyproject.toml` [tool.ruff]

- **Pyright**: 类型检查 (basic 模式)
  - 运行: `uv run pyright app/`
  - 配置: `backend/pyproject.toml` [tool.pyright]

- **pytest-asyncio**: 异步测试支持
  - 必须安装: `uv sync --with pytest-asyncio`
  - 所有异步 fixture 使用 `@pytest_asyncio.fixture`

### 前端

- **ESLint**: 代码检查 (flat config)
  - 运行: `npm run lint`
  - 配置: `frontend/eslint.config.js`

- **TypeScript**: 类型检查
  - 运行: `npm run build` (包含 tsc -b)
  - 配置: `frontend/tsconfig.json`

- **Vitest**: 单元测试
  - 运行: `npm run test`
  - UI 模式: `npm run test:ui`

- **Playwright**: E2E 测试
  - 运行: `npm run test:e2e`
  - UI 模式: `npm run test:e2e:ui`

---

## 环境配置

### 后端环境变量 (`backend/.env`)

```bash
# 数据库
DATABASE_URL="sqlite+aiosqlite:///./sisyphus.db"  # 开发
# DATABASE_URL="postgresql+asyncpg://sisyphus:sisyphus123@localhost:5432/sisyphus"  # 生产

# 安全
SECRET_KEY="change-me-in-production"
AUTH_DISABLED=true  # 开发模式禁用认证

# 中间件
REDIS_URL="redis://localhost:6379/0"
MINIO_ENDPOINT="localhost:9000"
```

### 前端环境变量 (`frontend/.env`)

```bash
VITE_API_BASE_URL="http://localhost:8000/api/v1"
VITE_AUTH_DISABLED=true
VITE_DEV_MODE_SKIP_LOGIN=true
```

### Docker 中间件

```bash
# 启动所有中间件 (PostgreSQL, Redis, MinIO)
docker compose up -d

# 查看状态
docker compose ps

# 停止
docker compose down
```

---

## 关键文件路径

### 后端

```
backend/app/
├── main.py                      # FastAPI 应用入口,中间件配置
├── core/
│   ├── config.py                # 配置管理 (Pydantic Settings)
│   ├── db.py                    # 数据库引擎,Session 工厂
│   ├── security.py              # JWT 认证,密码哈希
│   └── scheduler.py             # APScheduler 后台任务
├── models/                      # SQLAlchemy 模型 (必须全部导入到 db.py)
├── schemas/                     # Pydantic Schema
├── api/v1/endpoints/            # API 路由端点
├── services/
│   └── execution/               # 测试执行服务 (引擎集成)
├── middleware/                  # 自定义中间件 (错误处理、日志、安全)
└── utils/                       # 工具函数
```

### 前端

```
frontend/src/
├── api/
│   └── client.ts                # Axios 客户端,API 函数
├── pages/                       # 页面组件
├── components/
│   ├── ui/                      # shadcn/ui 组件
│   └── [业务组件]               # 业务组件
├── contexts/                    # React Context
├── lib/                         # 工具函数
├── config/                      # 配置文件
└── i18n/                        # 国际化
```

### 测试

```
tests/
├── conftest.py                  # pytest 配置,共享 fixtures
├── unit/                        # 单元测试
└── interface/                   # API 接口测试
```

---

## 常见问题

### 后端启动失败

1. **数据库连接错误**: 确保 Docker 中间件已启动 (`docker compose up -d`)
2. **迁移未执行**: `cd backend && uv run alembic upgrade head`
3. **端口冲突**: 后端默认 8000,检查端口占用

### 前端 API 请求失败

1. **后端未启动**: 确认后端运行在 `http://localhost:8000`
2. **CORS 错误**: 检查 `backend/app/main.py` CORS 配置
3. **环境变量**: 检查 `frontend/.env` 中 `VITE_API_BASE_URL`

### 测试失败

1. **pytest-asyncio 错误**: 确保使用 `@pytest_asyncio.fixture` 装饰器
2. **数据库错误**: 测试使用内存 SQLite,检查 fixture 配置
3. **认证错误**: 测试环境默认覆盖认证,检查 `tests/conftest.py`

### 引擎集成问题

1. **引擎未安装**: `cd backend && uv pip install -e ../Sisyphus-api-engine`
2. **YAML 语法错误**: 参考 `docs/Sisyphus-api-engine YAML 输入规范.md`
3. **权限问题**: 确保 `temp/` 目录有写权限

---

## Git 工作流

### 提交规范

使用 Conventional Commits:
- `feat:` 新功能
- `fix:` Bug 修复
- `refactor:` 代码重构
- `docs:` 文档更新
- `test:` 测试相关
- `chore:` 构建/工具链变更

### 代码审查

- 使用 `everything-claude-code:code-reviewer` agent 主动审查代码
- 所有 PR 必须通过测试
- 安全相关修改需使用 `everything-claude-code:security-reviewer`

---

## 文档参考

- [需求文档](./docs/Sisyphus-X需求文档.md)
- [开发任务清单](./docs/开发任务清单.md)
- [YAML 输入规范](./docs/Sisyphus-api-engine%20YAML%20输入规范.md)
- [JSON 输出规范](./docs/Sisyphus-api-engine%20JSON%20输出规范.md)
- [变更日志](./CHANGELOG.md)
