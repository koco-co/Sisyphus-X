<div align="center">

# 🪨 SisyphusX

**AI 驱动的企业级自动化测试平台**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.10+-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/react-18+-61dafb.svg)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/fastapi-0.100+-009688.svg)](https://fastapi.tiangolo.com)

</div>

---

## ✨ 特性

- 🎯 **接口管理** - 可视化接口编辑器，支持实时调试
- 🔄 **场景编排** - 基于 ReactFlow 的拖拽式工作流设计
- 📋 **用例管理** - 多维度用例组织与追踪
- ⚡ **核心执行器** - 独立的 api-engine，支持 YAML 驱动测试
- 🌙 **主题切换** - 支持明/暗/系统主题
- 🌍 **国际化** - 中英文自动切换

---

## 🏗️ 技术栈

### 前端
- **React 18** + **TypeScript**
- **Tailwind CSS** - 原子化 CSS
- **shadcn/ui** - 组件库
- **ReactFlow** - 流程图编辑器
- **Monaco Editor** - 代码编辑器
- **Recharts** - 数据可视化
- **React Query** - 数据请求

### 后端
- **FastAPI** - 高性能 API 框架
- **SQLModel** - ORM 层
- **PostgreSQL** - 数据库
- **Redis** - 缓存

### 核心执行器
- **api-engine** - YAML 驱动的 API 测试执行器

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Python 3.10+
- Docker & Docker Compose
- Conda (推荐)

### 1. 启动基础服务

```bash
# 启动 PostgreSQL、Redis、MinIO
docker compose up -d
```

### 2. 启动后端

```bash
# 激活 conda 环境
conda activate platform-auto

# 进入后端目录
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn app.main:app --reload
```

### 3. 启动前端

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 4. 访问应用

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| API 文档 | http://localhost:8000/docs |

---

## 📁 项目结构

```
sisyphus/
├── frontend/           # React 前端
│   ├── src/
│   │   ├── api/        # API 客户端
│   │   ├── components/ # 通用组件
│   │   ├── contexts/   # React Context
│   │   ├── i18n/       # 国际化
│   │   ├── pages/      # 页面组件
│   │   └── lib/        # 工具库
│   └── public/         # 静态资源
├── backend/            # FastAPI 后端
│   └── app/
│       ├── api/        # API 路由
│       ├── models/     # 数据模型
│       ├── schemas/    # Pydantic schemas
│       └── core/       # 核心配置
├── engines/            # 核心执行器
│   ├── api-engine/     # API 测试引擎
│   ├── web-engine/     # Web UI 测试引擎
│   └── app-engine/     # App 测试引擎
├── docs/               # 文档
└── deploy/             # 部署配置
```

---

## 🔧 核心执行器 (api-engine)

独立的命令行工具，用于执行 YAML 定义的 API 测试用例。

### 使用方法

```bash
cd engines/api-engine

# 安装依赖
pip install -r requirements.txt

# 执行测试
python main.py run -f examples/example_case.yaml

# 验证 YAML 格式
python main.py validate -f case.yaml
```

### YAML 格式示例

```yaml
config:
  name: "API 测试示例"
  base_url: "https://api.example.com"
  variables:
    token: "xxx"

teststeps:
  - name: "获取用户信息"
    type: "api"
    request:
      method: "GET"
      url: "/user/info"
      headers:
        Authorization: "Bearer ${token}"
    validate:
      - eq: ["status_code", 200]
      - eq: ["body.code", 0]
```

---

## 📝 开发指南

### 代码规范

- **前端**: ESLint + Prettier
- **后端**: Black + isort

### 提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试相关
chore: 构建/工具
```

---

## 📄 许可证

[MIT License](LICENSE)

---

<div align="center">

**Made with ❤️ by SisyphusX Team**

</div>
