<div align="center">

# 🚀 SisyphusX Backend

**AI 驱动的企业级自动化测试平台 - 后端服务**

[![Python](https://img.shields.io/badge/python-3.12+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/fastapi-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![UV](https://img.shields.io/badge/uv-0.10+-purple.svg)](https://github.com/astral-sh/uv)
[![Ruff](https://img.shields.io/badge/ruff-0.15+-yellow.svg)](https://github.com/astral-sh/ruff)

</div>

---

## 📋 目录

- [✨ 核心特性](#-核心特性)
- [🏗️ 技术栈](#-技术栈)
- [🚀 快速开始](#-快速开始)
- [📦 项目管理](#-项目管理)
- [🔧 开发工具](#-开发工具)
- [📖 API 文档](#-api-文档)
- [🧪 测试](#-测试)
- [💾 数据库](#-数据库)
- [📝 开发指南](#-开发指南)
- [❓ 常见问题](#-常见问题)

---

## ✨ 核心特性

### 🤖 AI 智能功能
- **智能需求分析** - 基于 LangGraph 的多轮对话需求收集
- **AI 用例生成** - 自动生成 YAML 格式的测试用例
- **多模型支持** - 支持 OpenAI、Anthropic、智谱AI 等
- **配置管理** - 灵活的 AI 提供商配置系统

### 🎯 API 测试管理
- **项目组织** - 多项目、多环境支持
- **接口管理** - RESTful API 接口定义和调试
- **用例管理** - 可视化用例编辑器
- **场景编排** - 基于 ReactFlow 的测试流程设计
- **执行引擎** - 异步测试执行和实时结果展示

### 🔐 安全特性
- **JWT 认证** - 基于 Token 的用户认证
- **OAuth 集成** - 支持 GitHub、Google 登录
- **权限管理** - 基于角色的访问控制（RBAC）
- **审计日志** - 完整的操作审计追踪

### ⚡ 高性能
- **异步架构** - 基于 asyncio 的高性能异步处理
- **数据库连接池** - 优化的数据库连接管理
- **缓存策略** - Redis 缓存提升响应速度
- **后台任务** - APScheduler 定时任务调度

---

## 🏗️ 技术栈

### 核心框架
- **FastAPI 0.115+** - 现代高性能 Web 框架
- **SQLModel 0.0+** - 基于 SQLAlchemy + Pydantic 的 ORM
- **Uvicorn** - ASGI 服务器
- **Alembic** - 数据库迁移工具

### 数据存储
- **PostgreSQL** - 生产关系型数据库
- **SQLite** - 开发/测试数据库
- **Redis** - 缓存和会话存储
- **MinIO** - 对象存储（S3 兼容）

### AI/ML
- **LangChain 0.3+** - LLM 应用框架
- **LangGraph 0.2+** - AI Agent 编排
- **LangChain OpenAI** - OpenAI 集成
- **LangChain Anthropic** - Claude 集成
- **LangChain Community** - 社区扩展

### 开发工具
- **UV 0.10+** - 快速 Python 包管理器
- **Ruff 0.15+** - 代码检查和格式化
- **Pyright** - 静态类型检查
- **Pytest** - 测试框架
- **Rich** - 终端美化

---

## 🚀 快速开始

### 环境要求

- **Python**: 3.12 或更高版本
- **UV**: 最新版本的 Python 包管理器
- **Docker**: 用于运行 PostgreSQL、Redis、MinIO

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/your-org/sisyphus-x.git
cd sisyphus-x/backend

# 2. 安装 UV（如果还没安装）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 3. 同步依赖（自动创建虚拟环境）
uv sync

# 4. 启动基础设施服务（在项目根目录）
cd ..
docker compose up -d

# 5. 配置环境变量
cp .env.example .env
# 编辑 .env 文件配置数据库连接、AI API Key 等

# 6. 返回后端目录并运行数据库迁移
cd backend
uv run alembic upgrade head

# 7. 启动开发服务器
uv run uvicorn app.main:app --reload --port 8000

# 8. 访问 API 文档
open http://localhost:8000/docs
```

### 验证安装

```bash
# 运行验证脚本
./verify_migration.sh

# 或单独测试
./scripts/test_env.sh      # 环境测试
./scripts/test_lint.sh     # 代码检查
./scripts/test_type.sh     # 类型检查
```

---

## 📦 项目管理

### 依赖管理

```bash
# 添加生产依赖
uv add fastapi

# 添加开发依赖
uv add --dev pytest

# 移除依赖
uv remove package-name

# 更新所有依赖
uv lock --upgrade

# 同步依赖（安装/更新）
uv sync

# 查看依赖树
uv tree
```

### 配置文件

| 文件 | 说明 |
|------|------|
| `pyproject.toml` | 项目配置和依赖定义 |
| `uv.lock` | 锁定的依赖版本（不手动编辑） |
| `.python-version` | Python 版本锁定（3.12） |
| `pyrightconfig.json` | Pyright 类型检查配置 |
| `.env` | 环境变量（不提交到 Git） |

---

## 🔧 开发工具

### 代码质量

```bash
# 代码检查（Ruff）
uv run ruff check app/

# 自动修复问题
uv run ruff check app/ --fix

# 格式化代码
uv run ruff format app/

# 检查格式（不修改）
uv run ruff format --check app/
```

### 类型检查

```bash
# 运行 Pyright 类型检查
uv run pyright app/

# 输出级别设置
# typeCheckingMode: "basic" (宽松，默认)
# typeCheckingMode: "strict" (严格)
```

### Rich 工具

```bash
# 运行开发工具（查看环境信息）
uv run python dev_tools.py

# Rich 日志输出示例
from rich.console import Console
console = Console()
console.print("[bold green]成功![/bold green]")
```

---

## 📖 API 文档

启动应用后，可以访问以下文档：

| 文档类型 | 地址 | 说明 |
|---------|------|------|
| **Swagger UI** | http://localhost:8000/docs | 交互式 API 文档 |
| **ReDoc** | http://localhost:8000/redoc | 美观的 API 文档 |
| **OpenAPI** | http://localhost:8000/openapi.json | OpenAPI 规范 |

### 主要端点

| 模块 | 路径 | 描述 |
|------|------|------|
| 项目 | `/api/v1/projects` | 项目 CRUD 操作 |
| 接口 | `/api/v1/interfaces` | 接口管理和调试 |
| 测试用例 | `/api/v1/testcases` | 用例管理 |
| 场景 | `/api/v1/scenarios` | 场景编排 |
| AI 助手 | `/api/v1/ai/clarification` | AI 需求分析 |
| 用户 | `/api/v1/users` | 用户管理 |
| 引擎 | `/api/v1/engine` | 测试执行引擎 |

---

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
uv run pytest tests/ -v

# 运行特定文件
uv run pytest tests/services/test_llm_service.py -v

# 带覆盖率报告
uv run pytest tests/ --cov=app --cov-report=html

# 查看覆盖率报告
open htmlcov/index.html
```

### 测试规范

- 使用 `pytest` 作为测试框架
- 使用 `pytest-asyncio` 支持异步测试
- 测试文件命名：`test_*.py`
- 测试函数命名：`test_*()`

### 编写测试

```python
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_create_project(client: AsyncClient, session: AsyncSession):
    response = await client.post(
        "/api/v1/projects/",
        json={"name": "测试项目", "description": "项目描述"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "测试项目"
```

---

## 💾 数据库

### 数据库迁移

```bash
# 创建迁移（基于模型变更）
uv run alembic revision --autogenerate -m "添加用户表"

# 应用迁移
uv run alembic upgrade head

# 回滚一个版本
uv run alembic downgrade -1

# 查看迁移历史
uv run alembic history

# 查看当前版本
uv run alembic current

# 验证迁移脚本
uv run alembic check
```

### 数据库切换

编辑 `.env` 文件中的 `DATABASE_URL`：

```bash
# SQLite（开发环境）
DATABASE_URL=sqlite+aiosqlite:///./sisyphus.db

# PostgreSQL（生产环境）
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/sisyphus

# 带连接池的 PostgreSQL
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/sisyphus?pool_size=20&max_overflow=10
```

### 数据模型

数据库模型定义在 `app/models/` 目录：

```python
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional

class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

---

## 📝 开发指南

### 项目结构

```
app/
├── api/                    # API 路由
│   └── v1/
│       ├── api.py          # 路由注册
│       ├── deps.py         # 依赖注入（认证等）
│       └── endpoints/      # API 端点实现
│           ├── projects.py
│           ├── interfaces.py
│           ├── ai_clarification.py
│           └── ...
├── core/                   # 核心配置
│   ├── config.py           # 应用配置
│   ├── db.py               # 数据库连接
│   ├── security.py         # 安全相关（JWT、密码）
│   └── scheduler.py        # 定时任务
├── models/                 # SQLModel 数据模型
│   ├── project.py
│   ├── user.py
│   └── ai_config.py
├── schemas/                # Pydantic schemas（API 契约）
│   ├── project.py
│   ├── user.py
│   └── ai_config.py
├── services/               # 业务逻辑层
│   ├── ai/                 # AI 相关服务
│   │   ├── llm_service.py
│   │   └── graphs/
│   │       └── requirement_clarification_graph.py
│   └── project_service.py
├── utils/                  # 工具函数
│   └── rich_logger.py      # Rich 日志工具
└── main.py                 # FastAPI 应用入口
```

### 添加新功能

1. **创建数据模型** (`app/models/`)
2. **创建 Pydantic schemas** (`app/schemas/`)
3. **创建 API 端点** (`app/api/v1/endpoints/`)
4. **注册路由** (`app/api/v1/api.py`)
5. **创建数据库迁移** (`uv run alembic revision --autogenerate`)
6. **编写测试** (`tests/`)

### 代码规范

- **类型注解** - 所有公共函数必须添加类型注解
- **异步优先** - 所有数据库和 HTTP 操作使用 async/await
- **错误处理** - 使用自定义异常类，返回适当的 HTTP 状态码
- **文档字符串** - 所有公共 API 添加 docstring

### 代码检查钩子

```bash
# 安装 pre-commit hooks
pre-commit install

# 手动运行所有检查
pre-commit run --all-files
```

---

## ❓ 常见问题

### Q: 如何添加新的 API 端点？

1. 在 `app/api/v1/endpoints/` 创建新文件
2. 定义 `APIRouter` 和路由处理函数
3. 在 `app/api/v1/api.py` 注册路由
4. 在 `app/schemas/` 定义请求/响应模型
5. 在 `app/models/` 创建数据模型（如需要）

### Q: 如何调试类型检查错误？

运行 `uv run pyright app/` 查看详细错误。修复方法：
- 添加类型注解
- 使用 `# type: ignore` 抑制误报
- 调整 `pyrightconfig.json` 检查级别

### Q: 如何配置 AI 提供商？

通过 API 或数据库配置：

```bash
# 添加 OpenAI 配置
curl -X POST http://localhost:8000/api/v1/ai/configs \
  -H "Content-Type: application/json" \
  -d '{
    "provider_name": "openai",
    "model_name": "gpt-4",
    "api_key": "sk-...",
    "is_default": true
  }'
```

### Q: 如何切换到生产环境？

1. 修改 `.env` 文件
2. 设置 `AUTH_DISABLED=false`
3. 使用强密码作为 `SECRET_KEY`
4. 切换到 PostgreSQL 数据库
5. 运行 `uv run alembic upgrade head`

### Q: UV 比 Conda 快多少？

- **依赖安装**: 10-100 倍速度提升
- **环境创建**: 秒级完成
- **依赖解析**: 更快速且准确
- **锁文件**: uv.lock 提供精确版本控制

---

## 📚 相关文档

- [开发指南](./DEVELOPMENT.md) - 详细的开发环境配置和最佳实践
- [迁移笔记](./MIGRATION_NOTES.md) - 从 Conda 迁移到 UV 的说明
- [迁移计划](./01_MIGRATION_PLAN.md) - 完整的 UV 迁移计划
- [变更日志](./CHANGELOG.md) - 项目变更历史

---

## 🔐 安全

- ✅ 所有敏感信息使用环境变量
- ✅ JWT Token 认证
- ✅ CORS 保护
- ✅ SQL 注入防护（使用 ORM）
- ✅ XSS 防护（Pydantic 数据验证）
- ✅ 密码哈希（bcrypt）

---

## 📄 许可证

MIT License - 详见 [LICENSE](../LICENSE)

---

## 🙏 致谢

- [FastAPI](https://fastapi.tiangolo.com/)
- [SQLModel](https://sqlmodel.tiangolo.com/)
- [UV](https://github.com/astral-sh/uv)
- [LangChain](https://python.langchain.com/)
- [Anthropic Claude](https://www.anthropic.com/)

---

<div align="center">

**Made with ❤️ by SisyphusX Team**

</div>
