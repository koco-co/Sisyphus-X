# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Last updated: 2026-02-18

## Project Overview

**SisyphusX** is an AI-driven enterprise-level automated testing platform that provides:
- **智能需求分析** - Multi-turn conversational AI for gathering test requirements
- **AI 用例生成** - Automatic test case generation from requirements
- **接口自动化测试** - Visual editor for API test cases
- **场景编排** - ReactFlow-based workflow orchestration
- **功能测试管理** - Test case knowledge base and planning

### Technology Stack

**Frontend:**
- React 18.2 + TypeScript 5.9.3
- Vite 7.2 (build tool)
- Tailwind CSS + shadcn/ui
- React Router v7, React Query v5, ReactFlow v11
- Monaco Editor, Framer Motion, Recharts
- Zustand (状态管理)
- i18next (国际化)
- Vitest (单元测试) + Playwright (E2E测试)

**Backend:**
- FastAPI 0.115+ (async web framework)
- Python 3.12+
- SQLModel (SQLAlchemy + Pydantic ORM)
- PostgreSQL/SQLite (database)
- Alembic (migrations)
- LangGraph + LangChain + Anthropic Claude (AI)
- sisyphus-api-engine 2.1+ (API测试引擎)

**Package Manager:**
- Frontend: npm
- Backend: UV (fast Python package manager, requires Python 3.12+)

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

npm run dev              # Development server with hot reload (port 5173)
npm run build            # Production build (outputs to dist/)
npm run preview          # Preview production build locally
npm run lint             # Run ESLint
npm run test             # Run Vitest unit tests
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run Playwright with UI mode
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
uv run pytest tests/ -v                    # Run all tests
uv run pytest tests/ -m unit               # Run unit tests only
uv run pytest tests/ -m integration        # Run integration tests only
uv run pytest tests/ -m "not slow"         # Skip slow tests
uv run pytest tests/ --cov=app             # Run with coverage

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
- State: React Query (server), Zustand (global), useState (local)
- API: Centralized Axios client with JWT auto-inject
- i18n: i18next for internationalization
- Testing: Vitest (unit) + Playwright (E2E)

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
- `/scenarios/` - Test scenario orchestration (ReactFlow)
- `/keywords/` - Keyword management for test automation
- `/functional/` - Functional test case and test point management
- `/execution/` - Test execution (synchronous/asynchronous)
- `/ai/` - AI assistant endpoints (clarification, generation, config)
- `/requirements/` - Test requirements management
- `/test-case-knowledge/` - Test case knowledge base
- `/plans/` - Test planning
- `/reports/` - Test reports
- `/global-params/` - Global parameter management
- `/documents/` - Document upload and management
- `/database-configs/` - Database configuration management
- `/settings/` - System settings
- `/user-management/` - User and role management
- `/websocket/` - WebSocket connections for real-time updates

### 3. Database Model-Schema Separation

**Models** (`backend/app/models/`): SQLModel with `table=True`
- `project.py` - Projects, environments, datasources
- `api_test_case.py` - API test cases, steps, assertions
- `interface_test_case.py` - Interface test cases
- `test_case.py` - Generic test case model
- `keyword.py` - Keywords for test automation
- `scenario.py` - Test scenarios (ReactFlow workflows)
- `functional_test_case.py` - Functional test cases
- `functional_test_point.py` - Functional test points
- `ai_conversation.py` - AI chat history
- `ai_config.py` - AI model configuration
- `requirement.py` - Test requirements
- `test_case_knowledge.py` - Test case knowledge base
- `test_plan.py` - Test plans
- `test_execution.py` - Test execution records
- `test_report.py` - Test reports
- `document.py` - Document attachments
- `file_attachment.py` - File attachments
- `global_param.py` - Global parameters
- `env_variable.py` - Environment variables
- `database_config.py` - Database configurations
- `interface_history.py` - Interface change history
- `user.py` - User accounts
- `user_management.py` - User and role management
- `settings.py` - System settings
- `test_case_template.py` - Test case templates
- `plan.py` - Planning data
- `report.py` - Report data

**Schemas** (`backend/app/schemas/`): Pydantic for validation
- Create/Update/Response patterns
- API contracts separate from DB models

### 4. Frontend Component Architecture

**Pages** (`frontend/src/pages/`):
- `api-automation/` - API test case management
  - `ProjectManagement.tsx` - Project CRUD
  - `ApiTestCaseList.tsx` - Test case list and execution
  - `VisualTestCaseEditor.tsx` - Visual test case editor
  - `KeywordManagement.tsx` - Keyword library
  - `BatchExecution.tsx` - Batch test execution
  - `ExecutionResultPage.tsx` - Execution results
  - `DatabaseConfigList.tsx` - Database configuration
- `functional-test/` - Functional test management
  - `RequirementList.tsx` - Requirements list
  - `RequirementClarification.tsx` - AI requirement clarification
  - `GenerateTestCases.tsx` - AI test case generation
  - `TestCaseManagement.tsx` - Test case management
  - `TestPointManagement.tsx` - Test point management
  - `AIConfigManagement.tsx` - AI configuration
- `interface/` - API interface explorer and debug
  - `InterfaceList.tsx` - Interface list
  - `InterfaceEditor.tsx` - Interface editor
- `interface-management/` - Enhanced interface management
- `scenario/` - Scenario orchestration (ReactFlow)
- `plans/` - Test planning (`TestPlan.tsx`)
- `reports/` - Test execution reports (`TestReport.tsx`)
- `environments/` - Environment management (`EnvironmentList.tsx`)
- `global-params/` - Global parameter management
- `keywords/` - Keyword library
- `cases/` - Test case management
- `projects/` - Project management (`ProjectList.tsx`)
- `auth/` - Login/register (`Login.tsx`, `Register.tsx`)

**Components** (`frontend/src/components/`):
- `common/` - EmptyState, ConfirmDialog, Pagination
- `layout/` - AppShell, Navigation
- `ui/` - shadcn/ui base components

### 5. API Test Engine Integration

**Engine Package:** `sisyphus-api-engine>=2.1.0`

- Standalone Python package for YAML-driven API test execution
- Integrates with backend via `/engine/` endpoints
- Supports:
  - HTTP methods (GET, POST, PUT, DELETE, PATCH)
  - Authentication (Bearer Token, Basic Auth, API Key)
  - Assertions (status, headers, JSON path, response time)
  - Data-driven testing with datasets
  - Variable extraction and chaining
- Execution modes: synchronous (immediate) and asynchronous (background)

### 6. Authentication Flow

**Frontend:**
- Token in localStorage: `sisyphus-token`
- Axios interceptor adds `Authorization: Bearer <token>`
- 401 → auto-redirect (except auth endpoints)
- Dev bypass: `VITE_DEV_MODE_SKIP_LOGIN=true`

**Backend:**
- JWT validation via `app.api.deps.get_current_user`
- OAuth support (GitHub/Google)
- Dev bypass: `AUTH_DISABLED=true`

### 7. Real-Time Updates (WebSocket)

**Endpoint:** `/websocket/`

- WebSocket connections for real-time test execution updates
- Live streaming of test execution progress
- Automatic reconnection on disconnect
- Used in: Test execution, AI generation progress, scenario orchestration

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
// Local state
const [isOpen, setIsOpen] = useState(false)

// Server state (React Query)
const { data, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: () => projectsApi.list()
})

// Global state (Zustand)
const { user, setUser } = useAuthStore()

// Internationalization
const { t } = useTranslation()
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

### Testing Best Practices

**Frontend Testing:**
```bash
# Unit tests with Vitest
npm run test

# E2E tests with Playwright
npm run test:e2e

# Coverage
npm run test:coverage
```

**Backend Testing:**
```bash
# Run all tests
uv run pytest tests/ -v

# Run specific test types
uv run pytest tests/ -m unit
uv run pytest tests/ -m integration

# Coverage
uv run pytest tests/ --cov=app --cov-report=html
```

**Test Organization:**
- Unit tests: Test individual functions/components in isolation
- Integration tests: Test API endpoints and database operations
- E2E tests: Test critical user flows (login, create test case, execute tests)
- Use markers to categorize tests: `@pytest.mark.unit`, `@pytest.mark.integration`

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
- Backend: UV (much faster than pip, requires Python 3.12+)

**Type Safety:** Strict TypeScript frontend, type hints backend

**Testing:**
- Frontend: Vitest (unit), Playwright (E2E)
- Backend: pytest with markers (unit, integration, api, slow)
- Minimum coverage: 80%

**i18n:** User-facing strings use translation keys (i18next)

**API Test Engine:** sisyphus-api-engine package provides standalone YAML-driven test execution

**Error Handling:** Centralized in API client interceptor

**Real-time:** WebSocket connections for live test execution updates

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
- Zustand for global state management
- i18next for internationalization
- Comprehensive testing: Vitest + Playwright + pytest
