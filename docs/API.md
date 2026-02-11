# API 文档

SisyphusX RESTful API 完整文档。

## 基础信息

- **Base URL**: `http://localhost:8000/api/v1`
- **认证方式**: JWT Bearer Token
- **内容类型**: `application/json`
- **交互式文档**: http://localhost:8000/docs (Swagger UI)
- **备选文档**: http://localhost:8000/redoc (ReDoc)

## 认证

### 获取 Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**响应**：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 使用 Token

```http
GET /api/v1/projects/
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 端点列表

### 认证模块 (Auth)

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/auth/login` | 用户登录 | 否 |
| POST | `/auth/register` | 用户注册 | 否 |
| GET | `/auth/me` | 获取当前用户信息 | 是 |

### 用户管理 (Users)

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/users/` | 获取用户列表 | 是 |
| GET | `/users/{id}` | 获取用户详情 | 是 |
| PUT | `/users/{id}` | 更新用户信息 | 是 |
| DELETE | `/users/{id}` | 删除用户 | 是 |

### 项目管理 (Projects)

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/projects/` | 获取项目列表 | 是 |
| POST | `/projects/` | 创建项目 | 是 |
| GET | `/projects/{id}` | 获取项目详情 | 是 |
| PUT | `/projects/{id}` | 更新项目 | 是 |
| DELETE | `/projects/{id}` | 删除项目 | 是 |

### 接口管理 (Interfaces)

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/interfaces/` | 获取接口列表 | 是 |
| POST | `/interfaces/` | 创建接口 | 是 |
| GET | `/interfaces/{id}` | 获取接口详情 | 是 |
| PUT | `/interfaces/{id}` | 更新接口 | 是 |
| DELETE | `/interfaces/{id}` | 删除接口 | 是 |
| POST | `/interfaces/import` | 导入接口（Swagger） | 是 |

### 测试用例 (Test Cases)

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/testcases/` | 获取测试用例列表 | 是 |
| POST | `/testcases/` | 创建测试用例 | 是 |
| GET | `/testcases/{id}` | 获取测试用例详情 | 是 |
| PUT | `/testcases/{id}` | 更新测试用例 | 是 |
| DELETE | `/testcases/{id}` | 删除测试用例 | 是 |
| POST | `/testcases/{id}/execute` | 执行测试用例 | 是 |

### 测试执行 (Execution)

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/execute/testcase` | 执行单个测试用例 | 是 |
| POST | `/execute/scenario` | 执行场景 | 是 |
| GET | `/execute/{task_id}/status` | 获取执行状态 | 是 |
| GET | `/execute/{task_id}/result` | 获取执行结果 | 是 |

### 场景编排 (Scenarios)

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/scenarios/` | 获取场景列表 | 是 |
| POST | `/scenarios/` | 创建场景 | 是 |
| GET | `/scenarios/{id}` | 获取场景详情 | 是 |
| PUT | `/scenarios/{id}` | 更新场景 | 是 |
| DELETE | `/scenarios/{id}` | 删除场景 | 是 |

### AI 功能 (AI)

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/ai/clarify` | AI 需求澄清 | 是 |
| POST | `/ai/generate` | AI 用例生成 | 是 |
| GET | `/ai/config` | 获取 AI 配置 | 是 |
| PUT | `/ai/config` | 更新 AI 配置 | 是 |

### 报告 (Reports)

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/reports/` | 获取报告列表 | 是 |
| GET | `/reports/{id}` | 获取报告详情 | 是 |
| GET | `/reports/{id}/export` | 导出报告 | 是 |

### 文件上传 (Upload)

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/upload/file` | 上传文件 | 是 |
| POST | `/upload/image` | 上传图片 | 是 |

---

## 详细 API 说明

### 认证模块

#### POST /auth/login

用户登录

**请求体**：
```json
{
  "username": "string",
  "password": "string"
}
```

**响应**：
```json
{
  "access_token": "string",
  "token_type": "bearer"
}
```

**错误响应**：
- `400`: 用户名或密码错误

#### GET /auth/me

获取当前登录用户信息

**请求头**：
```
Authorization: Bearer <token>
```

**响应**：
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "is_active": true,
  "is_superuser": true,
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

### 项目管理

#### GET /projects/

获取项目列表（支持分页和过滤）

**查询参数**：
- `skip` (int, 可选): 跳过记录数，默认 0
- `limit` (int, 可选): 返回记录数，默认 20
- `search` (str, 可选): 搜索关键词

**响应**：
```json
{
  "items": [
    {
      "id": 1,
      "name": "测试项目",
      "description": "项目描述",
      "base_url": "https://api.example.com",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

#### POST /projects/

创建新项目

**请求体**：
```json
{
  "name": "测试项目",
  "description": "项目描述",
  "base_url": "https://api.example.com"
}
```

**响应**：
```json
{
  "id": 1,
  "name": "测试项目",
  "description": "项目描述",
  "base_url": "https://api.example.com",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

**错误响应**：
- `400`: 请求参数错误
- `409`: 项目名称已存在

#### PUT /projects/{id}

更新项目信息

**路径参数**：
- `id` (int): 项目 ID

**请求体**：
```json
{
  "name": "新项目名称",
  "description": "新描述",
  "base_url": "https://api.new-example.com"
}
```

**响应**：同 POST /projects/

**错误响应**：
- `404`: 项目不存在
- `400`: 请求参数错误

#### DELETE /projects/{id}

删除项目

**路径参数**：
- `id` (int): 项目 ID

**响应**：
```json
{
  "message": "Project deleted successfully"
}
```

**错误响应**：
- `404`: 项目不存在

---

### 测试用例

#### GET /testcases/

获取测试用例列表

**查询参数**：
- `skip` (int, 可选): 跳过记录数
- `limit` (int, 可选): 返回记录数
- `project_id` (int, 可选): 按项目过滤

**响应**：
```json
{
  "items": [
    {
      "id": 1,
      "name": "用户登录测试",
      "description": "测试用户登录功能",
      "project_id": 1,
      "yaml_config": "name: Login Test\nsteps:\n  ...",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

#### POST /testcases/

创建测试用例

**请求体**：
```json
{
  "name": "用户登录测试",
  "description": "测试用户登录功能",
  "project_id": 1,
  "yaml_config": "name: Login Test\nsteps:\n  - name: Login\n    request:\n      url: /api/login\n      method: POST"
}
```

**响应**：
```json
{
  "id": 1,
  "name": "用户登录测试",
  "description": "测试用户登录功能",
  "project_id": 1,
  "yaml_config": "...",
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### POST /testcases/{id}/execute

执行测试用例

**路径参数**：
- `id` (int): 测试用例 ID

**请求体**（可选）：
```json
{
  "environment": "dev",
  "variables": {
    "username": "testuser",
    "password": "testpass"
  }
}
```

**响应**：
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "message": "Test execution started"
}
```

---

### 测试执行

#### GET /execute/{task_id}/status

获取执行状态

**路径参数**：
- `task_id` (str): 任务 ID

**响应**：
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "started_at": "2025-01-01T00:00:00Z",
  "completed_at": "2025-01-01T00:00:05Z"
}
```

**状态值**：
- `pending`: 等待执行
- `running`: 执行中
- `completed`: 已完成
- `failed`: 执行失败

#### GET /execute/{task_id}/result

获取执行结果

**路径参数**：
- `task_id` (str): 任务 ID

**响应**：
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "skipped": 0
  },
  "steps": [
    {
      "name": "用户登录",
      "status": "passed",
      "response_time": 123,
      "response": {
        "status_code": 200,
        "body": "{\"code\": 0, \"msg\": \"success\"}"
      }
    }
  ],
  "started_at": "2025-01-01T00:00:00Z",
  "completed_at": "2025-01-01T00:00:05Z"
}
```

---

### AI 功能

#### POST /ai/clarify

AI 需求澄清（多轮对话）

**请求体**：
```json
{
  "project_id": 1,
  "conversation_id": "uuid-v4",
  "user_message": "我需要测试用户登录接口",
  "history": []
}
```

**响应**：
```json
{
  "conversation_id": "uuid-v4",
  "ai_message": "好的，我需要了解一些信息：\n1. 登录接口的 URL 是什么？\n2. 需要测试哪些场景？",
  "clarified_requirements": [],
  "is_complete": false
}
```

#### POST /ai/generate

AI 生成测试用例

**请求体**：
```json
{
  "project_id": 1,
  "requirement": "测试用户登录功能，包括正常登录、密码错误、账号不存在等场景"
}
```

**响应**：
```json
{
  "test_cases": [
    {
      "name": "正常登录",
      "description": "使用正确的用户名和密码登录",
      "yaml_config": "name: 正常登录\nsteps:\n  - name: 登录\n    request:\n      url: /api/login\n      method: POST\n      json:\n        username: test\n        password: 123456\n    validate:\n      - eq: [status_code, 200]"
    }
  ]
}
```

#### GET /ai/config

获取 AI 配置

**响应**：
```json
{
  "default_model": "claude-3-5-sonnet-20241022",
  "temperature": 0.7,
  "max_tokens": 4096,
  "providers": [
    {
      "name": "anthropic",
      "enabled": true,
      "models": ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"]
    },
    {
      "name": "openai",
      "enabled": false,
      "models": ["gpt-4", "gpt-3.5-turbo"]
    }
  ]
}
```

---

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 422 | 请求体验证失败 |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "detail": "Error message here"
}
```

或（对于验证错误）：

```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "field is required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## 分页规范

所有列表接口都支持分页：

**查询参数**：
- `skip` (int): 跳过的记录数，默认 0
- `limit` (int): 每页记录数，默认 20，最大 100

**响应格式**：
```json
{
  "items": [],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

**计算总页数**：
```javascript
const totalPages = Math.ceil(total / limit)
```

---

## SDK 使用示例

### Python

```python
import requests

base_url = "http://localhost:8000/api/v1"

# 登录
response = requests.post(f"{base_url}/auth/login", json={
    "username": "admin",
    "password": "admin123"
})
token = response.json()["access_token"]

# 使用 Token
headers = {"Authorization": f"Bearer {token}"}

# 获取项目列表
response = requests.get(f"{base_url}/projects/", headers=headers)
projects = response.json()
```

### JavaScript

```javascript
const baseURL = 'http://localhost:8000/api/v1';

// 登录
const loginResponse = await fetch(`${baseURL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'admin123'
  })
});
const { access_token } = await loginResponse.json();

// 使用 Token
const headers = {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json'
};

// 获取项目列表
const projectsResponse = await fetch(`${baseURL}/projects/`, { headers });
const projects = await projectsResponse.json();
```

---

## 速率限制

- 默认：每分钟 100 次请求
- 超出限制返回 `429 Too Many Requests`

响应头：
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Webhook（待实现）

支持通过 Webhook 接收测试完成通知：

**配置 Webhook**：
```http
POST /api/v1/webhooks
{
  "url": "https://your-server.com/webhook",
  "events": ["test.completed", "test.failed"]
}
```

**Webhook Payload**：
```json
{
  "event": "test.completed",
  "test_case_id": 1,
  "task_id": "uuid",
  "status": "completed",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

---

## 相关文档

- [README.md](../README.md) - 项目主文档
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 开发指南
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排查

---

**最后更新**: 2026-02-11
