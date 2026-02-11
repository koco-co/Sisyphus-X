# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Last updated: 2025-02-11

## Project Overview

**SisyphusX** is an AI-driven enterprise-level automated testing platform that provides:
- **智能需求分析** - Multi-turn conversational AI for gathering test requirements
- **AI 用例生成** - Automatic test case generation from requirements
- **接口自动化测试** - Visual editor for API test cases
- **场景编排** - ReactFlow-based workflow orchestration
- **功能测试管理** - Test case knowledge base and planning

### Technology Stack

**Frontend:**
- React 19.2 + TypeScript 5.9
- Vite 7.2 (build tool)
- Tailwind CSS + shadcn/ui
- React Router v7, React Query v5, ReactFlow v11
- Monaco Editor, Framer Motion, Recharts

**Backend:**
- FastAPI 0.115+ (async web framework)
- SQLModel (SQLAlchemy + Pydantic ORM)
- PostgreSQL/SQLite (database)
- Alembic (migrations)
- LangGraph + LangChain + Anthropic Claude (AI)

**Package Manager:**
- Frontend: npm
- Backend: UV (fast Python package manager)

---

## Quick Reference - Essential Commands

### Starting Development Environment

```bash
# 1. Start infrastructure services (PostgreSQL, Redis, MinIO)
docker compose up -d

# 2. Start backend (using UV)
cd backend
uv sync  # Install dependencies (first time)
uv run alembic upgrade head  # Apply migrations
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. Start frontend (new terminal)
cd frontend
npm install
npm run dev

# 4. Access services
# Frontend: http://localhost:5173
# API Docs: http://localhost:8000/docs
```

### Database Migrations

```bash
cd backend

# Create migration after model changes
uv run alembic revision --autogenerate -m "Describe your changes"

# Apply migrations
uv run alembic upgrade head

# Rollback one migration
uv run alembic downgrade -1

# View migration history
uv run alembic history
```

### Frontend Commands

```bash
cd frontend

npm run dev       # Development server with hot reload (port 5173)
npm run build     # Production build (outputs to dist/)
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

### Backend Commands

```bash
cd backend

# Development server
uv run uvicorn app.main:app --reload

# Code quality
uv run ruff check app/          # Linting
uv run ruff format app/         # Formatting
uv run pyright app/             # Type checking

# Testing
uv run pytest tests/ -v

# Dependencies
uv add package-name              # Add dependency
uv add --dev package-name       # Add dev dependency
uv sync                         # Sync dependencies
```

---

## High-Level Architecture

### Three-Layer Separation

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

**1. Frontend** (`frontend/src/`)
- User interaction and data visualization
- State: React Query (server), Context (global), useState (local)
- API: Centralized Axios client with JWT auto-inject

**2. Backend** (`backend/app/`)
- REST API, business logic, data persistence
- All endpoints async/await
- SQLModel ORM + Alembic migrations

**3. Engines** (`engines/`)
- Standalone test execution packages
- `api-engine`: YAML-driven API testing (currently being developed)
- Future: `web-engine`, `app-engine`

### Data Flow

```
User Action (React)
    ↓
React Query Mutation/Query
    ↓
API Client (Axios + JWT interceptor)
    ↓
FastAPI Endpoint (async)
    ↓
Service Layer / Database
    ↓
Response → Cache → UI Update
```

---

## Critical Architectural Patterns

### 1. API Client Centralization

**Location:** `frontend/src/api/client.ts`

- Single Axios instance with request/response interceptors
- Auto-injects JWT from localStorage (`sisyphus-token`)
- 401 handling: Auto-redirect to `/login` (excludes auth endpoints)
- All APIs organized by domain: `projectsApi`, `interfacesApi`, etc.

### 2. Backend Router Organization

**Location:** `backend/app/api/v1/api.py`

- All routers registered with consistent prefixes
- Authentication: `dependencies=[Depends(deps.get_current_user)]`
- Tags for OpenAPI grouping

**Key endpoints:**
- `/auth/` - Authentication (login, register, OAuth)
- `/projects/` - Project management, environments, datasources
- `/interfaces/` - API interface management, folders, Swagger import
- `/api-test-cases/` - API test case CRUD
- `/ai/` - AI assistant endpoints (clarification, generation)
- `/requirements/` - Test requirements management
- `/test-case-knowledge/` - Test case knowledge base

### 3. Database Model-Schema Separation

**Models** (`backend/app/models/`): SQLModel with `table=True`
- `project.py` - Projects, environments, datasources
- `api_test_case.py` - API test cases, steps, assertions
- `ai_conversation.py` - AI chat history
- `requirement.py` - Test requirements
- `test_case_knowledge.py` - Test case knowledge base
- `functional_test_case.py` - Functional test cases
- `scenario.py` - Test scenarios

**Schemas** (`backend/app/schemas/`): Pydantic for validation
- Create/Update/Response patterns
- API contracts separate from DB models

### 4. Frontend Component Architecture

**Pages** (`frontend/src/pages/`):
- `api-automation/` - API test case management
- `functional-test/` - Functional test management
- `interface/` - API interface explorer and debug
- `plans/` - Test planning
- `reports/` - Test execution reports
- `scenario/` - Scenario orchestration (ReactFlow)
- `auth/` - Login/register

**Components** (`frontend/src/components/`):
- `common/` - EmptyState, ConfirmDialog, Pagination
- `layout/` - AppShell, Navigation
- `ui/` - shadcn/ui base components

### 5. Authentication Flow

**Frontend:**
- Token in localStorage: `sisyphus-token`
- Axios interceptor adds `Authorization: Bearer <token>`
- 401 → auto-redirect (except auth endpoints)
- Dev bypass: `VITE_DEV_MODE_SKIP_LOGIN=true`

**Backend:**
- JWT validation via `app.api.deps.get_current_user`
- OAuth support (GitHub/Google)
- Dev bypass: `AUTH_DISABLED=true`

---

## Environment Setup

### Environment Variables

**Backend** (root `.env`):
```env
# Database
DATABASE_URL=sqlite+aiosqlite:///./sisyphus.db
# DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/sisyphus

# Redis
REDIS_URL=redis://localhost:6379/0

# Auth
SECRET_KEY=change_this_in_production
AUTH_DISABLED=true  # Dev mode only

# AI
ANTHROPIC_API_KEY=sk-ant-xxxxx

# OAuth (optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

**Frontend** (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_AUTH_DISABLED=true
VITE_DEV_MODE_SKIP_LOGIN=true
```

### Configuration Files

- **Backend config:** `backend/app/core/config.py` (Pydantic Settings)
- **Frontend config:** `frontend/src/config/index.ts`
- **Vite config:** `frontend/vite.config.ts` (@ alias → ./src)
- **Ruff config:** `backend/pyproject.toml` (line length: 100)
- **Alembic:** `backend/alembic.ini`

---

## Code Style & Conventions

### Frontend (TypeScript)

**Import Order:**
```typescript
// 1. External libraries
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. Third-party UI
import { ArrowLeft } from 'lucide-react'

// 3. Internal modules (@ alias)
import { cn } from '@/lib/utils'
import { projectsApi } from '@/api/client'
```

**Naming:**
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Constants: `UPPER_SNAKE_CASE`

**State Management:**
```typescript
// Local
const [isOpen, setIsOpen] = useState(false)

// Server (React Query)
const { data, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: () => projectsApi.list()
})

// Global (Context/Zustand)
const { user } = useAuth()
```

### Backend (Python)

**Import Order:**
```python
# 1. Standard library
from typing import Optional, List
from datetime import datetime

# 2. Third-party
from fastapi import APIRouter, Depends
from sqlmodel import select

# 3. Local modules
from app.core.db import get_session
from app.models.project import Project
```

**Naming:**
- Functions/variables: `snake_case`
- Classes: `PascalCase`
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
# Single
user = await session.get(User, user_id)

# With conditions
result = await session.execute(select(User).where(User.email == email))
user = result.scalar_one_or_none()

# Create/update/delete
session.add(item)
await session.commit()
await session.refresh(item)
```

---

## Common Development Tasks

### Adding a Backend Feature

1. Create model in `backend/app/models/feature.py`
2. Create schemas in `backend/app/schemas/feature.py`
3. Create router in `backend/app/api/v1/endpoints/feature.py`
4. Register in `backend/app/api/v1/api.py`
5. Generate migration: `uv run alembic revision --autogenerate -m "Add feature"`
6. Apply migration: `uv run alembic upgrade head`

### Adding a Frontend Page

1. Add API methods to `frontend/src/api/client.ts`
2. Create page component in `frontend/src/pages/feature/Feature.tsx`
3. Add route in `frontend/src/App.tsx`
4. Add navigation link in layout component

### Debugging Issues

**CORS:** Check `backend/app/main.py` allow_origins
**401:** Check `AUTH_DISABLED` in both .env files
**DB:** Ensure PostgreSQL running (`docker compose ps`) and migrations applied
**Import paths:** Frontend uses `@/` alias, backend uses `app.` prefix

---

## Key Files Reference

### Frontend
- `frontend/src/api/client.ts` - Centralized API client with interceptors
- `frontend/src/config/index.ts` - Frontend configuration
- `frontend/vite.config.ts` - Build config with @ alias
- `frontend/src/App.tsx` - Router setup
- `frontend/eslint.config.js` - ESLint config

### Backend
- `backend/app/main.py` - FastAPI app entry point
- `backend/app/api/v1/api.py` - Router registration
- `backend/app/core/config.py` - Settings management
- `backend/app/core/db.py` - Database connection
- `backend/app/api/deps.py` - Auth dependencies

### Documentation
- `README.md` - User-facing documentation
- `CLAUDE.md` - This file (AI assistant guide)

---

## Important Notes

**Database:** SQLModel (SQLAlchemy + Pydantic). All operations async/await.

**API Versioning:** All routes prefixed with `/api/v1`

**Package Manager:**
- Frontend: npm (standard)
- Backend: UV (much faster than pip)

**Type Safety:** Strict TypeScript frontend, type hints backend

**Testing:** Manual testing via API docs (`/docs`) and frontend UI

**i18n:** User-facing strings use translation keys (i18next)

**Error Handling:** Centralized in API client interceptor

---

## Summary

SisyphusX is a modern full-stack testing platform with clear separation:
- **Frontend** (React + TypeScript): Visual interface and workflow editing
- **Backend** (FastAPI + Python): REST API and data persistence
- **Engines** (Python): Standalone test execution packages

Key patterns:
- Centralized API client with auto-auth
- Model-schema separation for type safety
- Async-first throughout
- UV for fast Python dependency management
- Alembic for database migrations
