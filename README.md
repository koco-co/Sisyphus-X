<div align="center">

# 🪨 SisyphusX

**AI 驱动的企业级自动化测试平台**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.10+-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/react-19+-61dafb.svg)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/fastapi-0.100+-009688.svg)](https://fastapi.tiangolo.com)
[![AI](https://img.shields.io/badge/AI-Claude-purple.svg)](https://anthropic.com)

</div>

---

## ✨ 核心特性

### 🤖 AI 智能助手（新功能）
- **智能需求分析** - 通过多轮对话自动收集测试需求
- **AI 用例生成** - 根据需求描述自动生成测试用例
- **智能文档生成** - 自动生成测试计划和文档
- **测试建议** - 基于最佳实践提供测试建议

### 🎯 接口自动化测试
- **可视化编辑器** - 低代码方式创建 API 测试用例
- **YAML 驱动** - 支持 YAML 格式配置
- **多种步骤类型** - HTTP、数据库、等待、循环、脚本、并发、条件
- **实时执行** - 异步执行测试并实时查看结果

### 🔄 场景编排
- **拖拽式设计** - 基于 ReactFlow 的工作流编辑
- **可视化执行** - 图形化展示测试执行过程
- **场景复用** - 支持场景模板和复用

### 📋 测试管理
- **用例管理** - 多维度用例组织与追踪
- **关键字驱动** - 可复用的测试关键字
- **批量执行** - 支持批量测试和定时任务
- **执行报告** - 详细的测试结果和性能指标

### 🌐 项目管理
- **多项目支持** - 灵活的项目组织结构
- **环境管理** - 开发、测试、生产环境隔离
- **数据源管理** - 数据库连接配置

### 🎨 用户体验
- 🌙 **主题切换** - 支持明/暗主题
- 🌍 **国际化** - 中英文自动切换
- 📱 **响应式设计** - 适配各种设备

---

## 🏗️ 技术栈

### 前端
- **React 19** + **TypeScript** - 现代化前端框架
- **Vite** - 极速构建工具
- **Tailwind CSS** - 原子化 CSS 框架
- **shadcn/ui** - 高质量组件库
- **ReactFlow** - 流程图编辑器
- **Monaco Editor** - 代码编辑器
- **React Query** - 强大的数据同步
- **Framer Motion** - 流畅动画效果

### 后端
- **FastAPI** - 高性能异步 Web 框架
- **SQLModel** - 现代化 ORM（基于 SQLAlchemy + Pydantic）
- **PostgreSQL** - 关系型数据库
- **Redis** - 缓存和消息队列
- **Alembic** - 数据库迁移工具

### AI 能力（新）
- **LangGraph** - AI Agent 编排框架
- **Claude API** - 大语言模型
- **LangChain** - AI 工具链
- **Anthropic** - AI 模型提供商

### 核心执行器
- **api-engine** - YAML 驱动的 API 测试执行引擎
- **web-engine** - Web UI 自动化测试（规划中）
- **app-engine** - 移动端自动化测试（规划中）

---

## 🚀 快速开始

### 环境要求

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose（用于基础服务）
- UV（推荐）或 pip - Python 包管理器
- Anthropic API Key（AI 功能需要，可选）

### 配置说明

#### 后端配置

创建 `.env` 文件：

```bash
cp .env.example .env
```

主要配置项：

```env
# 数据库
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/sisyphus

# Redis
REDIS_URL=redis://localhost:6379/0

# 认证
SECRET_KEY=your-secret-key-here
AUTH_DISABLED=true  # 开发模式可禁用认证

# AI 功能（新）
ANTHROPIC_API_KEY=your-anthropic-api-key  # 从 https://console.anthropic.com 获取

# OAuth（可选）
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# 前端地址
FRONTEND_URL=http://localhost:5173
```

#### 前端配置

```bash
cd frontend
cp .env.example .env
```

主要配置项：

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_AUTH_DISABLED=true
VITE_DEV_MODE_SKIP_LOGIN=true  # 开发模式跳过登录
```

---

### 1. 启动基础服务

```bash
# 启动 PostgreSQL、Redis、MinIO
docker compose up -d
```

### 2. 启动后端

```bash
# 进入后端目录
cd backend

# 使用 UV 安装依赖（推荐）
uv sync

# 或使用 pip
pip install -r requirements.txt

# 数据库迁移
uv run alembic upgrade head

# 启动服务
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 或激活虚拟环境后启动
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows
uvicorn app.main:app --reload
```

后端将运行在 http://localhost:8000

API 文档：http://localhost:8000/docs

### 3. 启动前端

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将运行在 http://localhost:5173

### 4. 访问应用

| 服务 | 地址 |
|------|------|
| 前端应用 | http://localhost:5173 |
| API 文档 | http://localhost:8000/docs |
| ReDoc 文档 | http://localhost:8000/redoc |

---

## 📖 功能使用指南

### 🤖 AI 需求分析（新功能）

1. **启动 AI 助手**
   ```
   导航到 "AI 助手" → "需求分析"
   ```

2. **描述测试需求**
   ```
   例如："我需要测试用户登录接口，包括正常登录、密码错误、账号不存在等情况"
   ```

3. **AI 互动收集**
   ```
   AI 会主动提问以澄清需求：
   - 接口地址是什么？
   - 需要测试哪些异常场景？
   - 有什么特殊的验证要求？
   ```

4. **生成测试用例**
   ```
   AI 自动生成 YAML 格式的测试用例
   ```

5. **导出文档**
   ```
   一键导出测试计划和用例文档
   ```

### 🎯 接口自动化测试

1. **创建测试用例**
   ```
   导航到项目 → 测试用例 → 新建测试用例
   ```

2. **可视化编辑**
   ```
   - 配置基本信息（名称、Base URL、超时）
   - 添加测试步骤（HTTP 请求、数据库查询等）
   - 设置断言和变量提取
   ```

3. **执行测试**
   ```
   点击"执行"按钮，实时查看执行结果
   ```

4. **查看报告**
   ```
   查看详细的执行报告，包括：
   - 响应时间
   - 状态码
   - 响应内容
   - 错误信息
   ```

### 🔄 场景编排

1. **创建场景**
   ```
   导航到场景编排 → 新建场景
   ```

2. **设计工作流**
   ```
   - 拖拽节点到画布
   - 连接节点形成流程
   - 配置每个节点的参数
   ```

3. **执行场景**
   ```
   点击执行，可视化展示执行过程
   ```

---

## 🧩 可复用组件

### 前端组件库

项目封装了以下可复用组件，位于 `frontend/src/components/`：

| 组件 | 路径 | 用途 |
|------|------|------|
| EmptyState | `common/EmptyState.tsx` | 统一的空状态展示 |
| Pagination | `common/Pagination.tsx` | 分页组件 |
| ConfirmDialog | `common/ConfirmDialog.tsx` | 确认对话框（支持文本验证） |
| CustomSelect | `ui/CustomSelect.tsx` | 自定义下拉选择器 |
| Toast | `ui/Toast.tsx` | 消息提示 |
| MonacoEditor | `ui/MonacoEditor.tsx` | 代码编辑器 |
| StatusBadge | `ui/StatusBadge.tsx` | 状态徽章 |

#### 使用示例

```tsx
// EmptyState 示例
import { EmptyState } from '@/components/common/EmptyState'

<EmptyState
    title="暂无数据"
    description="这里什么都没有..."
    icon={Database}
    action={<button>创建第一个项目</button>}
/>

// ConfirmDialog 示例（带文本验证）
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

<ConfirmDialog
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    onConfirm={() => handleDelete()}
    title="删除项目"
    description="请输入项目名称确认删除"
    verificationText={projectName}  // 需要用户输入此文本才能确认
    isDestructive={true}
/>
```

---

## 📁 项目结构

```
sisyphus/
├── frontend/                # React 前端
│   ├── src/
│   │   ├── api/            # API 客户端
│   │   ├── components/     # 通用组件
│   │   │   ├── common/     # 通用组件（EmptyState、Pagination）
│   │   │   ├── layout/     # 布局组件
│   │   │   └── ui/         # UI 组件（Toast、Dialog）
│   │   ├── contexts/       # React Context
│   │   ├── i18n/           # 国际化
│   │   ├── pages/          # 页面组件
│   │   │   ├── api-automation/  # API 自动化
│   │   │   ├── ai-assistant/    # AI 助手（新）
│   │   │   ├── scenario/        # 场景编排
│   │   │   └── ...
│   │   └── lib/            # 工具库
│   └── public/             # 静态资源
├── backend/                # FastAPI 后端
│   └── app/
│       ├── api/v1/         # API 路由
│       │   └── endpoints/  # 端点实现
│       │       ├── ai_assistant.py  # AI 助手（新）
│       │       ├── api_test_cases.py
│       │       └── ...
│       ├── core/           # 核心配置
│       ├── models/         # 数据模型
│       ├── schemas/        # Pydantic schemas
│       └── services/       # 业务逻辑
│           ├── requirement_agent.py  # AI Agent（新）
│           ├── yaml_generator.py
│           └── ...
├── engines/                # 核心执行器
│   ├── api-engine/         # API 测试引擎
│   ├── web-engine/         # Web UI 测试引擎
│   └── app-engine/         # App 测试引擎
├── docs/                   # 文档
│   ├── AI_REQUIREMENT_ANALYSIS_PLAN.md  # AI 功能规划（新）
│   └── ...
└── deploy/                 # 部署配置
```

---

## 🔧 核心执行器 (api-engine)

独立的命令行工具，用于执行 YAML 定义的 API 测试用例。

### 安装

```bash
cd engines/api-engine
pip install -r requirements.txt
python setup.py install
```

### 使用方法

```bash
# 执行测试
huace-apirun --cases=examples/ -sv

# 验证 YAML
huace-apirun --cases=case.yaml --validate

# 查看帮助
huace-apirun --help
```

### YAML 格式示例

```yaml
name: "API 测试示例"
config:
  base_url: "https://api.example.com"
  verify: false
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
      - eq: ["body.code", 0]

  - name: "获取用户信息"
    request:
      url: /api/user/info
      method: GET
      headers:
        Authorization: "Bearer ${token}"
    extract:
      user_id: body.data.id
    validate:
      - eq: [status_code, 200]
```

---

## 📝 开发指南

### 代码规范

**前端**：
- TypeScript 严格模式
- ESLint + Prettier
- React Hooks 规则

**后端**：
- Ruff（代码检查和格式化）
- Pyright（类型检查）
- 类型注解（Type Hints）
- 异步优先（async/await）

详细开发指南请参考：
- [开发指南](./docs/DEVELOPMENT.md) - 通用开发指南
- [后端开发指南](./docs/backend/DEVELOPMENT.md) - 后端专项指南
- [后端 README](./backend/README.md) - 后端快速参考

### 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具
ai: AI 功能相关
```

### 测试

**前端测试**（待添加）：
```bash
npm run test
```

**后端测试**（待添加）：
```bash
cd backend
pytest
```

---

## 🚧 部署

### Docker 部署

```bash
# 构建镜像
docker compose build

# 启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f
```

### 生产环境配置

1. **修改环境变量**
   ```env
   AUTH_DISABLED=false
   SECRET_KEY=强密码
   DATABASE_URL=生产数据库地址
   ```

2. **数据库迁移**
   ```bash
   alembic upgrade head
   ```

3. **启动服务**
   ```bash
   # 使用 Gunicorn（生产环境）
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: 添加某个功能'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📚 文档

### 开发文档
- [开发指南](./docs/DEVELOPMENT.md) - 通用开发指南
- [后端开发指南](./docs/backend/DEVELOPMENT.md) - 后端专项指南
- [部署指南](./docs/DEPLOYMENT.md) - 生产部署指南
- [故障排查](./docs/TROUBLESHOOTING.md) - 常见问题解决
- [API 文档](./docs/API.md) - RESTful API 完整文档

### 项目文档
- [开发指南](./CLAUDE.md) - Claude AI 助手开发指南
- [后端 README](./backend/README.md) - 后端快速参考
- [前端 README](./frontend/README.md) - 前端快速参考
- [变更日志](./CHANGELOG.md) - 版本更新记录

---

## 🔐 安全

- 敏感信息使用环境变量
- JWT Token 认证
- CORS 保护
- SQL 注入防护
- XSS 防护

---

## 📄 许可证

[MIT License](LICENSE)

---

## 🙏 致谢

- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Anthropic Claude](https://www.anthropic.com/)
- [LangGraph](https://github.com/langchain-ai/langgraph)

---

<div align="center">

**Made with ❤️ by SisyphusX Team**

[⭐ Star](../../stargazers) | [🐛 报告问题](../../issues) | [💡 提建议](../../issues/new)

</div>
