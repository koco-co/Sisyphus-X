# SisyphusX 后端

基于 FastAPI + SQLModel + PostgreSQL 构建的高性能 API 后端。

## 技术栈

- **FastAPI** - 高性能 API 框架
- **SQLModel** - ORM (SQLAlchemy + Pydantic)
- **PostgreSQL** - 数据库
- **Redis** - 缓存
- **httpx** - HTTP 客户端
- **Pydantic** - 数据验证

## 目录结构

```
app/
├── api/
│   └── v1/
│       ├── api.py          # 路由注册
│       └── endpoints/      # API 端点
│           ├── projects.py
│           ├── interfaces.py
│           ├── testcases.py
│           ├── scenarios.py
│           └── engine.py
├── core/
│   ├── config.py           # 配置管理
│   └── db.py               # 数据库连接
├── models/                 # SQLModel 模型
│   ├── project.py
│   ├── test_case.py
│   ├── scenario.py
│   └── keyword.py
├── schemas/                # Pydantic schemas
└── main.py                 # FastAPI 入口
```

## API 端点

| 模块 | 路径 | 描述 |
|------|------|------|
| 项目 | `/api/v1/projects` | 项目 CRUD |
| 接口 | `/api/v1/interfaces` | 接口管理 + 调试 |
| 用例 | `/api/v1/testcases` | 用例 CRUD |
| 场景 | `/api/v1/scenarios` | 场景 + 执行 |
| 引擎 | `/api/v1/engine` | 调用 api-engine |

## 开发命令

```bash
# 激活环境
conda activate platform-auto

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
uvicorn app.main:app --reload

# 查看 API 文档
open http://localhost:8000/docs
```

## 环境变量

配置在项目根目录 `.env` 文件中：

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=sisyphus
POSTGRES_PASSWORD=sisyphus_pass
POSTGRES_DB=sisyphus_db
```
