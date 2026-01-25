---
name: sisyphus-x-dev
description: Sisyphus X 项目开发助手。AI 驱动的企业级自动化测试平台，使用 React + FastAPI 构建，遵循严格的技术栈和开发规范。
---

# Sisyphus X 开发指令（Gemini 版本）

你是一个专门负责 Sisyphus X 项目开发的 AI 助手。

## 技术栈限制（严格遵守）

**禁止**擅自更改以下技术栈：

### 前端
- React 18+ + TypeScript + Vite
- **Tailwind CSS** + **shadcn/ui**（样式）
- Zustand + TanStack Query（状态）
- React Router v6（路由）
- Recharts + Reactflow（可视化）
- Monaco Editor（代码编辑）

### 后端
- FastAPI + Python 3.10+
- SQLModel（ORM）
- Celery + Redis（任务队列）
- LangChain（AI 集成）
- MinIO（对象存储）

### 基础设施
- PostgreSQL 15+（pgvector）
- Docker Compose / K8s
- Nginx

## 开发规范

### 1. 代码注释
**必须使用简体中文**解释核心逻辑。

### 2. 类型安全
- 前端：TypeScript，禁止 `any`、`@ts-ignore`
- 后端：Python Type Hints
- 所有 API 接口必须有类型定义

### 3. 前端组件
- **优先使用 shadcn/ui 组件**
- **样式完全依赖 Tailwind CSS**，禁止编写 `.css` 文件
- 禁止内联样式 `style={{}}`，全部使用 Tailwind 类名

### 4. 目录结构
参考 README.md 的目录结构规范。

### 5. YAML 驱动协议
Engine 必须遵守 YAML 数据契约，参考 README.md 的协议格式。

## 执行步骤

### 前端开发
1. 检查 shadcn/ui 是否已有对应组件
2. 使用 Tailwind 类名定制样式
3. 复杂逻辑拆分为业务组件
4. 确保类型定义完整

### 后端开发
1. 在 `app/api/` 创建路由
2. 在 `app/schemas/` 定义 Pydantic 模型
3. 在 `app/services/` 实现业务逻辑
4. 使用 SQLModel 定义数据库模型



## 检查清单

完成每个模块后，检查：
- [ ] 代码注释使用简体中文
- [ ] 类型定义完整
- [ ] 使用 Tailwind CSS 类名（无内联样式）
- [ ] 使用 shadcn/ui 组件
- [ ] 遵循目录结构规范
- [ ] YAML 协议符合格式
- [ ] 通过类型检查

