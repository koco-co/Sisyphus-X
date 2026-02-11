# SisyphusX 前端

基于 React 19 + TypeScript + Tailwind CSS 构建的现代化测试平台前端。

## 技术栈

- **React 19** - UI 框架
- **TypeScript 5.9** - 类型安全
- **Vite 7** - 极速构建工具
- **Tailwind CSS** - 原子化 CSS
- **shadcn/ui** - 高质量组件库
- **React Router v7** - 路由管理
- **React Query v5** - 数据请求和缓存
- **ReactFlow v11** - 流程图编辑器
- **Monaco Editor** - 代码编辑器
- **Recharts** - 图表库
- **i18next** - 国际化
- **Framer Motion** - 动画效果

## 目录结构

```
src/
├── api/                    # API 客户端
│   └── client.ts          # 统一的 Axios 实例
├── components/             # 通用组件
│   ├── common/            # 通用业务组件
│   │   ├── EmptyState.tsx
│   │   ├── Pagination.tsx
│   │   └── ConfirmDialog.tsx
│   ├── layout/            # 布局组件
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   └── ui/                # shadcn/ui 组件
│       ├── button.tsx
│       ├── dialog.tsx
│       └── ...
├── contexts/               # React Context
│   ├── AuthContext.tsx    # 认证上下文
│   ├── ThemeContext.tsx   # 主题上下文
│   └── SidebarContext.tsx # 侧边栏上下文
├── i18n/                   # 国际化
│   └── locales/           # 翻译文件
│       ├── zh-CN.json
│       └── en-US.json
├── lib/                    # 工具库
│   ├── utils.ts           # 工具函数
│   └── config.ts          # 配置
├── pages/                  # 页面组件
│   ├── auth/              # 认证页面
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   ├── dashboard/         # 仪表板
│   ├── projects/          # 项目管理
│   ├── api-automation/    # API 自动化
│   ├── scenario/          # 场景编排
│   ├── ai-assistant/      # AI 助手
│   └── reports/           # 测试报告
├── hooks/                  # 自定义 Hooks
│   ├── useAuth.ts
│   ├── useTheme.ts
│   └── useDebounce.ts
└── types/                  # 类型定义
    └── index.ts
```

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint

# 类型检查
npx tsc --noEmit
```

## 环境变量

创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_AUTH_DISABLED=true
VITE_DEV_MODE_SKIP_LOGIN=true
```

**环境变量说明**：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | 后端 API 地址 | `http://localhost:8000/api/v1` |
| `VITE_AUTH_DISABLED` | 禁用认证 | `false` |
| `VITE_DEV_MODE_SKIP_LOGIN` | 开发模式跳过登录 | `false` |

## 核心功能

### 主题系统

- 支持明/暗/系统三种模式
- 使用 CSS 变量实现主题切换
- 自动保存用户偏好到 localStorage

```typescript
// 使用主题
import { useTheme } from '@/contexts/ThemeContext'

function App() {
  const { theme, setTheme } = useTheme()
  return <button onClick={() => setTheme('dark')}>切换到深色模式</button>
}
```

### 国际化

- 支持中文/英文
- 自动检测系统语言
- 可手动切换

```typescript
// 使用翻译
import { useTranslation } from 'react-i18next'

function Component() {
  const { t } = useTranslation()
  return <h1>{t('common.welcome')}</h1>
}
```

### 认证

- 登录/注册界面
- Token 管理（localStorage）
- 演示模式（无需登录）

```typescript
// 使用认证
import { useAuth } from '@/contexts/AuthContext'

function App() {
  const { user, login, logout } = useAuth()
  return <div>Welcome, {user?.username}</div>
}
```

### API 客户端

统一的 Axios 实例，自动处理认证和错误：

```typescript
import { projectsApi } from '@/api/client'

// 获取项目列表
const { data } = await projectsApi.list()

// 创建项目
const newProject = await projectsApi.create({
  name: '测试项目',
  description: '项目描述'
})
```

## 主要页面

### 仪表板 (Dashboard)

- 项目概览
- 测试用例统计
- 执行记录
- 性能指标

### 项目管理

- 项目 CRUD
- 环境配置
- 成员管理
- 数据源管理

### API 自动化

- 测试用例管理
- 可视化编辑器
- YAML 编辑器
- 执行历史

### 场景编排

- 拖拽式工作流编辑（ReactFlow）
- 节点配置
- 连接管理
- 可视化执行

### AI 助手

- 需求澄清对话
- AI 用例生成
- 测试建议
- 文档生成

## 可复用组件

### EmptyState

空状态占位组件：

```tsx
import { EmptyState } from '@/components/common/EmptyState'
import { Database } from 'lucide-react'

<EmptyState
  title="暂无数据"
  description="这里什么都没有..."
  icon={Database}
  action={<button>创建第一个项目</button>}
/>
```

### ConfirmDialog

确认对话框（支持文本验证）：

```tsx
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

<ConfirmDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleDelete}
  title="删除项目"
  description="请输入项目名称确认删除"
  verificationText={projectName}  // 用户需要输入此文本才能确认
  isDestructive={true}
/>
```

### Pagination

分页组件：

```tsx
import { Pagination } from '@/components/common/Pagination'

<Pagination
  total={100}
  page={page}
  limit={20}
  onPageChange={(newPage) => setPage(newPage)}
/>
```

### MonacoEditor

代码编辑器：

```tsx
import { MonacoEditor } from '@/components/ui/MonacoEditor'

<MonacoEditor
  value={yamlContent}
  onChange={(value) => setYamlContent(value)}
  language="yaml"
  height="500px"
/>
```

## 开发指南

### 创建新页面

1. 在 `src/pages/` 下创建页面组件
2. 在 `src/App.tsx` 中添加路由
3. 在侧边栏添加导航链接

```typescript
// src/pages/example/ExampleList.tsx
export function ExampleList() {
  return <div>示例页面</div>
}

// src/App.tsx
import { ExampleList } from './pages/example/ExampleList'

<Route path="/example" element={<ExampleList />} />
```

### 添加 API 方法

在 `src/api/client.ts` 中添加：

```typescript
export const exampleApi = {
  list: () => api.get('/examples/'),
  get: (id: number) => api.get(`/examples/${id}`),
  create: (data: ExampleCreate) => api.post('/examples/', data),
  update: (id: number, data: ExampleUpdate) => api.patch(`/examples/${id}`, data),
  delete: (id: number) => api.delete(`/examples/${id}`),
}
```

### 使用 React Query

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// 查询
const { data, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: () => projectsApi.list().then(res => res.data)
})

// 变更
const queryClient = useQueryClient()

const mutation = useMutation({
  mutationFn: (data: ProjectCreate) => projectsApi.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] })
  }
})
```

## 代码规范

### 命名规范

```typescript
// 组件：PascalCase
export function UserList() {}

// 函数和变量：camelCase
const fetchUserData = () => {}

// 常量：UPPER_SNAKE_CASE
const API_BASE_URL = 'http://localhost:8000'

// 接口：PascalCase
interface UserData {}
```

### 导入顺序

```typescript
// 1. 外部库
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. 第三方组件
import { ArrowLeft } from 'lucide-react'

// 3. 内部模块
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
```

### 类型安全

```typescript
// ❌ 避免：使用 any
const data: any = fetchData()

// ✅ 推荐：使用具体类型或 unknown
const data: UserData = fetchData()

// 或
const data: unknown = fetchData()
if (isUserData(data)) {
  // 使用 data
}
```

## 调试技巧

### React DevTools

安装浏览器扩展：[React DevTools](https://react.dev/learn/react-developer-tools)

### Console 日志

```typescript
console.log('调试信息', data)
console.table(users)
console.trace('调用栈')
```

### Network 调试

1. 打开浏览器 DevTools
2. 切换到 Network 标签
3. 查看所有 API 请求和响应

## 常见问题

### CORS 错误

确保后端 CORS 配置包含前端地址：

```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 401 错误

检查环境变量和 Token：

```javascript
console.log(localStorage.getItem('sisyphus-token'))
console.log(import.meta.env.VITE_API_BASE_URL)
```

### 构建失败

```bash
# 清除缓存重新安装
rm -rf node_modules dist package-lock.json
npm install
```

## 相关文档

- [../README.md](../README.md) - 项目主文档
- [../docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md) - 通用开发指南
- [../CLAUDE.md](../CLAUDE.md) - AI 助手开发指南
- [../docs/API.md](../docs/API.md) - API 文档

---

**最后更新**: 2026-02-11
