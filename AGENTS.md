# Sisyphus X - AGENTS.md

AI 代理开发指南。本文件包含构建、测试、代码风格和约定。

---

## 🚀 项目结构

```
sisyphus/
├── frontend/  # React 18 + TypeScript + Vite
│   └── src/
│       ├── api/        # Axios API 客户端（按模块组织）
│       ├── components/ # React 组件
│       ├── contexts/   # React Context（Auth, Theme, Sidebar）
│       ├── lib/        # 工具函数（cn()）
│       └── pages/      # 页面组件
├── backend/   # FastAPI + SQLModel
│   └── app/
│       ├── api/v1/endpoints/  # API 路由
│       ├── core/       # 配置、数据库、安全
│       ├── models/     # SQLModel 模型
│       └── schemas/    # Pydantic schemas
└── engines/   # 独立测试引擎（api-engine, web-engine, app-engine）
```

---

## 🔧 构建命令

### 前端
```bash
cd frontend
npm run dev          # 开发服务器
npm run build        # 生产构建
npm run lint         # ESLint 检查
npm run preview      # 预览生产构建
```

### 后端
```bash
cd backend
conda activate platform-auto
uvicorn app.main:app --reload  # 启动开发服务器
alembic upgrade head             # 数据库迁移
```

### 引擎 (api-engine)
```bash
cd engines/api-engine
python main.py run -f examples/example_case.yaml  # 执行测试
python main.py validate -f case.yaml              # 验证 YAML
```

**注意**：前后端均未配置测试框架。

---

## 📝 代码风格指南

### 前端 (TypeScript + React)

#### Import 组织
```typescript
// 1. 外部库（React 优先）
import React from 'react'
// 2. 第三方库
import { useQuery } from '@tanstack/react-query'
// 3. 内部模块（@ 别名）
import { cn } from '@/lib/utils'
import { AuthContext } from '@/contexts/AuthContext'
```

#### 命名约定
- 文件名：`PascalCase.tsx` 或 `kebab-case.tsx`
- 组件名：`PascalCase`
- 工具函数：`camelCase`

#### 类型定义
```typescript
interface User { id: number; name: string }

interface ComponentProps {
    title: string
    isLoading?: boolean
    onSubmit: () => void
}

export function Component({ title, isLoading, onSubmit }: ComponentProps) {
    // ...
}
```

#### 状态管理
```typescript
// 本地状态
const [isOpen, setIsOpen] = useState(false)

// 全局状态（Context）
const { user, login } = useAuth()

// 服务器状态（React Query）
const { data } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list()
})
```

#### 样式处理
```typescript
import { cn } from '@/lib/utils'
<div className={cn("base-class", isLoading && "loading-class")} />
```

#### 常用库
- React Query: 服务器状态
- React Router: 路由
- React Context: 全局状态
- Tailwind CSS: 样式
- Radix UI / shadcn/ui: 组件库
- Lucide React: 图标

### 后端 (Python + FastAPI)

#### Import 组织
```python
# 1. 标准库
from typing import Optional
# 2. 第三方库
from fastapi import APIRouter, Depends, HTTPException
# 3. 本地模块
from app.core.db import get_session
from app.models.user import User
```

#### 命名约定
- 路由函数：`snake_case`
- 类名：`PascalCase`
- 常量：`UPPER_SNAKE_CASE`

#### 类型注解
```python
async def create_project(
    data: ProjectCreate,
    session: AsyncSession = Depends(get_session)
) -> ProjectResponse:
    project = Project(**data.dict())
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project
```

#### 数据库操作
```python
# 查询
result = await session.execute(select(User).where(User.email == email))
user = result.scalar_one_or_none()

# 创建
session.add(user)
await session.commit()
await session.refresh(user)
```

#### Schema 组织
- `models/`: SQLModel 数据库表
- `schemas/`: Pydantic 请求/响应（XxxCreate, XxxUpdate, XxxResponse）

---

## 🔒 认证

### 前端
- Token 存储：`localStorage` (key: `sisyphus-token`)
- 拦截器：自动添加 `Authorization: Bearer <token>`

### 后端
- JWT Token 认证
- 支持 OAuth (GitHub/Google)
- 依赖注入：`current_user: User = Depends(deps.get_current_user)`

---

## ⚠️ 禁止事项

1. **禁止**使用 `as any`, `@ts-ignore`, `@ts-expect-error`
2. **禁止**空 catch 块（`catch(e) {}`）
3. **禁止**硬编码敏感信息
4. **前端**禁止存储敏感数据到 localStorage
5. **后端**禁止在响应中返回密码字段

---

## 📄 环境变量

### 前端 (`frontend/.env`)
```env
VITE_DEV_MODE_SKIP_LOGIN=true
```

### 后端 (`backend/.env`)
```env
DATABASE_URL=sqlite+aiosqlite:///./sisyphus.db
SECRET_KEY=change_this_in_production
AUTH_DISABLED=true
```

---

## 📝 代码规范工具

- **前端**：ESLint（`frontend/eslint.config.js`）
- **后端**：Black + isort（未配置，建议添加）

---

## 🚢 提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试相关
chore: 构建/工具
```
