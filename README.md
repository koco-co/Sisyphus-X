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

### 测试架构

Sisyphus-X 采用分层测试策略:

```
tests_white/          # 白盒测试 (开发视角)
├── unit/            # 单元测试 (80%+ 覆盖率)
├── integration/     # 集成测试 (70%+ 覆盖率)
└── api/             # API 接口测试 (100% 覆盖率)

tests_black/         # 黑盒测试 (用户视角)
├── e2e/            # E2E 测试 (Playwright)
└── functional/     # 功能测试
```

详细文档: [测试架构设计](./docs/TEST_ARCHITECTURE.md)

### 运行白盒测试

```bash
# 后端测试
cd tests_white
pytest                           # 运行所有测试
pytest -m unit                   # 单元测试
pytest -m integration            # 集成测试
pytest -m api                    # API 测试
pytest --cov=backend/app         # 覆盖率报告

# 前端测试
cd frontend
npm run test                     # 单元测试
npm run test:coverage            # 覆盖率报告
```

### 运行黑盒测试

```bash
# E2E 测试
cd tests_black
npm install                      # 安装依赖
npm run install:browsers         # 安装浏览器
npm run test                     # 运行所有 E2E 测试
npm run test:headed              # 有头模式
npm run test:ui                  # UI 模式 (交互式)
npm run report                   # 查看报告

# 运行特定功能测试
npm run test:auth                # 认证流程
npm run test:interface           # 接口管理
npm run test:api-automation      # API 自动化
npm run test:scenario            # 场景编排
```

### 测试覆盖率目标

- **单元测试**: 80%+ (目标 90%+)
- **集成测试**: 70%+ (目标 85%+)
- **API 测试**: 100% (所有端点)
- **E2E 测试**: 关键路径 100%, 主要流程 80%+

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





1、先删除当前项目中的两个接口管理模块相关的代码、文档等等，
2、新增「接口管理」模块, 直接抄apifox就可以了, 只需要抄接口调试部分, 左侧的目录树部分就可以了。默认情况下，左侧展示接口目录树，右侧展示「新建HTTP请求」（默认引用环境中的baseurl），「导入cURL」等卡片，点击左侧的接口后，右侧展示接口调试功能，覆盖掉之前的卡片，可以进行调试，请求方式枚举值支持requests库所有支持的值，右上角有环境管理按钮，点击可以进入弹窗设置多个环境，支持新建环境，需要填写环境名称、baseURL、环境变量名和值，保存后，新建的HTTP请求前置url自动取这个环境设置的url，支持发送、保存。下方支持Params、Body、headers、Cookies等，各处都可以通过{{}}进行参数值引用,引用当前环境中设置的变量名。发送请求后，下方展示响应内容：body、header。这部分的模块要跟sisyphus-api-engien这个模块打通，通过将这些参数转换为临时且唯一的yaml文件，然后通过sisyphus --cases examples/01_HTTP请求方法.yaml --format json -v 命令去执行yaml文件，将得到的json输出到body中。







1、重新整理.claude目录下的skill和command，在teams.md中, 将这6个子角色各自指定或更新对应skill: 产品、架构师、前端、后端、黑盒测试、白盒测试.

2、team-lead: 任务调度者, 分配任务的主角色, 没有skill.

3、@pm: 产品. 对应skill: pm. 该角色主要负责开始的产品设计, 将碎片化需求转化为可交付的需求文档. 以及后续部分文档(如: README.md、CHANGELOG.md等)更新.

4、@architect: 架构师. 对应skill: architect. 该角色主要负责理解需求并调研市场上最成熟, 可在生产环境使用的, 最新最稳定最合适的技术栈、项目架构, 同时规划任务清单, 产出接口设计文档, 数据库表结构等等. 后续的code-review工作也交给这个角色, 在对应步骤时, 要通知该角色使用code-review这个skill. 还有可能产出的设计规范相关文档也由这个角色来维护.

5、@frontend-dev: 前端开发. skill: frontend-design. 这个角色没什么好说的, 就照着架构师给出的技术栈就行了, 之前的skill.

6、@backend-dev: 后端开发. skill: backend-design. 这个同上, 也是沿用之前的skill.

7、@blackbox-qa: 黑盒测试. skill: blackbox-design. 该角色主要负责功能测试, 就把一些多余内容抽取出来放在这个skill中. 这个角色应该主动调用mcp(chrome-devtools)去打开浏览器测试. 根据产出的测试用例去执行.

8、@whitebox-qa: 白盒测试. skill: whitebox-design: 负责单元测试、接口测试等. 以及代码的原子化提交, 这是必须要在测试把所有功能测试完成并通过之后才能进行的操作, 这时候要由team-lead角色在确认黑盒白盒测试都通过之后, 通知给@whitebox-qa 调用code-committer这个skill, 去进行代码的原子化提交.



以上几个skill中的内容、规范等等尽量保持一致



流程:

1、team-lead -> @pm 产出: 01_需求文档.md

2、team-lead -> @architect、@blackbox-qa. 架构师角色产出: 02_任务清单.md, 03_接口定义.md, 04_数据库设计.md. 黑盒测试角色产出: 05_黑盒测试用例.md

3、team-lead -> @frontend-dev、@backend-dev. 产出实际代码

4、team-lead -> @architect 代码审查

5、team-lead -> @blackbox-qa、@whitebox-qa. 产出:06_Bug清单.md(如果有, 那么要及时反馈给team-lead, 指派给开发修复, 修复后再指派给提出bug的测试去验证)

6、team-lead -> @pm、@architect. 产品要更新README.md、CHANGELOG.md等文档, 架构师要更新设计规范文档(如果存在变更)

7、team-lead -> @whitebox-qa. 代码提交

8、team-lead -> me. 通知验收
