# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Last updated: 2025-01-30

## Project Overview

**SisyphusX** is an AI-driven enterprise-level automated testing platform that provides visual test management, scenario orchestration, and multi-engine test execution capabilities.

### Core Purpose
Enable teams to create, manage, and execute automated tests through a visual interface while supporting code-driven workflows for advanced users.

### AI Features（NEW）
- **智能需求分析** - Multi-turn conversational AI for gathering test requirements
- **AI 用例生成** - Automatic test case generation from requirements
- **智能文档生成** - Auto-generate test documentation
- **LangGraph Agent** - Complex workflow orchestration for AI interactions

### Architecture
```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  React Frontend │ ───> │  FastAPI Backend│ ───> │  Test Engines   │
│  (TypeScript)   │      │  (Python)       │      │  (Python)       │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                              │                         │
                              ▼                         ▼
                       ┌─────────────┐         ┌─────────────┐
                       │ PostgreSQL  │         │  YAML Test  │
                       │   / SQLite  │         │  Execution  │
                       └─────────────┘         └─────────────┘
```

---

## Quick Reference - Essential Commands

### Starting Development Environment

```bash
# 1. Start infrastructure services (PostgreSQL, Redis, MinIO)
docker compose up -d

# 2. Start backend (requires conda environment)
conda activate platform-auto
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload  # Runs on http://localhost:8000

# 3. Start frontend (new terminal)
cd frontend
npm install
npm run dev  # Runs on http://localhost:5173

# 4. Access API documentation
open http://localhost:8000/docs  # Auto-generated OpenAPI docs
```

### Database Migrations

```bash
cd backend

# Create migration after model changes
alembic revision --autogenerate -m "Describe your changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

### Frontend Commands

```bash
cd frontend

npm run dev       # Development server with hot reload
npm run build     # Production build (outputs to dist/)
npm run preview   # Preview production build locally
npm run lint      # Run ESLint to check code quality
```

### Backend Commands

```bash
cd backend

# Run with auto-reload during development
uvicorn app.main:app --reload

# Run with specific host/port
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Check dependencies
pip list
```

### Testing (Manual)

```bash
# Backend API testing - use the interactive docs
open http://localhost:8000/docs

# Frontend testing - manual testing in browser
npm run dev

# Engine testing (when api-engine is implemented)
# See engines/api_engine/ directory structure
```

---

## Environment Setup

**Conda Environment:**
```bash
# Activate the Python environment
conda activate platform-auto
```

**Frontend Environment Variables** (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_AUTH_DISABLED=true
VITE_DEV_MODE_SKIP_LOGIN=true  # Bypass login in development
```

**Backend Environment Variables** (root `.env`):
```env
DATABASE_URL=sqlite+aiosqlite:///./sisyphus.db
# Or for PostgreSQL: postgresql+asyncpg://user:pass@localhost:5432/dbname

REDIS_URL=redis://localhost:6379/0
SECRET_KEY=change_this_in_production
AUTH_DISABLED=true  # Set to false in production
```

### Key Technologies

**Frontend Stack:**
- React 19.2.0 + TypeScript 5.9
- Vite 7.2 (build tool)
- Tailwind CSS + shadcn/ui (styling)
- React Router v7 (routing)
- React Query v5 (server state)
- ReactFlow v11 (workflow editor)
- Monaco Editor (code editing)
- i18next (internationalization)

**Backend Stack:**
- FastAPI (web framework)
- SQLModel (ORM - SQLAlchemy + Pydantic)
- PostgreSQL/SQLite (database)
- Redis (caching)
- httpx (HTTP client)
- Alembic (migrations)

**Test Engines:**
- `engines/api_engine/` - API test execution (currently empty, being developed)
- web-engine: Web UI automation (planned)
- app-engine: Mobile app automation (planned)

---

## High-Level Architecture

### Three-Layer Separation

**1. Frontend (Visual Interface)**
- Path: `frontend/src/`
- Responsibility: User interaction, data visualization, workflow editing
- State Management: React Query (server state), Context (global state), useState (local state)
- API Communication: Centralized Axios client with auto-auth

**2. Backend (API & Data)**
- Path: `backend/app/`
- Responsibility: REST API, business logic, data persistence
- Architecture: FastAPI + SQLModel (ORM) + PostgreSQL/SQLite
- Key Pattern: All endpoints use async/await, dependency injection for auth/session

**3. Engines (Test Execution)**
- Path: `engines/`
- Responsibility: Execute test definitions, return results
- Status: `api_engine` exists but is empty; being actively developed
- Note: Engines are standalone Python packages that can run independently

### Data Flow Architecture

```
User Action (Frontend)
    ↓
React Query Mutation/Query
    ↓
API Client (Axios with JWT auto-inject)
    ↓
FastAPI Endpoint (async)
    ↓
Service Layer (business logic)
    ↓
Database (SQLModel/SQLAlchemy)
    ↓
Response → Query Cache → UI Update
```

### Critical Architectural Patterns

**1. API Client Centralization**
- Location: `frontend/src/api/client.ts`
- Pattern: Single Axios instance with interceptors
- Auto-injects JWT from localStorage on every request
- Handles 401 errors with auto-redirect to login
- All API methods organized by domain (e.g., `projectsApi`, `interfacesApi`)

**2. Backend Router Organization**
- Location: `backend/app/api/v1/api.py`
- Pattern: All routers registered with consistent prefixes
- Authentication: `dependencies=[Depends(deps.get_current_user)]` on protected routes
- Tags for OpenAPI documentation grouping

**3. Database Model-Schema Separation**
- Models (`backend/app/models/`): SQLModel classes with `table=True`
- Schemas (`backend/app/schemas/`): Pydantic models for request/response validation
- Pattern: Models = database tables, Schemas = API contracts

**4. Frontend Component Architecture**
- Pages (`frontend/src/pages/`): Route-level components
- Common components (`frontend/src/components/common/`): Reusable across pages
- UI components (`frontend/src/components/ui/`): shadcn/ui base components
- Pattern: Lift state up when components need to share data

**5. Authentication Flow**
- Frontend: Token stored in localStorage (`sisyphus-token`)
- Backend: JWT validation via `get_current_user` dependency
- Dev bypass: `VITE_DEV_MODE_SKIP_LOGIN=true` or `AUTH_DISABLED=true`
- 401 handling: Auto-redirect to login (except on auth endpoints)

---

## Common Development Tasks

### Adding a New Backend Feature

**Step 1: Create Database Model**
```python
# backend/app/models/feature.py
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional

class Feature(SQLModel, table=True):
    __tablename__ = "features"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

**Step 2: Create Pydantic Schemas**
```python
# backend/app/schemas/feature.py
from pydantic import BaseModel

class FeatureCreate(BaseModel):
    name: str
    description: Optional[str] = None

class FeatureUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class FeatureResponse(FeatureCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
```

**Step 3: Create API Endpoint**
```python
# backend/app/api/v1/endpoints/feature.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.db import get_session
from app.models.feature import Feature
from app.schemas.feature import FeatureCreate, FeatureResponse

router = APIRouter()

@router.get("/", response_model=List[FeatureResponse])
async def list_features(
    session: AsyncSession = Depends(get_session)
) -> List[FeatureResponse]:
    result = await session.execute(select(Feature))
    features = result.scalars().all()
    return features

@router.post("/", response_model=FeatureResponse)
async def create_feature(
    data: FeatureCreate,
    session: AsyncSession = Depends(get_session)
) -> FeatureResponse:
    feature = Feature(**data.model_dump())
    session.add(feature)
    await session.commit()
    await session.refresh(feature)
    return feature
```

**Step 4: Register Router**
```python
# backend/app/api/v1/api.py
from app.api.v1.endpoints import feature
api_router.include_router(
    feature.router,
    prefix="/features",
    tags=["features"],
    dependencies=[Depends(deps.get_current_user)]
)
```

**Step 5: Generate Database Migration**
```bash
cd backend
alembic revision --autogenerate -m "Add features table"
alembic upgrade head
```

### Adding a New Frontend Page

**Step 1: Add API Client Methods**
```typescript
// frontend/src/api/client.ts
export const featuresApi = {
  list: () => api.get('/features/'),
  get: (id: number) => api.get(`/features/${id}`),
  create: (data: FeatureCreate) => api.post('/features/', data),
  update: (id: number, data: FeatureUpdate) => api.patch(`/features/${id}`, data),
  delete: (id: number) => api.delete(`/features/${id}`),
}
```

**Step 2: Create Page Component**
```typescript
// frontend/src/pages/features/FeatureList.tsx
import { useQuery } from '@tanstack/react-query'
import { featuresApi } from '@/api/client'

export function FeatureList() {
  const { data: features, isLoading } = useQuery({
    queryKey: ['features'],
    queryFn: () => featuresApi.list().then(res => res.data)
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <h1>Features</h1>
      {/* Render features list */}
    </div>
  )
}
```

**Step 3: Add Route**
```typescript
// frontend/src/App.tsx
import { FeatureList } from './pages/features/FeatureList'

// Add to router configuration
<Route path="/features" element={<FeatureList />} />
```

**Step 4: Add Navigation Link**
```typescript
// Add to sidebar or navigation component
<Link to="/features">Features</Link>
```

### Debugging Common Issues

**CORS Errors:**
- Check `backend/app/main.py` CORS middleware configuration
- Ensure frontend URL is in `allow_origins`
- Both frontend and backend should be running

**401 Unauthorized:**
- Check if token exists in localStorage: `localStorage.getItem('sisyphus-token')`
- Verify `AUTH_DISABLED=true` in both frontend `.env` and backend `.env` for dev mode
- Check backend console for authentication errors

**Database Connection Issues:**
- Ensure PostgreSQL is running: `docker compose ps`
- Check `DATABASE_URL` in backend `.env`
- For SQLite, ensure the directory is writable
- Run migrations: `alembic upgrade head`

**Import Path Issues (@ alias):**
- Frontend: Ensure `vite.config.ts` has `@` pointing to `./src`
- Backend: Use absolute imports from `app.` prefix

---

## Code Style & Conventions

### Frontend (TypeScript)

**Import Order:**
```typescript
// 1. External libraries (React first)
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. Third-party libraries
import { ArrowLeft } from 'lucide-react'

// 3. Internal modules (@ alias)
import { cn } from '@/lib/utils'
import { projectsApi } from '@/api/client'
```

**Naming Conventions:**
- Components: `PascalCase` (e.g., `UserList.tsx`)
- Functions/variables: `camelCase` (e.g., `fetchUserData`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`)
- Files: Match export name (PascalCase for components, camelCase for utilities)

**Type Safety:**
```typescript
// NEVER use 'any' - use unknown or specific types
const data: unknown = fetchData()

// Use interfaces for component props
interface Props {
  title: string
  isLoading?: boolean
  onSubmit: () => void
}
```

**State Management:**
```typescript
// Local state
const [isOpen, setIsOpen] = useState(false)

// Server state (React Query)
const { data, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: () => projectsApi.list()
})

// Global state (Context)
const { user } = useAuth()
```

### Backend (Python)

**Import Order:**
```python
# 1. Standard library
from typing import Optional, List
from datetime import datetime

# 2. Third-party libraries
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select

# 3. Local modules
from app.core.db import get_session
from app.models.project import Project
```

**Naming Conventions:**
- Functions/variables: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `snake_case.py`

**Type Annotations:**
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

**Database Operations:**
```python
# Query single
user = await session.get(User, user_id)

# Query with conditions
result = await session.execute(select(User).where(User.email == email))
user = result.scalar_one_or_none()

# Create
session.add(user)
await session.commit()
await session.refresh(user)

# Delete
await session.delete(user)
await session.commit()
```

---

## Configuration & Environment

### Environment Variables

**Backend Configuration** (root `.env`):
```env
# Database - SQLite for development, PostgreSQL for production
DATABASE_URL=sqlite+aiosqlite:///./sisyphus.db
# DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/sisyphus

# Redis (optional)
REDIS_URL=redis://localhost:6379/0

# Application
SECRET_KEY=change_this_in_production
PROJECT_NAME="Sisyphus X"
API_V1_STR=/api/v1

# Authentication - Set to false in production
AUTH_DISABLED=true
```

**Frontend Configuration** (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_AUTH_DISABLED=true
VITE_DEV_MODE_SKIP_LOGIN=true  # Bypass login in development
```

**Access Environment Variables:**
- Frontend: `import.meta.env.VITE_API_BASE_URL`
- Backend: `from app.core.config import settings; settings.DATABASE_URL`

### Frontend Configuration

**Location:** `frontend/src/config/index.ts`

Centralized configuration for:
- API base URL
- Storage keys (localStorage)
- Default page size
- App metadata

---

## Authentication Flow

### Frontend Authentication
1. Login stores JWT token in localStorage (key: `sisyphus-token`)
2. Axios interceptor adds `Authorization: Bearer <token>` to all requests
3. 401 response triggers redirect to `/login` (excluding auth endpoints)
4. Dev bypass: Set `VITE_DEV_MODE_SKIP_LOGIN=true`

### Backend Authentication
1. JWT token validation via `app.api.deps.get_current_user`
2. OAuth support (GitHub/Google) - configured in `.env`
3. Can disable auth with `AUTH_DISABLED=true` (dev mode)

### Protected Routes Example
```python
from app.api import deps

@router.get("/protected")
async def protected_route(
    current_user: User = Depends(deps.get_current_user)
):
    # current_user is available here
    pass
```

---

## Component Library

### shadcn/ui Components
**Location:** `frontend/src/components/ui/`

Installed: Dialog, Dropdown Menu, Scroll Area, Switch, Tabs, Tooltip

### Custom Components
**Location:** `frontend/src/components/`

**Common Components** (`common/`):
- `EmptyState.tsx` - Placeholder for empty lists
- `ConfirmDialog.tsx` - Confirmation dialog with text verification
- `Pagination.tsx` - List pagination

**UI Components** (`ui/`):
- `MonacoEditor.tsx` - Code editor wrapper
- `CustomSelect.tsx` - Enhanced select
- `StatusBadge.tsx` - Status display
- `Toast.tsx` - Notification system

**Example Usage:**
```typescript
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

<ConfirmDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleDelete}
  title="Delete Project"
  description="Type project name to confirm"
  verificationText={projectName}  // User must type this to confirm
  isDestructive={true}
/>
```

---

## Common Patterns

### Async Data Fetching (React Query)
```typescript
// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['projects', projectId],
  queryFn: () => projectsApi.get(projectId).then(res => res.data)
})

// Mutation with invalidation
const mutation = useMutation({
  mutationFn: (data) => projectsApi.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] })
  }
})
```

### Error Handling

**Frontend:**
```typescript
try {
  await projectsApi.create(data)
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.error(error.response?.data?.detail)
  }
}
```

**Backend:**
```python
from fastapi import HTTPException, status

if not project:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Project not found"
    )
```

---

## Prohibited Actions

1. **NEVER** use `as any`, `@ts-ignore`, or `@ts-expect-error` in frontend
2. **NEVER** use empty catch blocks - always log or handle errors
3. **NEVER** hardcode sensitive data (use environment variables)
4. **NEVER** store passwords/keys in localStorage (frontend)
5. **NEVER** return password hashes in API responses (backend)
6. **NEVER** commit `.env` files (use `.env.example`)

---

## Commit Conventions

```
feat: new feature
fix: bug fix
docs: documentation changes
style: code formatting (no logic change)
refactor: code refactoring
perf: performance improvement
test: adding/updating tests
chore: build/tools/config

# Examples
feat: add Swagger import functionality
fix: resolve infinite loop in keyword editor
docs: update API documentation
refactor: extract reusable components
```

---

## Key Files Reference

### Frontend
- `frontend/src/api/client.ts` - Centralized API client with interceptors
- `frontend/src/config/index.ts` - Frontend configuration
- `frontend/vite.config.ts` - Vite build config with @ alias
- `frontend/eslint.config.js` - ESLint configuration

### Backend
- `backend/app/main.py` - FastAPI application entry point
- `backend/app/api/v1/api.py` - Router registration
- `backend/app/core/config.py` - Settings and environment variables
- `backend/app/core/db.py` - Database connection
- `backend/app/api/deps.py` - Dependencies (get_current_user, etc.)

### Documentation
- `README.md` - User-facing documentation
- `AGENTS.md` - Development conventions and workflows
- `CLAUDE.md` - This file (AI assistant guide)

---

## Important Notes

**Database:** Use SQLModel (combines SQLAlchemy + Pydantic). All operations must be async/await.

**API Versioning:** All routes prefixed with `/api/v1`

**State Management:**
- React Query for server state
- React Context for global state
- useState for local component state

**Styling:** Tailwind CSS with `cn()` utility for class merging

**Type Safety:** Strict TypeScript on frontend, type hints on backend

**i18n:** All user-facing strings must use translation keys

**Error Handling:** Centralized in API client

---

## Summary

SisyphusX is a modern, full-stack automated testing platform with clear separation between:
- **Frontend** (React + TypeScript): Visual interface
- **Backend** (FastAPI + Python): API and persistence
- **Engines** (Python): Test execution

The project emphasizes type safety, async operations, and component reusability. The modular architecture enables independent development and testing.

**Remember:** Refer to AGENTS.md for detailed coding conventions and this file (CLAUDE.md) for AI assistant-specific guidance.
