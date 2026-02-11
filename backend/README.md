# SisyphusX Backend

基于 FastAPI 构建的现代化后端服务，提供 RESTful API 和 AI 驱动的测试自动化能力。

## 技术栈

- **FastAPI** 0.115+ - 高性能异步 Web 框架
- **SQLModel** - 现代 ORM（SQLAlchemy + Pydantic）
- **Alembic** - 数据库迁移工具
- **UV** - 快速 Python 包管理器
- **Pytest** - 测试框架
- **Ruff** - 代码检查和格式化
- **Pyright** - 类型检查

## 目录结构

```
backend/
├── app/
│   ├── api/                    # API 路由
│   │   └── v1/
│   │       ├── api.py         # 路由注册
│   │       └── endpoints/     # 端点实现
│   ├── core/                   # 核心配置
│   │   ├── config.py          # 配置管理
│   │   ├── db.py              # 数据库连接
│   │   ├── security.py        # 认证和安全
│   │   └── logging_config.py  # 日志配置
│   ├── models/                 # 数据库模型
│   ├── schemas/                # Pydantic schemas
│   ├── services/               # 业务逻辑
│   │   ├── ai/                # AI 服务
│   │   └── execution/         # 测试执行
│   └── main.py                # 应用入口
├── alembic/                    # 数据库迁移
├── tests/                      # 测试文件
├── pyproject.toml             # UV 项目配置
├── pyrightconfig.json         # Pyright 配置
└── .python-version            # Python 版本锁定
```

## 快速开始

### 1. 安装 UV

```bash
pip install uv
```

### 2. 安装依赖

```bash
cd backend
uv sync
```

### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
DATABASE_URL=sqlite+aiosqlite:///./sisyphus.db
SECRET_KEY=your-secret-key-here
AUTH_DISABLED=true
```

### 4. 运行数据库迁移

```bash
cd backend
uv run alembic upgrade head
```

### 5. 启动开发服务器

```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

访问 API 文档：http://localhost:8000/docs

## 开发工作流

### 添加新依赖

```bash
# 生产依赖
uv add fastapi

# 开发依赖
uv add --dev pytest
```

### 数据库迁移

```bash
# 创建迁移
uv run alembic revision --autogenerate -m "描述变更"

# 应用迁移
uv run alembic upgrade head

# 回滚迁移
uv run alembic downgrade -1
```

### 代码质量检查

```bash
# 代码检查
uv run ruff check app/

# 代码格式化
uv run ruff format app/

# 类型检查
uv run pyright app/

# 运行所有检查
uv run ruff check app/ && uv run ruff format --check app/ && uv run pyright app/
```

### 运行测试

```bash
# 运行所有测试
uv run pytest tests/ -v

# 运行特定测试文件
uv run pytest tests/test_api.py -v

# 运行带覆盖率的测试
uv run pytest tests/ --cov=app --cov-report=html
```

## API 端点

### 认证

- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/register` - 用户注册
- `GET /api/v1/auth/me` - 获取当前用户信息

### 项目管理

- `GET /api/v1/projects/` - 获取项目列表
- `POST /api/v1/projects/` - 创建项目
- `GET /api/v1/projects/{id}` - 获取项目详情
- `PUT /api/v1/projects/{id}` - 更新项目
- `DELETE /api/v1/projects/{id}` - 删除项目

### 测试用例

- `GET /api/v1/testcases/` - 获取测试用例列表
- `POST /api/v1/testcases/` - 创建测试用例
- `POST /api/v1/testcases/{id}/execute` - 执行测试用例

### AI 功能

- `POST /api/v1/ai/clarify` - AI 需求澄清
- `POST /api/v1/ai/generate` - AI 用例生成

详细 API 文档：http://localhost:8000/docs

## 添加新功能

### 1. 创建数据库模型

```python
# app/models/feature.py
from sqlmodel import SQLModel, Field
from typing import Optional

class Feature(SQLModel, table=True):
    __tablename__ = "features"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
```

### 2. 创建 Pydantic Schema

```python
# app/schemas/feature.py
from pydantic import BaseModel

class FeatureCreate(BaseModel):
    name: str
    description: Optional[str] = None

class FeatureResponse(FeatureCreate):
    id: int

    class Config:
        from_attributes = True
```

### 3. 创建 API 端点

```python
# app/api/v1/endpoints/feature.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models.feature import Feature
from app.schemas.feature import FeatureCreate, FeatureResponse

router = APIRouter()

@router.get("/", response_model=list[FeatureResponse])
async def list_features(
    session: AsyncSession = Depends(get_session)
) -> list[FeatureResponse]:
    result = await session.execute(select(Feature))
    return result.scalars().all()

@router.post("/", response_model=FeatureResponse)
async def create_feature(
    data: FeatureCreate,
    session: AsyncSession = Depends(get_session)
) -> FeatureResponse:
    feature = Feature(**data.model_dump())
    session.add(feature)
    await session.commit()
    await session.refresh(feature)
    return feature
```

### 4. 注册路由

```python
# app/api/v1/api.py
from app.api.v1.endpoints import feature

api_router.include_router(
    feature.router,
    prefix="/features",
    tags=["features"]
)
```

### 5. 创建并应用迁移

```bash
uv run alembic revision --autogenerate -m "Add features table"
uv run alembic upgrade head
```

## 配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | 数据库连接字符串 | `sqlite+aiosqlite:///./sisyphus.db` |
| `REDIS_URL` | Redis 连接字符串 | `redis://localhost:6379/0` |
| `SECRET_KEY` | JWT 密钥 | - |
| `AUTH_DISABLED` | 禁用认证（开发模式） | `false` |
| `ANTHROPIC_API_KEY` | Anthropic API Key | - |
| `OPENAI_API_KEY` | OpenAI API Key | - |

### CORS 配置

在 `app/main.py` 中配置：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 认证

### JWT 认证流程

1. 用户登录获取 Token
2. 前端在请求头中携带 Token
3. 后端验证 Token 并解析用户信息

### 禁用认证（开发模式）

```env
# .env
AUTH_DISABLED=true
```

## AI 功能

### LangGraph Agent

AI 功能基于 LangGraph 构建，支持：

- **需求澄清 Agent** - 多轮对话收集测试需求
- **用例生成 Agent** - 自动生成测试用例 YAML
- **智能分析** - 测试结果分析和建议

### AI 配置

```python
# app/core/config.py
class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    DEFAULT_AI_MODEL: str = "claude-3-5-sonnet-20241022"
```

## 测试执行

### YAML 测试格式

```yaml
name: "API 测试示例"
config:
  base_url: "https://api.example.com"
  timeout: 30

steps:
  - name: "用户登录"
    request:
      url: /api/auth/login
      method: POST
      json:
        username: "test"
        password: "123456"
    validate:
      - eq: [status_code, 200]
```

### 执行器

测试执行器位于 `app/services/execution/`：

- `test_executor.py` - 主执行器
- `yaml_generator.py` - YAML 生成
- `result_parser.py` - 结果解析

## 日志

日志配置在 `app/core/logging_config.py`：

```python
LOGGING = {
    "version": 1,
    "handlers": {
        "default": {
            "class": "logging.StreamHandler",
        },
    },
    "loggers": {
        "": {"handlers": ["default"], "level": "INFO"},
    },
}
```

## 常见问题

### 数据库连接失败

```bash
# 检查数据库状态
docker compose ps postgres

# 检查连接字符串
echo $DATABASE_URL
```

### 迁移失败

```bash
# 查看迁移状态
uv run alembic current

# 回滚迁移
uv run alembic downgrade -1
```

### 端口被占用

```bash
# 查找占用进程
lsof -i :8000

# 杀死进程
kill -9 <PID>
```

## 相关文档

- [../README.md](../README.md) - 项目主文档
- [../CLAUDE.md](../CLAUDE.md) - AI 助手开发指南
- [../docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md) - 开发指南
- [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) - 部署指南
- [../docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) - 故障排查

---

**最后更新**: 2026-02-11
