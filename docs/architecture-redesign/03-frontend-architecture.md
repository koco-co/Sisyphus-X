# SisyphusX 前端架构设计文档

> 基于 Feature-Sliced Design (FSD) 方法论的模块化前端架构
> 技术栈: React 19.2 + TypeScript 5.9 + Vite 7.2 + Tailwind CSS + React Query v5

## 目录

- [设计原则](#设计原则)
- [架构分层](#架构分层)
- [目录结构](#目录结构)
- [模块划分](#模块划分)
- [状态管理方案](#状态管理方案)
- [组件设计原则](#组件设计原则)
- [API 层设计](#api-层设计)
- [路由设计](#路由设计)
- [迁移策略](#迁移策略)

---

## 设计原则

### 1. Feature-Sliced Design (FSD)

采用 FSD 方法论,将应用按功能域进行模块化划分,实现:

- **高内聚低耦合**: 相关功能组织在一起,减少跨模块依赖
- **可维护性**: 清晰的边界和依赖规则,易于定位和修改
- **可复用性**: 通过 shared 和 entities 层提高代码复用
- **可测试性**: 独立的模块易于单元测试和集成测试

### 2. 依赖规则

```
app → pages → widgets → features → entities → shared
    ↘         ↘         ↘         ↘        ↘
     processes (可选)   shared (全局共享)
```

**关键规则**:
- 上层可以导入下层,下层禁止导入上层
- 同层之间禁止相互导入(通过 shared 或 entities 中介)
- 跨切片导入必须通过公开 API (index.ts)

### 3. 文件组织原则

- **按功能域组织,而非按类型**: 避免所有 components 放在一起
- **每个切片自包含**: 一个功能模块的所有相关代码集中管理
- **公开 API 模式**: 每个切片通过 index.ts 导出公开接口
- **200-400 行原则**: 单文件不超过 400 行,超过则拆分

---

## 架构分层

### FSD 分层说明

```
src/
├── app/                    # 应用入口层 (配置、Provider、路由)
├── processes/              # 跨页面业务流程 (可选,如用户注册流程)
├── pages/                  # 页面层 (完整页面组合)
├── widgets/                # 组合组件层 (可复用的页面区块)
├── features/               # 业务功能层 (用户交互场景)
├── entities/               # 业务实体层 (领域对象)
├── shared/                 # 共享资源层 (UI 库、工具、配置)
└── api/                    # API 层 (统一管理所有 API 调用)
```

### 各层职责

| 层级 | 职责 | 示例 | 导入规则 |
|------|------|------|----------|
| **app** | 应用初始化、全局配置、路由 | App.tsx, main.tsx, providers | 可导入所有层 |
| **processes** | 跨页面的复杂业务流程 | 用户注册流程、测试执行流程 | 可导入 features/entities/shared |
| **pages** | 完整页面,组合 widgets/features | 项目列表页、测试用例编辑页 | 可导入 widgets/features/entities/shared |
| **widgets** | 可复用的页面区块组合 | 项目卡片、测试步骤编辑器 | 可导入 features/entities/shared |
| **features** | 独立的业务功能 | 创建项目、执行测试 | 可导入 entities/shared |
| **entities** | 业务实体及通用操作 | Project, TestCase, User | 可导入 shared |
| **shared** | 通用 UI 组件、工具函数 | Button, cn(), formatDate | 不导入任何业务层 |
| **api** | API 客户端和 React Query hooks | projectsApi, useProjects | 独立层,供 entities/features 使用 |

---

## 目录结构

### 完整 Tree 结构

```
frontend/src/
├── app/                          # 应用入口层
│   ├── App.tsx                   # 根组件 (路由配置)
│   ├── main.tsx                  # 应用入口
│   ├── providers/                # Provider 配置
│   │   ├── QueryProvider.tsx     # React Query Provider
│   │   ├── RouterProvider.tsx    # Router Provider
│   │   ├── ThemeProvider.tsx     # 主题 Provider
│   │   └── index.tsx             # 组合所有 Providers
│   └── routes/                   # 路由配置 (按功能域分组)
│       ├── index.ts              # 路由总入口
│       ├── auth.routes.tsx       # 认证相关路由
│       ├── project.routes.tsx    # 项目相关路由
│       ├── test.routes.tsx       # 测试相关路由
│       └── public.routes.tsx     # 公开路由
│
├── processes/                    # 跨页面业务流程 (可选)
│  ── test-execution/             # 测试执行流程
│       ├── model/                # 流程状态管理
│       └── lib/                  # 流程逻辑
│
├── pages/                        # 页面层
│   ├── auth/                     # 认证页面
│   │   ├── login/                # 登录页
│   │   │   ├── page.tsx          # 页面组件
│   │   │   └── ui.tsx            # UI 组件
│   │   └── register/             # 注册页
│   ├── projects/                 # 项目管理页面
│   │   ├── list/                 # 项目列表页
│   │   │   ├── page.tsx          # 页面组件
│   │   │   └── ui.tsx            # UI 组件 (表格、筛选器)
│   │   ├── detail/               # 项目详情页
│   │   │   ├── page.tsx
│   │   │   └── ui.tsx
│   │   └── settings/             # 项目设置页
│   ├── api-automation/           # API 自动化页面
│   │   ├── test-case-list/       # 用例列表
│   │   ├── test-case-editor/     # 用例编辑器
│   │   └── execution/            # 执行历史
│   ├── functional-test/          # 功能测试页面
│   ├── scenario/                 # 场景编排页面
│   ├── reports/                  # 报告分析页面
│   └── ai-assistant/             # AI 助手页面
│
├── widgets/                      # 组合组件层
│   ├── project-card/             # 项目卡片
│   │   ├── ProjectCard.tsx       # 组件
│   │   ├── ProjectCard.module.css# 样式 (如需要)
│   │   └── index.ts              # 导出
│   ├── test-step-editor/         # 测试步骤编辑器
│   ├── execution-status/         # 执行状态指示器
│   ├── environment-selector/     # 环境选择器
│   ├── yaml-preview/             # YAML 预览
│   └── sidebar-menu/             # 侧边栏菜单
│
├── features/                     # 业务功能层
│   ├── auth/                     # 认证功能
│   │   ├── login/                # 登录功能
│   │   │   ├── model/            # 状态逻辑
│   │   │   ├── api/              # API 调用
│   │   │   └── ui/               # UI 组件
│   │   └── logout/               # 登出功能
│   ├── project-create/           # 创建项目
│   │   ├── model/
│   │   ├── api/
│   │   └── ui/
│   ├── project-delete/           # 删除项目
│   ├── project-update/           # 更新项目
│   ├── test-execute/             # 执行测试
│   ├── environment-manage/       # 环境管理
│   └── ai-chat/                  # AI 对话
│
├── entities/                     # 业务实体层
│   ├── project/                  # 项目实体
│   │   ├── model/                # 类型定义
│   │   │   ├── types.ts          # Project, ProjectCreate 等
│   │   │   └── index.ts
│   │   ├── api/                  # API 调用 (React Query hooks)
│   │   │   ├── queries.ts        # useProject, useProjects
│   │   │   ├── mutations.ts      # useCreateProject 等
│   │   │   └── index.ts
│   │   └── lib/                  # 业务逻辑
│   │       ├── validators.ts     # 验证逻辑
│   │       └── formatters.ts     # 格式化逻辑
│   ├── user/                     # 用户实体
│   ├── test-case/                # 测试用例实体
│   ├── api-interface/            # API 接口实体
│   ├── environment/              # 环境实体
│   ├── scenario/                 # 场景实体
│   └── execution/                # 执行记录实体
│
├── shared/                       # 共享资源层
│   ├── ui/                       # 通用 UI 组件
│   │   ├── button/
│   │   ├── input/
│   │   ├── dialog/
│   │   ├── select/
│   │   ├── card/
│   │   └── index.ts              # 统一导出
│   ├── lib/                      # 工具函数
│   │   ├── cn.ts                 # classNames 工具
│   │   ├── date.ts               # 日期格式化
│   │   ├── validation.ts         # 通用验证
│   │   └── index.ts
│   ├── config/                   # 配置
│   │   ├── api.ts                # API 配置
│   │   └── storage.ts            # 存储配置
│   ├── api/                      # API 基础设施
│   │   ├── client.ts             # Axios 实例
│   │   ├── interceptors.ts       # 拦截器
│   │   └── error-handler.ts      # 错误处理
│   ├── hooks/                    # 通用 Hooks
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── index.ts
│   ├── contexts/                 # 全局 Context
│   │   ├── ThemeContext.tsx
│   │   ├── AuthContext.tsx
│   │   └── index.ts
│   ├── types/                    # 通用类型
│   │   ├── api.ts                # API 通用类型
│   │   └── index.ts
│   ├── constants/                # 常量
│   │   ├── routes.ts             # 路由常量
│   │   └── index.ts
│   └── i18n/                     # 国际化
│       ├── locales/
│       └── index.ts
│
└── segments/                     # 可选: 特定 UI 段
    └── layout/                   # 布局组件
        ├── header/
        ├── sidebar/
        └── footer/
```

---

## 模块划分

### 核心业务模块

#### 1. 认证模块 (auth)

**涉及切片**:
- `features/auth/login` - 登录功能
- `features/auth/logout` - 登出功能
- `features/auth/register` - 注册功能
- `entities/user` - 用户实体
- `pages/auth/login` - 登录页
- `pages/auth/register` - 注册页

**数据流**:
```
Login Page → Login Feature → User Entity → API
```

#### 2. 项目管理模块 (projects)

**涉及切片**:
- `features/project-create` - 创建项目
- `features/project-update` - 更新项目
- `features/project-delete` - 删除项目
- `entities/project` - 项目实体
- `widgets/project-card` - 项目卡片
- `pages/projects/list` - 项目列表
- `pages/projects/detail` - 项目详情

**依赖关系**:
```
Page (list) → Widget (project-card) → Entity (project)
           → Feature (project-delete)
```

#### 3. 接口自动化模块 (api-automation)

**涉及切片**:
- `features/test-case-create` - 创建用例
- `features/test-case-execute` - 执行用例
- `features/test-step-edit` - 编辑步骤
- `entities/test-case` - 测试用例实体
- `entities/api-interface` - API 接口实体
- `widgets/test-step-editor` - 步骤编辑器
- `widgets/yaml-preview` - YAML 预览
- `pages/api-automation/test-case-list` - 用例列表
- `pages/api-automation/test-case-editor` - 用例编辑器

#### 4. 场景编排模块 (scenario)

**涉及切片**:
- `features/scenario-create` - 创建场景
- `features/scenario-execute` - 执行场景
- `features/node-config` - 节点配置
- `entities/scenario` - 场景实体
- `widgets/flow-editor` - 流程编辑器 (ReactFlow)
- `widgets/node-palette` - 节点面板
- `pages/scenario/editor` - 场景编辑页

#### 5. AI 助手模块 (ai-assistant)

**涉及切片**:
- `features/ai-chat` - AI 对话
- `features/requirement-analyze` - 需求分析
- `entities/conversation` - 对话实体
- `widgets/chat-interface` - 聊天界面
- `widgets/message-list` - 消息列表
- `pages/ai-assistant/chat` - AI 助手页

#### 6. 报告分析模块 (reports)

**涉及切片**:
- `entities/execution` - 执行记录实体
- `widgets/execution-chart` - 执行图表
- `widgets/test-report-card` - 测试报告卡片
- `pages/reports/dashboard` - 报告仪表板
- `pages/reports/detail` - 报告详情

---

## 状态管理方案

### 状态分类与归属

#### 1. 服务端状态 (Server State) - React Query

**归属**: `entities/{entity}/api/queries.ts` 和 `mutations.ts`

**示例**:
```typescript
// entities/project/api/queries.ts
export function useProjects(params?: ProjectsQueryParams) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectsApi.list(params)
  })
}

export function useProject(id: number) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id)
  })
}

// entities/project/api/mutations.ts
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}
```

**适用场景**:
- 项目列表、详情
- 测试用例数据
- 执行记录
- 所有从 API 获取的数据

#### 2. 全局状态 (Global State) - Context API

**归属**: `shared/contexts/`

**示例**:
```typescript
// shared/contexts/AuthContext.tsx
interface AuthContextValue {
  user: User | null
  token: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('sisyphus-token')
  )

  const login = async (credentials: LoginCredentials) => {
    const response = await authApi.login(credentials)
    setUser(response.user)
    setToken(response.token)
    localStorage.setItem('sisyphus-token', response.token)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('sisyphus-token')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
```

**适用场景**:
- 用户认证状态
- 主题配置
- 侧边栏状态
- 全局通知/Toast

#### 3. 局部状态 (Local State) - useState

**归属**: 组件内部

**示例**:
```typescript
// features/test-step-edit/ui/StepEditor.tsx
export function StepEditor() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // UI 交互状态
}
```

**适用场景**:
- 对话框开关状态
- 表单输入临时状态
- UI 交互状态 (hover, focus)
- 组件内部临时数据

#### 4. URL 状态 (URL State) - React Router v7

**归属**: 路由参数和查询参数

**示例**:
```typescript
// pages/projects/list/page.tsx
export function ProjectListPage() {
  const [searchParams] = useSearchParams()
  const page = parseInt(searchParams.get('page') || '1')
  const search = searchParams.get('search') || ''

  const { data } = useProjects({ page, search })

  return <ProjectListUI projects={data} />
}
```

**适用场景**:
- 分页参数
- 筛选条件
- 搜索关键字
- 可分享的状态

### 状态管理决策树

```
是否来自服务器?
├─ 是 → 使用 React Query (entities/*/api)
└─ 否 → 是否需要跨组件共享?
    ├─ 是 → 使用 Context API (shared/contexts)
    └─ 否 → 是否需要可分享/可书签?
        ├─ 是 → 使用 URL State (searchParams)
        └─ 否 → 使用 useState (组件内部)
```

---

## 组件设计原则

### 1. 组件分类

#### 展示组件 (Presentational Components)
- **位置**: `shared/ui/`, `widgets/*/ui/`
- **职责**: 纯 UI 展示,无业务逻辑
- **示例**: Button, Input, ProjectCard

#### 容器组件 (Container Components)
- **位置**: `features/*/ui/`, `pages/*/ui/`
- **职责**: 业务逻辑、状态管理、数据获取
- **示例**: LoginButton, ProjectListPage

#### 布局组件 (Layout Components)
- **位置**: `segments/layout/`
- **职责**: 页面布局结构
- **示例**: AppShell, Sidebar, Header

### 2. 组件复用策略

#### L1: 基础 UI 组件 (shared/ui)
**可复用性**: ⭐⭐⭐⭐⭐
- Button, Input, Select, Dialog
- 无业务逻辑,纯 UI

#### L2: 组合组件 (widgets)
**可复用性**: ⭐⭐⭐⭐
- ProjectCard, TestStepEditor, ExecutionStatus
- 包含特定业务场景的 UI 组合

#### L3: 功能组件 (features)
**可复用性**: ⭐⭐⭐
- LoginForm, CreateProjectDialog
- 完整的用户交互功能

#### L4: 页面组件 (pages)
**可复用性**: ⭐⭐
- ProjectListPage, TestCaseEditorPage
- 完整的页面组合

### 3. 组件设计最佳实践

#### 单一职责
```typescript
// ❌ 错误: 组件职责混乱
function ProjectCard() {
  const [projects, setProjects] = useState([]) // 数据获取
  const { data } = useProjects() // 又用了 React Query
  const navigate = useNavigate() // 路由跳转
  // ... 复杂 UI 渲染
}

// ✅ 正确: 职责分离
// entities/project/api/queries.ts
export function useProjects() { /* 数据获取 */ }

// widgets/project-card/ProjectCard.tsx
function ProjectCard({ project }: { project: Project }) {
  // 纯展示,props 传入数据
}

// pages/projects/list/page.tsx
function ProjectListPage() {
  const { data: projects } = useProjects() // 数据获取在页面层
  return <ProjectList projects={projects} />
}
```

#### Props 接口设计
```typescript
// ✅ 使用明确的类型接口
interface ProjectCardProps {
  project: Project
  onEdit?: (project: Project) => void
  onDelete?: (id: number) => void
  className?: string
}

export function ProjectCard({ project, onEdit, onDelete, className }: ProjectCardProps) {
  // ...
}
```

#### 组件组合优于配置
```typescript
// ❌ 配�始化 props 过多
<Button
  variant="primary"
  size="large"
  loading={true}
  icon={Icon}
  fullWidth
  disabled={false}
  tooltip="Tooltip"
/>

// ✅ 使用组合
<Button.Group>
  <Button.LeftIcon icon={Icon} />
  <Button loading={true}>Submit</Button>
  <Button.Tooltip text="Tooltip" />
</Button.Group>
```

---

## API 层设计

### 统一 API 客户端

**位置**: `shared/api/`

```typescript
// shared/api/client.ts
import axios from 'axios'
import config from '@/shared/config/api'

export const api = axios.create({
  baseURL: config.apiBaseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: config.requestTimeout
})

// 请求拦截器
api.interceptors.request.use((axiosConfig) => {
  const token = localStorage.getItem('sisyphus-token')
  if (token) {
    axiosConfig.headers.Authorization = `Bearer ${token}`
  }
  return axiosConfig
})

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sisyphus-token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

### API 调用封装

**位置**: `entities/{entity}/api/`

```typescript
// entities/project/api/index.ts
import { api } from '@/shared/api/client'
import type { Project, ProjectCreate, ProjectUpdate } from '../model/types'

// CRUD 基础操作
export const projectsApi = {
  list: (params?: ListParams) =>
    api.get<Project[]>('/projects/', { params }),

  get: (id: number) =>
    api.get<Project>(`/projects/${id}`),

  create: (data: ProjectCreate) =>
    api.post<Project>('/projects/', data),

  update: (id: number, data: ProjectUpdate) =>
    api.put<Project>(`/projects/${id}`, data),

  delete: (id: number) =>
    api.delete(`/projects/${id}`)
}
```

### React Query Hooks

**位置**: `entities/{entity}/api/`

```typescript
// entities/project/api/queries.ts
import { useQuery } from '@tanstack/react-query'
import { projectsApi } from './index'
import type { ProjectsQueryParams } from '../model/types'

export function useProjects(params?: ProjectsQueryParams) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectsApi.list(params)
  })
}

export function useProject(id: number) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id),
    enabled: !!id // 仅在 id 存在时查询
  })
}

// entities/project/api/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from './index'

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProjectUpdate }) =>
      projectsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}

// entities/project/api/index.ts (统一导出)
export * from './queries'
export * from './mutations'
export { projectsApi } from './index'
```

### API 错误处理

**位置**: `shared/api/error-handler.ts`

```typescript
import type { AxiosError } from 'axios'
import { toast } from '@/shared/ui/toast'

interface ApiError {
  message: string
  detail?: string
  status_code: number
}

export function handleApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError

    switch (error.response?.status) {
      case 400:
        toast.error(apiError.detail || '请求参数错误')
        break
      case 401:
        toast.error('未授权,请重新登录')
        break
      case 403:
        toast.error('没有权限执行此操作')
        break
      case 404:
        toast.error('请求的资源不存在')
        break
      case 500:
        toast.error('服务器错误,请稍后重试')
        break
      default:
        toast.error(apiError.message || '未知错误')
    }
  } else {
    toast.error('网络错误,请检查网络连接')
  }

  return error
}

// 使用示例
// entities/project/api/mutations.ts
export function useCreateProject() {
  return useMutation({
    mutationFn: projectsApi.create,
    onError: handleApiError
  })
}
```

---

## 路由设计

### 路由配置

**位置**: `app/routes/`

```typescript
// app/routes/index.ts
import { createBrowserRouter } from 'react-router-dom'
import { authRoutes } from './auth.routes'
import { projectRoutes } from './project.routes'
import { testRoutes } from './test.routes'
import { publicRoutes } from './public.routes'

export const router = createBrowserRouter([
  // 公开路由
  ...publicRoutes,

  // 认证路由
  ...authRoutes,

  // 受保护路由 (嵌套布局)
  {
    path: '/',
    element: <AppLayout />,
    children: [
      // 项目相关
      ...projectRoutes,

      // 测试相关
      ...testRoutes,

      // 其他业务路由...
    ]
  }
])
```

### 路由模块划分

```typescript
// app/routes/project.routes.ts
import { RouteObject } from 'react-router-dom'
import { ProjectListPage } from '@/pages/projects/list/page'
import { ProjectDetailPage } from '@/pages/projects/detail/page'
import { ProjectSettingsPage } from '@/pages/projects/settings/page'

export const projectRoutes: RouteObject[] = [
  {
    path: 'projects',
    children: [
      {
        index: true,
        element: <ProjectListPage />
      },
      {
        path: ':id',
        element: <ProjectDetailPage />
      },
      {
        path: ':id/settings',
        element: <ProjectSettingsPage />
      }
    ]
  }
]
```

### 路由守卫

```typescript
// app/providers/RouterProvider.tsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/entities/user'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
```

---

## 迁移策略

### 阶段一: 准备工作 (Week 1)

1. **创建新目录结构**
   ```bash
   mkdir -p src/{app,pages,widgets,features,entities,shared,segments}
   ```

2. **迁移共享资源**
   - 移动 `components/ui/` → `shared/ui/`
   - 移动 `lib/` → `shared/lib/`
   - 移动 `contexts/` → `shared/contexts/`
   - 移动 `hooks/` → `shared/hooks/`
   - 移动 `config/` → `shared/config/`

3. **设置路径别名**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './src'),
         '@/app': path.resolve(__dirname, './src/app'),
         '@/pages': path.resolve(__dirname, './src/pages'),
         '@/widgets': path.resolve(__dirname, './src/widgets'),
         '@/features': path.resolve(__dirname, './src/features'),
         '@/entities': path.resolve(__dirname, './src/entities'),
         '@/shared': path.resolve(__dirname, './src/shared'),
         '@/segments': path.resolve(__dirname, './src/segments')
       }
     }
   })
   ```

### 阶段二: 核心实体迁移 (Week 2-3)

**优先级**: 高
**影响范围**: 全局数据模型

1. **迁移 Project 实体**
   ```
   pages/projects/ → entities/project/
   ├── model/types.ts        # 类型定义
   ├── api/
   │   ├── index.ts          # API 调用
   │   ├── queries.ts        # React Query hooks
   │   └── mutations.ts      # React Query mutations
   └── lib/
       ├── validators.ts
       └── formatters.ts
   ```

2. **迁移 User 实体**
   ```
   contexts/AuthContext.tsx → entities/user/
   ```

3. **迁移 TestCase 实体**
   ```
   pages/api-automation/ → entities/test-case/
   ```

### 阶段三: Features 拆分 (Week 4-5)

**策略**: 从 pages 中提取可复用的功能

1. **提取认证功能**
   ```
   pages/auth/login/ → features/auth/login/
   pages/auth/register/ → features/auth/register/
   ```

2. **提取项目管理功能**
   ```
   pages/projects/components/CreateProjectDialog.tsx
   → features/project-create/
   ```

3. **提取测试执行功能**
   ```
   pages/api-automation/components/ExecuteButton.tsx
   → features/test-execute/
   ```

### 阶段四: Widgets 提取 (Week 6)

**策略**: 识别可复用的 UI 组合

1. **提取 ProjectCard**
   ```
   components/business/ProjectCard.tsx
   → widgets/project-card/
   ```

2. **提取 TestStepEditor**
   ```
   components/testcase/StepEditor.tsx
   → widgets/test-step-editor/
   ```

### 阶段五: Pages 重构 (Week 7-8)

**策略**: 使用提取的 widgets 和 features 重构页面

```typescript
// pages/projects/list/page.tsx
import { ProjectListHeader } from '@/widgets/project-list-header'
import { ProjectCard } from '@/widgets/project-card'
import { CreateProjectDialog } from '@/features/project-create'
import { useProjects } from '@/entities/project'

export function ProjectListPage() {
  const { data: projects, isLoading } = useProjects()

  if (isLoading) return <LoadingScreen />

  return (
    <div className="container">
      <ProjectListHeader onRefresh={() => refetch()} />
      <div className="grid">
        {projects?.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
      <CreateProjectDialog />
    </div>
  )
}
```

### 阶段六: 清理与优化 (Week 9-10)

1. **删除旧代码**
   - 删除 `components/` 中的已迁移代码
   - 删除 `pages/` 中的 components 子目录

2. **优化依赖**
   - 检查并修复循环依赖
   - 确保遵循 FSD 依赖规则

3. **文档更新**
   - 更新 README.md
   - 更新 CONTRIBUTING.md

4. **测试覆盖**
   - 为迁移后的代码补充测试
   - 验证功能完整性

### 迁移检查清单

**每个模块迁移后检查**:
- [ ] 目录结构符合 FSD 规范
- [ ] 导入路径使用别名
- [ ] 依赖关系正确 (上层导入下层)
- [ ] 导出通过公开 API (index.ts)
- [ ] 类型定义完整
- [ ] 测试通过
- [ ] 文档更新

### 风险控制

1. **增量迁移**: 每次迁移一个模块,确保不影响其他功能
2. **并行开发**: 旧代码继续工作,新代码逐步替换
3. **频繁测试**: 每个阶段完成后进行回归测试
4. **回滚准备**: 保留 Git 历史,必要时可回滚

---

## 附录

### A. 文件命名规范

```
组件文件:        PascalCase.tsx      (ProjectCard.tsx)
工具文件:        camelCase.ts        (formatDate.ts)
类型文件:        *.types.ts          (project.types.ts)
Hooks 文件:      use*.tsx            (useDebounce.ts)
测试文件:        *.test.ts           (utils.test.ts)
样式文件:        *.module.css        (ProjectCard.module.css)
```

### B. 导入顺序

```typescript
// 1. 外部库
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. 第三方 UI
import { ArrowLeft } from 'lucide-react'

// 3. 内部模块 (按 FSD 层级排序)
import { cn } from '@/shared/lib/utils'
import { useProjects } from '@/entities/project'
import { CreateProjectDialog } from '@/features/project-create'
import { ProjectCard } from '@/widgets/project-card'

// 4. 样式文件
import styles from './ProjectList.module.css'

// 5. 类型导入
import type { Project } from '@/entities/project'
```

### C. TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/app/*": ["./src/app/*"],
      "@/pages/*": ["./src/pages/*"],
      "@/widgets/*": ["./src/widgets/*"],
      "@/features/*": ["./src/features/*"],
      "@/entities/*": ["./src/entities/*"],
      "@/shared/*": ["./src/shared/*"],
      "@/segments/*": ["./src/segments/*"]
    },
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### D. 推荐阅读

- [Feature-Sliced Design 官方文档](https://feature-sliced.design/)
- [React Query 官方文档](https://tanstack.com/query/latest)
- [React Router v7 文档](https://reactrouter.com/)
- [TypeScript 最佳实践](https://typescript-eslint.io/rules/)

---

## 总结

本架构设计遵循以下核心原则:

1. **Feature-Sliced Design**: 清晰的分层和依赖规则
2. **按功能域组织**: 相关代码集中管理
3. **状态管理分离**: React Query + Context + useState 各司其职
4. **API 层统一**: 集中管理所有 API 调用和错误处理
5. **组件复用策略**: 从 shared/ui 到 pages 的递进式复用
6. **增量迁移**: 平滑过渡,风险可控

实施本架构后,代码将具备:
- ✅ 更好的可维护性
- ✅ 更高的可复用性
- ✅ 更强的类型安全
- ✅ 更清晰的团队协作边界
- ✅ 更容易的测试覆盖
