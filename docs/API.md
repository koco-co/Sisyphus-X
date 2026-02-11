# API Guide

## Canonical Docs

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

OpenAPI 是接口真值来源；本文档用于开发导航。

## Base URL

- `http://localhost:8000/api/v1`

## Auth

- JWT Bearer
- `Authorization: Bearer <token>`

## Endpoint Groups

根据 `backend/app/api/v1/api.py`：

- `/auth`
- `/projects`
- `/interfaces`
- `/files`
- `/testcases`
- `/scenarios`
- `/engine`
- `/dashboard`
- `/reports`
- `/plans`
- `/keywords`
- `/settings`
- `/functional`
- `/documents`
- `/execution`
- `/api-test-cases`
- `/ai/configs`
- `/ai`
- `/test-points`
- `/test-cases/generate`

## Quick Smoke Calls

```bash
# login
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

```bash
# list projects (replace token)
curl "http://localhost:8000/api/v1/projects" \
  -H "Authorization: Bearer <token>"
```
