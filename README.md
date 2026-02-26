<div align="center">

# Sisyphus-X

**自动化测试管理平台**

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)]()
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=black)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)]()
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite&logoColor=white)]()

[需求文档](./docs/Sisyphus-X需求文档.md) · [开发任务](./docs/开发任务清单.md) · [API 文档](http://localhost:8000/docs) · [变更日志](./CHANGELOG.md)

</div>

---

## 产品定位

Sisyphus-X 是一款面向测试团队的自动化测试管理平台，提供从「接口定义 → 场景编排 → 测试计划 → 测试报告」的全链路接口自动化能力。核心执行器 `sisyphus-api-engine` 以 YAML 驱动，支持 CLI 调用和多种报告格式输出。

### 核心能力

| 能力域     | 说明                                                 |
| ---------- | ---------------------------------------------------- |
| 项目管理   | 项目信息维护、数据库配置管理                         |
| 关键字配置 | 内置关键字 + 自定义关键字扩展                        |
| 接口定义   | 接口目录管理、调试、cURL/Swagger 导入、环境管理      |
| 场景编排   | 测试步骤拖拽排序、关键字级联配置、数据驱动           |
| 测试计划   | 多场景编排执行、实时进度报告、终止/暂停              |
| 测试报告   | 平台报告 + Allure 报告、历史记录、导出               |
| 全局参数   | 工具函数注册与 `{{参数方法名}}` 引用                 |
| 核心执行器 | sisyphus-api-engine: YAML 驱动、CLI 调用、多格式输出 |

### 后续规划

- WEB 自动化 (sisyphus-web-engine)
- APP 自动化 (sisyphus-app-engine)
- 消息通知管理

---

## 技术栈

<table>
<tr>
<td width="33%" valign="top">

### 前端

- Vite 7.2 + React 18.2 + TypeScript 5.9
- Tailwind CSS + shadcn/ui
- React Query v5 + Zustand
- Monaco Editor
- Vitest + Playwright

</td>
<td width="33%" valign="top">

### 后端

- Python 3.12 + UV
- FastAPI 0.115+
- SQLAlchemy 2.0 (async)
- PostgreSQL / SQLite
- Alembic (migrations)
- Ruff + Pyright

</td>
<td width="33%" valign="top">

### 中间件 & 引擎

- PostgreSQL 15
- Redis 7
- MinIO (对象存储)
- sisyphus-api-engine (YAML 驱动)
- Docker Compose

</td>
</tr>
</table>

---

## 项目结构

```
Sisyphus-X/
├── frontend/                   # React 前端应用
│   ├── src/
│   │   ├── api/                # API 客户端 (Axios + JWT)
│   │   ├── components/         # UI 组件 (shadcn/ui + 业务组件)
│   │   ├── pages/              # 页面组件
│   │   ├── contexts/           # React Context
│   │   ├── i18n/               # 国际化
│   │   └── lib/                # 工具函数
│   └── package.json
│
├── backend/                    # FastAPI 后端应用
│   ├── app/
│   │   ├── api/v1/endpoints/   # API 路由
│   │   ├── models/             # SQLAlchemy 数据模型
│   │   ├── schemas/            # Pydantic Schema
│   │   ├── services/           # 业务逻辑层
│   │   ├── core/               # 核心配置 (DB/Security/Config)
│   │   └── middleware/         # 中间件
│   ├── alembic/                # 数据库迁移
│   └── pyproject.toml          # 依赖 + Ruff/Pyright/Pytest 配置
│
├── Sisyphus-api-engine/        # 核心执行引擎 (独立子项目)
│   ├── apirun/                 # 主 Python 包
│   │   ├── core/               # 核心数据模型
│   │   ├── parser/             # YAML 解析器
│   │   ├── executor/           # 测试执行器
│   │   ├── validation/         # 断言验证引擎
│   │   ├── extractor/          # 变量提取器
│   │   ├── data_driven/        # 数据驱动测试
│   │   ├── result/             # 结果收集器
│   │   ├── websocket/          # WebSocket 实时推送
│   │   └── utils/              # 工具函数
│   ├── docs/                   # 引擎文档
│   ├── tests/
│   │   ├── unit/               # Python 单元测试 (pytest)
│   │   └── yaml/               # YAML 测试用例 (sisyphus --cases)
│   └── pyproject.toml
│
├── tests/                      # 统一测试目录
│   ├── unit/                   # 单元测试
│   ├── interface/              # 接口测试
│   └── auto/                   # 自动化测试 (Playwright E2E)
│
├── docs/                       # 项目文档
│   ├── Sisyphus-X需求文档.md
│   ├── Sisyphus-api-engine YAML 输入规范.md
│   ├── Sisyphus-api-engine JSON 输出规范.md
│   └── 开发任务清单.md
│
├── docker-compose.yml          # 中间件编排 (PostgreSQL/Redis/MinIO)
├── sisyphus_init.sh            # 项目管理脚本
├── .env.example                # 环境变量模板
└── CHANGELOG.md
```

---

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.12+
- [UV](https://docs.astral.sh/uv/) (Python 包管理器)
- Docker & Docker Compose
- Git

### 一键启动

```bash
git clone https://github.com/koco-co/Sisyphus-X
cd Sisyphus-X

# 使用项目管理脚本
./sisyphus_init.sh install   # 安装所有依赖
./sisyphus_init.sh start     # 启动所有服务 (Docker 中间件 + 后端 + 前端)
```

### 手动启动

```bash
# 1. 启动中间件 (PostgreSQL, Redis, MinIO)
docker compose up -d

# 2. 启动后端
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. 启动前端 (新终端)
cd frontend
npm install
npm run dev
```

### 访问服务

| 服务               | 地址                        |
| ------------------ | --------------------------- |
| 前端界面           | http://localhost:5173       |
| API 文档 (Swagger) | http://localhost:8000/docs  |
| API 文档 (ReDoc)   | http://localhost:8000/redoc |
| MinIO 控制台       | http://localhost:9001       |

---

## 环境变量

### 后端 (`backend/.env`)

| 变量名           | 说明              | 默认值                              |
| ---------------- | ----------------- | ----------------------------------- |
| `DATABASE_URL`   | 数据库连接 URL    | `sqlite+aiosqlite:///./sisyphus.db` |
| `SECRET_KEY`     | JWT 密钥          | `change-me-in-production`           |
| `AUTH_DISABLED`  | 禁用认证 (仅开发) | `true`                              |
| `REDIS_URL`      | Redis 连接 URL    | `redis://localhost:6379/0`          |
| `MINIO_ENDPOINT` | MinIO 地址        | `localhost:9000`                    |

### 前端 (`frontend/.env`)

| 变量名                     | 说明         | 默认值                         |
| -------------------------- | ------------ | ------------------------------ |
| `VITE_API_BASE_URL`        | API 基础 URL | `http://localhost:8000/api/v1` |
| `VITE_AUTH_DISABLED`       | 禁用认证     | `true`                         |
| `VITE_DEV_MODE_SKIP_LOGIN` | 跳过登录     | `true`                         |

完整配置参考 [`.env.example`](./.env.example)。

---

## 开发命令

### 项目管理脚本

```bash
./sisyphus_init.sh start     # 启动所有服务
./sisyphus_init.sh stop      # 停止所有服务
./sisyphus_init.sh restart   # 重启所有服务
./sisyphus_init.sh status    # 查看服务状态
./sisyphus_init.sh install   # 安装所有依赖
./sisyphus_init.sh lint      # 运行代码检查
./sisyphus_init.sh test --all        # 运行所有测试 (后端 + 引擎 Python 单测 + 引擎 YAML 用例 + 自动化 + 前端)
./sisyphus_init.sh test --unit       # 仅运行单元测试 (tests/unit + 引擎 tests/unit)
./sisyphus_init.sh test --interface  # 仅运行接口测试 (tests/interface)
./sisyphus_init.sh test --auto       # 仅运行自动化测试 (tests/auto, Playwright)
./sisyphus_init.sh test --e2e        # 仅运行前端自身 E2E 测试
./sisyphus_init.sh migrate   # 数据库迁移
./sisyphus_init.sh logs      # 查看日志
./sisyphus_init.sh clean     # 清理临时文件
./sisyphus_init.sh help      # 帮助信息
```

### 前端

| 命令               | 说明                |
| ------------------ | ------------------- |
| `npm run dev`      | 启动开发服务器      |
| `npm run build`    | 构建生产版本        |
| `npm run lint`     | ESLint 代码检查     |
| `npm run test`     | Vitest 单元测试     |
| `npm run test:e2e` | Playwright E2E 测试 |

### 后端

| 命令                                              | 说明             |
| ------------------------------------------------- | ---------------- |
| `uv run uvicorn app.main:app --reload`            | 启动开发服务器   |
| `uv run ruff check app/`                          | Ruff 代码检查    |
| `uv run ruff format app/`                         | Ruff 代码格式化  |
| `uv run pyright app/`                             | Pyright 类型检查 |
| `uv run pytest ../tests/unit ../tests/interface -v` | 运行测试         |
| `uv run alembic revision --autogenerate -m "msg"` | 创建迁移         |
| `uv run alembic upgrade head`                     | 应用迁移         |

### 引擎

| 命令                                                  | 说明                     |
| ----------------------------------------------------- | ------------------------ |
| `sisyphus --case <yaml>`                              | 执行测试用例 (文本报告)  |
| `sisyphus --case <yaml> -O json`                      | JSON 输出 (平台集成模式) |
| `sisyphus --case <yaml> -O allure --allure-dir <dir>` | Allure 报告              |
| `sisyphus --case <yaml> -O html --html-dir <dir>`     | HTML 报告                |

---

## 代码规范

| 项目         | 工具                 | 说明                                                          |
| ------------ | -------------------- | ------------------------------------------------------------- |
| 后端代码检查 | Ruff                 | 替代 Flake8 + Black + isort                                   |
| 后端类型检查 | Pyright              | basic 模式                                                    |
| 前端代码检查 | ESLint               | flat config                                                   |
| 提交检查     | pre-commit           | Ruff + trailing-whitespace + YAML/JSON/TOML 检查              |
| 提交规范     | Conventional Commits | `feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:` |
| 编码风格     | Google 开发范式      | 注释使用中文                                                  |

---

## 文档

| 文档                                                             | 说明                                  |
| ---------------------------------------------------------------- | ------------------------------------- |
| [需求文档](./docs/Sisyphus-X需求文档.md)                         | 完整需求规格说明书                    |
| [开发任务清单](./docs/开发任务清单.md)                           | 前端/后端/引擎开发任务拆分            |
| [YAML 输入规范](./docs/Sisyphus-api-engine%20YAML%20输入规范.md) | sisyphus-api-engine YAML 格式定义     |
| [JSON 输出规范](./docs/Sisyphus-api-engine%20JSON%20输出规范.md) | sisyphus-api-engine JSON 响应格式定义 |
| [变更日志](./CHANGELOG.md)                                       | 版本变更记录                          |

---

## 常见问题

<details>
<summary>后端启动时报数据库连接错误？</summary>

1. 确保 Docker 中间件已启动: `docker compose up -d`
2. 确保迁移已执行: `cd backend && uv run alembic upgrade head`
3. 检查 `backend/.env` 中 `DATABASE_URL` 配置
</details>

<details>
<summary>前端 API 请求失败？</summary>

1. 确认后端运行在 `http://localhost:8000`
2. 检查 `frontend/.env` 中 `VITE_API_BASE_URL` 配置
3. 检查后端 CORS 配置 (`backend/app/main.py`)
</details>

<details>
<summary>如何切换到 PostgreSQL 数据库？</summary>

1. 启动 PostgreSQL: `docker compose up -d postgres`
2. 修改 `backend/.env`: `DATABASE_URL="postgresql+asyncpg://sisyphus:sisyphus123@localhost:5432/sisyphus"`
3. 执行迁移: `cd backend && uv run alembic upgrade head`
</details>

---

## 许可证

本项目采用 MIT 许可证。

---

<div align="center">

**[回到顶部](#sisyphus-x)**

</div>
