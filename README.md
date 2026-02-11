<div align="center">

# Sisyphus-X

**AI 驱动的企业级自动化测试平台**

[![Monorepo](https://img.shields.io/badge/Repo-Monorepo-0A66C2?style=flat-square)]()
[![Frontend](https://img.shields.io/badge/Frontend-React_19_+_Vite-61DAFB?style=flat-square&logo=react&logoColor=black)]()
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)]()
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)]()

[在线演示](#) · [文档](./docs/) · [API 参考](http://localhost:8000/docs) · [反馈问题](https://github.com/your-org/sisyphus-x/issues)

</div>

---

## ✨ 功能特性

- 🔮 **智能需求分析** - 基于多轮对话 AI 的测试需求采集与分析
- 🤖 **AI 用例生成** - 自动生成测试用例，支持多种测试类型
- 🔌 **接口自动化测试** - 可视化 API 测试用例编辑器
- 🎭 **场景编排** - 基于 ReactFlow 的可视化工作流编排
- 📊 **功能测试管理** - 测试用例知识库与计划管理
- 📈 **测试报告** - 详细的测试执行报告与数据分析

---

## 🛠️ 技术栈

<table>
<tr>
<td width="50%" valign="top">

### Frontend

- **框架**: React 19 + TypeScript 5.9
- **构建工具**: Vite 7.2
- **UI**: Tailwind CSS + shadcn/ui
- **状态管理**: React Query v5
- **可视化**: ReactFlow v11, Recharts
- **编辑器**: Monaco Editor

</td>
<td width="50%" valign="top">

### Backend

- **框架**: FastAPI 0.115+
- **ORM**: SQLModel (SQLAlchemy + Pydantic)
- **数据库**: PostgreSQL / SQLite
- **迁移工具**: Alembic
- **AI 引擎**: LangGraph + Claude
- **包管理**: UV

</td>
</tr>
</table>

---

## 📦 项目结构

```
Sisyphus-X/
├── frontend/          # React 前端应用
│   ├── src/
│   │   ├── api/       # API 客户端
│   │   ├── components/# UI 组件
│   │   ├── pages/     # 页面组件
│   │   └── lib/       # 工具函数
│   └── package.json
│
├── backend/           # FastAPI 后端应用
│   ├── app/
│   │   ├── api/       # API 路由
│   │   ├── models/    # 数据模型
│   │   ├── schemas/   # Pydantic 模式
│   │   ├── services/  # 业务逻辑
│   │   └── core/      # 核心配置
│   ├── alembic/       # 数据库迁移
│   └── pyproject.toml
│
├── engines/           # 测试执行引擎
│   └── api-engine/    # API 测试引擎
│
├── tests/             # 测试目录
│   ├── unit/          # 单元测试
│   └── integration/   # 集成测试
│
├── docs/              # 项目文档
└── .env.example       # 环境变量模板
```

---

## 🚀 快速开始

### 环境要求

- Node.js 18+ (推荐 LTS)
- Python 3.12+
- UV (Python 包管理器)
- Git

### 1️⃣ 克隆项目

```bash
git clone https://github.com/your-org/sisyphus-x.git
cd sisyphus-x
```

### 2️⃣ 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量
```

### 3️⃣ 启动后端

```bash
cd backend

# 安装依赖
uv sync

# 运行数据库迁移
uv run alembic upgrade head

# 启动开发服务器
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4️⃣ 启动前端

打开新终端窗口：

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 5️⃣ 访问应用

- 🌐 **前端界面**: http://localhost:5173
- 📚 **API 文档**: http://localhost:8000/docs
- 📖 **ReDoc 文档**: http://localhost:8000/redoc

---

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | 数据库连接 URL | `sqlite+aiosqlite:///./sisyphus.db` |
| `SECRET_KEY` | JWT 密钥 | - |
| `AUTH_DISABLED` | 禁用认证 (仅开发) | `true` |
| `ANTHROPIC_API_KEY` | Claude API 密钥 | - |
| `FRONTEND_URL` | 前端 URL | `http://localhost:5173` |

完整配置请参考 [`.env.example`](./.env.example)

### 数据库迁移

```bash
# 创建新迁移
uv run alembic revision --autogenerate -m "描述变更内容"

# 应用迁移
uv run alembic upgrade head

# 回滚迁移
uv run alembic downgrade -1
```

---

## 📚 开发指南

### 前端命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | 运行 ESLint |

### 后端命令

| 命令 | 说明 |
|------|------|
| `uv run uvicorn app.main:app --reload` | 启动开发服务器 |
| `uv run pytest tests/ -v` | 运行测试 |
| `uv run ruff check app/` | 代码检查 |
| `uv run ruff format app/` | 代码格式化 |
| `uv run pyright app/` | 类型检查 |

### 代码规范

- **前端**: ESLint + Prettier
- **后端**: Ruff (PEP 8)
- **提交**: Conventional Commits
- **分支**: `feat/*`, `fix/*`, `refactor/*`

---

## 🏗️ 架构设计

```
┌─────────────────┐
│   React SPA     │  用户界面层
│  (TypeScript)   │
└────────┬────────┘
         │ Axios + JWT
         ▼
┌─────────────────┐
│   FastAPI       │  API 服务层
│  (Async)        │
└────────┬────────┘
         │ SQLModel ORM
         ▼
┌─────────────────┐
│  PostgreSQL     │  数据持久层
│  / SQLite       │
└─────────────────┘
```

详细架构说明请参考 [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## 🧪 测试

### 运行测试

```bash
# 后端单元测试
cd backend
uv run pytest tests/unit -v

# 后端集成测试
uv run pytest tests/integration -v

# 后端测试覆盖率
uv run pytest --cov=app tests/

# 前端类型检查
cd frontend
npm run build
```

### 测试覆盖率目标

- 单元测试: 80%+
- 集成测试: 覆盖核心 API
- E2E 测试: 覆盖关键用户流程

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 贡献流程

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feat/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feat/amazing-feature`)
5. 创建 Pull Request

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - 新功能
- `fix:` - Bug 修复
- `refactor:` - 代码重构
- `docs:` - 文档更新
- `test:` - 测试相关
- `chore:` - 构建/工具相关

---

## 📝 文档

- [API 文档](./docs/API.md)
- [架构设计](./docs/ARCHITECTURE.md)
- [开发指南](./docs/DEVELOPMENT.md)
- [项目结构](./docs/PROJECT_STRUCTURE.md)
- [测试指南](./docs/TESTING.md)

---

## ❓ 常见问题

<details>
<summary><b>启动后端时报数据库连接错误？</b></summary>

确保已运行数据库迁移：

```bash
cd backend
uv run alembic upgrade head
```

</details>

<details>
<summary><b>前端 API 请求失败？</b></summary>

检查以下配置：

1. 后端是否运行在 `http://localhost:8000`
2. `.env` 文件中的 `VITE_API_BASE_URL` 是否正确
3. CORS 配置是否正确

</details>

<details>
<summary><b>如何从 SQLite 迁移到 PostgreSQL？</b></summary>

1. 安装 PostgreSQL 驱动: `uv add asyncpg`
2. 修改 `.env` 中的 `DATABASE_URL`
3. 运行迁移: `uv run alembic upgrade head`

详见 [数据库迁移指南](./docs/DEVELOPMENT.md#数据库迁移)

</details>

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

感谢以下开源项目：

- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [SQLModel](https://sqlmodel.tiangolo.com/)
- [LangChain](https://python.langchain.com/)
- [shadcn/ui](https://ui.shadcn.com/)

---

<div align="center">

**[⬆ 返回顶部](#sisyphus-x)**

Made with ❤️ by Sisyphus-X Team

</div>
