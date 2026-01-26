# Sisyphus X - AGENTS.md

AI 代理开发指南。本文件包含构建、测试、代码风格和约定。

---

## 🚀 项目结构

```
sisyphus/
├── frontend/  # React 19 + TypeScript + Vite
│   └── src/
│       ├── api/        # Axios API 客户端（按模块组织）
│       ├── components/ # React 组件
│       ├── contexts/   # React Context（Auth, Theme, Sidebar）
│       ├── i18n/       # 国际化配置（中英文）
│       ├── lib/        # 工具函数（cn() 等）
│       ├── pages/      # 页面组件
│       └── types/      # TypeScript 类型定义
├── backend/   # FastAPI + SQLModel
│   └── app/
│       ├── api/v1/endpoints/  # API 路由
│       ├── core/       # 配置、数据库、安全
│       ├── models/     # SQLModel 模型
│       ├── schemas/    # Pydantic schemas
│       └── services/   # 业务逻辑服务层
└── engines/   # 独立测试引擎（api-engine, web-engine, app-engine）
```

---

## 🔧 构建命令

### 前端
```bash
cd frontend
npm run dev          # 开发服务器 (http://localhost:5173)
npm run build        # 生产构建
npm run lint         # ESLint 检查
npm run preview      # 预览生产构建
```

### 后端
```bash
cd backend
conda activate platform-auto
uvicorn app.main:app --reload  # 启动开发服务器 (http://localhost:8000)
alembic upgrade head             # 数据库迁移
```

### 引擎 (api-engine)
```bash
cd engines/api-engine
python main.py run -f examples/example_case.yaml  # 执行测试
python main.py validate -f case.yaml              # 验证 YAML
```

**注意**：前后端均未配置测试框架，建议添加 pytest (后端) 和 Vitest (前端)。

---

## 📝 代码风格指南

### 前端 (TypeScript + React)

#### Import 组织
```typescript
// 1. 外部库（React 优先）
import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
// 2. 第三方库
import { motion } from 'framer-motion'
import { ArrowLeft, Save } from 'lucide-react'
// 3. 内部模块（@ 别名）
import { cn } from '@/lib/utils'
import { AuthContext } from '@/contexts/AuthContext'
import { interfacesApi } from '@/api/client'
```

#### 命名约定
- 文件名：`PascalCase.tsx`（组件）或 `camelCase.ts`（工具函数）
- 组件名：`PascalCase`
- 函数/变量：`camelCase`
- 常量：`UPPER_SNAKE_CASE`

#### 类型定义
```typescript
interface User {
  id: number
  name: string
}

interface ComponentProps {
  title: string
  isLoading?: boolean
  onSubmit: () => void
}

export function Component({ title, isLoading, onSubmit }: ComponentProps) {
  // 避免使用 any，使用 unknown 或具体类型
  const data: unknown = fetchData()
}
```

#### 状态管理
```typescript
// 本地状态
const [isOpen, setIsOpen] = useState(false)

// 全局状态（Context）
const { user, login } = useAuth()

// 服务器状态（React Query）
const { data, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: () => projectsApi.list()
})

// 状态更新
const saveMutation = useMutation({
  mutationFn: (data) => interfacesApi.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['interfaces'] })
  }
})
```

#### API 调用
```typescript
// 使用预设的 API 客户端（src/api/client.ts）
import { interfacesApi, projectsApi } from '@/api/client'

// 自动处理 Authorization header
const { data } = await interfacesApi.get(id)

// 支持请求/响应拦截器，401 自动跳转登录
```

#### 样式处理
```typescript
import { cn } from '@/lib/utils'
// 使用 Tailwind CSS + cn() 工具函数
<div className={cn("base-class", isLoading && "loading-class")} />
```

#### 国际化
```typescript
import { useTranslation } from 'react-i18next'

function Component() {
  const { t } = useTranslation()
  return <h1>{t('nav.dashboard')}</h1>
}
```

#### 常用库
- React Query: 服务器状态管理
- React Router: 路由（v7）
- React Context: 全局状态
- Tailwind CSS: 原子化样式
- Radix UI / shadcn/ui: 无障碍组件
- Lucide React: 图标库
- Framer Motion: 动画
- i18next: 国际化

### 后端 (Python + FastAPI)

#### Import 组织
```python
# 1. 标准库
from typing import Optional, List
from datetime import datetime
# 2. 第三方库
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
# 3. 本地模块
from app.core.db import get_session
from app.models.user import User
from app.schemas.auth import UserCreate
```

#### 命名约定
- 路由函数：`snake_case`
- 类名：`PascalCase`
- 常量：`UPPER_SNAKE_CASE`
- 文件名：`snake_case.py`

#### 类型注解
```python
async def create_project(
    data: ProjectCreate,
    session: AsyncSession = Depends(get_session)
) -> ProjectResponse:
    project = Project(**data.model_dump())
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project
```

#### 数据库操作
```python
# 查询单个
user = await session.get(User, user_id)

# 条件查询
result = await session.execute(select(User).where(User.email == email))
user = result.scalar_one_or_none()

# 创建/更新
session.add(user)
await session.commit()
await session.refresh(user)

# 删除
await session.delete(user)
await session.commit()
```

#### 错误处理
```python
from fastapi import HTTPException, status

# 标准错误
if not user:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found"
    )

# 认证错误
if not verify_password(data.password, user.password_hash):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials"
    )
```

#### Schema 组织
- `models/`: SQLModel 数据库表（继承自 `SQLModel, table=True`）
- `schemas/`: Pydantic 请求/响应（`XxxCreate`, `XxxUpdate`, `XxxResponse`）

---

## 🔒 认证

### 前端
- Token 存储：`localStorage` (key: `sisyphus-token`)
- 拦截器：自动添加 `Authorization: Bearer <token>`
- 401 处理：自动跳转登录页（排除登录/注册请求）
- 开发模式：`VITE_DEV_MODE_SKIP_LOGIN=true` 可跳过登录

### 后端
- JWT Token 认证
- 支持 OAuth (GitHub/Google)
- 依赖注入：`current_user: User = Depends(deps.get_current_user)`
- 可选配置：`AUTH_DISABLED=true` 禁用认证

---

## ⚠️ 禁止事项

1. **禁止**使用 `as any`, `@ts-ignore`, `@ts-expect-error`（前端）
2. **禁止**空 catch 块（`catch(e) {}`）
3. **禁止**硬编码敏感信息（使用环境变量）
4. **前端**禁止存储敏感数据到 localStorage（密码、密钥）
5. **后端**禁止在响应中返回密码字段、密码哈希

---

## 📄 环境变量

### 前端 (`frontend/.env`)
```env
VITE_DEV_MODE_SKIP_LOGIN=true    # 开发模式跳过登录
VITE_AUTH_DISABLED=true           # 禁用认证（后端配置）
```

### 后端 (`backend/.env`)
```env
DATABASE_URL=sqlite+aiosqlite:///./sisyphus.db
SECRET_KEY=change_this_in_production
AUTH_DISABLED=true
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FRONTEND_URL=http://localhost:5173
```

---

## 📝 代码规范工具

- **前端**：ESLint（`frontend/eslint.config.js`）
  - TypeScript ESLint: 类型检查
  - React Hooks: Hooks 规则
  - React Refresh: 热更新

- **后端**：建议添加 Black + isort
  ```bash
  pip install black isort
  black .
  isort .
  ```

---

## 🚢 提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具
```

---

## 💡 最佳实践

### 前端
1. **类型安全**：使用 TypeScript 严格模式，避免 `any`
2. **错误边界**：关键页面添加错误边界
3. **加载状态**：所有异步操作显示加载指示器
4. **表单验证**：使用 Zod 或类似库进行验证
5. **代码拆分**：使用 React.lazy() 拆分大型组件

### 后端
1. **异步优先**：所有数据库操作使用 async/await
2. **依赖注入**：使用 FastAPI Depends() 管理依赖
3. **数据库迁移**：所有 schema 变更需要 Alembic migration
4. **输入验证**：使用 Pydantic schemas 验证所有输入
5. **日志记录**：关键操作添加日志

---

## 📚 关键文件说明

### 前端
- `src/api/client.ts`: Axios 实例，包含所有 API 方法和拦截器
- `src/contexts/`: 全局状态管理（Auth, Theme, Sidebar）
- `src/lib/utils.ts`: 工具函数（cn() 类名合并）
- `src/i18n/locales/`: 翻译文件（zh-CN, en-US）

### 后端
- `app/core/db.py`: 数据库连接配置
- `app/core/config.py`: 环境变量和配置
- `app/core/security.py`: 认证和安全相关
- `app/api/deps.py`: 依赖注入（get_current_user 等）
- `app/services/`: 业务逻辑层（与 API 层分离）
