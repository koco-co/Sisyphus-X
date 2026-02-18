# Sisyphus-X 测试架构设计文档

> **版本**: v1.0
> **更新日期**: 2025-02-17
> **负责人**: 测试架构师

---

## 📋 目录

- [1. 概述](#1-概述)
- [2. 测试策略](#2-测试策略)
- [3. 白盒测试架构 (tests_white/)](#3-白盒测试架构-tests_white)
- [4. 黑盒测试架构 (tests_black/)](#4-黑盒测试架构-tests_black)
- [5. 测试组织原则](#5-测试组织原则)
- [6. Fixture 设计](#6-fixture-设计)
- [7. 覆盖率要求](#7-覆盖率要求)
- [8. CI/CD 集成](#8-cicd-集成)
- [9. 测试执行指南](#9-测试执行指南)

---

## 1. 概述

### 1.1 测试体系架构

```
Sisyphus-X/
├── tests_white/          # 白盒测试 (开发视角)
│   ├── unit/            # 单元测试
│   ├── integration/     # 集成测试
│   └── api/             # API 接口测试
│
├── tests_black/          # 黑盒测试 (用户视角)
│   ├── e2e/             # E2E 测试 (Playwright)
│   └── functional/      # 功能测试
│
├── backend/             # 后端代码
│   └── tests/           # 后端专用测试 (向后兼容)
│
└── frontend/            # 前端代码
    └── tests/           # 前端专用测试 (向后兼容)
```

### 1.2 测试分层原则

| 测试类型 | 位置 | 覆盖范围 | 执行频率 | 负责人 |
|---------|------|---------|---------|--------|
| **单元测试** | `tests_white/unit/` | 函数、类、组件 | 每次提交 | @whitebox-qa |
| **集成测试** | `tests_white/integration/` | 模块间交互 | 每次构建 | @whitebox-qa |
| **API 测试** | `tests_white/api/` | REST API 端点 | 每次构建 | @whitebox-qa |
| **E2E 测试** | `tests_black/e2e/` | 用户流程 | 每日/发布前 | @blackbox-qa |
| **功能测试** | `tests_black/functional/` | 业务功能 | 每日/发布前 | @blackbox-qa |

---

## 2. 测试策略

### 2.1 测试金字塔

```
        /\
       /  \        E2E Tests (10%)
      /____\       - 关键用户流程
     /      \      - 跨系统集成
    /        \     - Playwright
   /          \
  /____________\   API Tests (30%)
 /              \  - 接口契约验证
/   Unit Tests   \ - 集成测试
\________________/ - 业务逻辑测试
     60%+
```

### 2.2 测试覆盖率目标

| 类型 | 最低覆盖率 | 推荐覆盖率 |
|------|----------|----------|
| **单元测试** | 80% | 90%+ |
| **集成测试** | 70% | 85%+ |
| **API 测试** | 100% | 100% (所有端点) |
| **E2E 测试** | 关键路径 100% | 主要流程 80%+ |

### 2.3 测试技术栈

#### 白盒测试
- **后端**: Pytest + pytest-asyncio + pytest-cov
- **前端**: Vitest + @testing-library/react
- **Mock**: pytest-mock + unittest.mock
- **覆盖率**: pytest-cov + vitest coverage

#### 黑盒测试
- **E2E**: Playwright (TypeScript)
- **页面对象**: Page Object Model
- **测试数据**: Faker.js + 固定数据集
- **截图**: Playwright screenshot + 视觉回归

---

## 3. 白盒测试架构 (tests_white/)

### 3.1 目录结构

```
tests_white/
├── conftest.py                    # 全局 pytest 配置
├── pytest.ini                     # pytest 配置文件
├── .env.testing                   # 测试环境变量
├── README.md                      # 测试文档
│
├── unit/                          # 单元测试
│   ├── backend/
│   │   ├── models/                # 模型单元测试
│   │   │   ├── test_user.py
│   │   │   ├── test_project.py
│   │   │   ├── test_api_test_case.py
│   │   │   └── test_scenario.py
│   │   │
│   │   ├── services/              # 业务逻辑单元测试
│   │   │   ├── test_auth_service.py
│   │   │   ├── test_project_service.py
│   │   │   └── test_ai_service.py
│   │   │
│   │   ├── utils/                 # 工具函数单元测试
│   │   │   ├── test_crypto.py
│   │   │   ├── test_network.py
│   │   │   └── test_yaml_generator.py
│   │   │
│   │   └── core/                  # 核心功能单元测试
│   │       ├── test_security.py
│   │       ├── test_config.py
│   │       └── test_db.py
│   │
│   └── frontend/                  # 前端单元测试
│       ├── components/            # 组件测试
│       │   ├── common/
│       │   │   ├── EmptyState.test.tsx
│       │   │   └── ConfirmDialog.test.tsx
│       │   └── ui/
│       │       ├── Button.test.tsx
│       │       └── Input.test.tsx
│       │
│       ├── utils/                 # 工具函数测试
│       │   └── utils.test.ts
│       │
│       └── hooks/                 # 自定义 Hooks 测试
│           ├── useDebounce.test.ts
│           └── useEnvironment.test.ts
│
├── integration/                   # 集成测试
│   ├── backend/
│   │   ├── test_db_integration.py      # 数据库集成
│   │   ├── test_redis_integration.py   # Redis 集成
│   │   ├── test_storage_integration.py # MinIO 集成
│   │   └── test_engine_integration.py  # 引擎集成
│   │
│   └── frontend/
│       ├── test_api_integration.ts     # API 集成
│       └── test_query_integration.ts   # React Query 集成
│
├── api/                           # API 接口测试
│   ├── v1/
│   │   ├── auth/                      # 认证 API
│   │   │   ├── test_login.py
│   │   │   ├── test_register.py
│   │   │   └── test_oauth.py
│   │   │
│   │   ├── projects/                  # 项目管理 API
│   │   │   ├── test_crud.py
│   │   │   ├── test_environments.py
│   │   │   └── test_datasources.py
│   │   │
│   │   ├── interfaces/                # 接口管理 API
│   │   │   ├── test_crud.py
│   │   │   ├── test_folders.py
│   │   │   └── test_swagger_import.py
│   │   │
│   │   ├── api_test_cases/            # API 用例 API
│   │   │   ├── test_crud.py
│   │   │   ├── test_execution.py
│   │   │   └── test_yaml_generation.py
│   │   │
│   │   ├── scenarios/                 # 场景编排 API
│   │   │   ├── test_crud.py
│   │   │   ├── test_execution.py
│   │   │   └── test_datasets.py
│   │   │
│   │   ├── test_plans/                # 测试计划 API
│   │   │   └── test_crud.py
│   │   │
│   │   └── ai/                        # AI 助手 API
│   │       ├── test_clarification.py
│   │       └── test_generation.py
│   │
│   └── contracts/                # API 契约测试
│       ├── test_openapi_spec.py
│       └── test_response_schemas.py
│
├── fixtures/                      # 测试数据 Fixture
│   ├── backend/
│   │   ├── __init__.py
│   │   ├── db_fixtures.py           # 数据库 fixtures
│   │   ├── auth_fixtures.py         # 认证 fixtures
│   │   ├── project_fixtures.py      # 项目 fixtures
│   │   └── api_fixtures.py          # API fixtures
│   │
│   └── frontend/
│       ├── mock_data.ts             # Mock 数据
│       └── server_handlers.ts       # MSW handlers
│
├── utils/                         # 测试工具函数
│   ├── __init__.py
│   ├── assertions.py               # 自定义断言
│   ├── helpers.py                  # 辅助函数
│   ├── factories.py                # 测试数据工厂
│   └── mock_server.py              # Mock 服务器
│
└── reports/                       # 测试报告
    ├── coverage/                   # 覆盖率报告
    ├── junit/                      # JUnit XML 报告
    └── html/                       # HTML 报告
```

### 3.2 测试文件命名规范

#### 后端 (Python)
```
test_<module>.py              # 模块测试
test_<class>.py              # 类测试
test_<function>.py           # 函数测试
conftest.py                  # 配置文件
```

#### 前端 (TypeScript)
```
<name>.test.tsx              # 组件测试
<name>.test.ts               # 工具函数/Hooks 测试
<name>.spec.ts               # 规范测试
```

### 3.3 白盒测试示例

#### 单元测试示例 (test_user.py)

```python
import pytest
from app.models.user import User
from app.core.security import get_password_hash, verify_password

@pytest.mark.unit
class TestUserModel:
    """用户模型单元测试"""

    def test_create_user(self):
        """测试创建用户"""
        user = User(
            email="test@example.com",
            hashed_password=get_password_hash("test123"),
            is_active=True,
        )
        assert user.email == "test@example.com"
        assert user.is_active is True

    def test_verify_password(self):
        """测试密码验证"""
        hashed = get_password_hash("test123")
        assert verify_password("test123", hashed) is True
        assert verify_password("wrong", hashed) is False
```

#### API 测试示例 (test_projects.py)

```python
import pytest
from httpx import AsyncClient

@pytest.mark.api
@pytest.mark.asyncio
async def test_create_project(async_client: AsyncClient):
    """测试创建项目 API"""
    response = await async_client.post(
        "/api/v1/projects/",
        json={
            "name": "Test Project",
            "description": "Test Description"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Project"
    assert "id" in data

@pytest.mark.api
@pytest.mark.asyncio
async def test_list_projects(async_client: AsyncClient):
    """测试列出项目 API"""
    response = await async_client.get("/api/v1/projects/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
```

---

## 4. 黑盒测试架构 (tests_black/)

### 4.1 目录结构

```
tests_black/
├── README.md                      # 测试文档
├── playwright.config.ts           # Playwright 配置
├── .env.testing                   # 测试环境变量
│
├── e2e/                           # E2E 测试
│   ├── auth/                      # 认证流程
│   │   ├── registration.spec.ts
│   │   ├── login.spec.ts
│   │   └── oauth.spec.ts
│   │
│   ├── projects/                  # 项目管理流程
│   │   ├── project-management.spec.ts
│   │   └── environment-management.spec.ts
│   │
│   ├── interface-management/      # 接口管理流程
│   │   ├── create-interface.spec.ts
│   │   ├── edit-interface.spec.ts
│   │   ├── send-request.spec.ts
│   │   └── environment-switching.spec.ts
│   │
│   ├── api-automation/            # API 自动化流程
│   │   ├── test-case-crud.spec.ts
│   │   ├── visual-editor.spec.ts
│   │   ├── test-execution.spec.ts
│   │   └── batch-execution.spec.ts
│   │
│   ├── scenario-orchestration/    # 场景编排流程
│   │   ├── create-scenario.spec.ts
│   │   ├── drag-drop-nodes.spec.ts
│   │   ├── scenario-execution.spec.ts
│   │   └── dataset-management.spec.ts
│   │
│   ├── test-plans/                # 测试计划流程
│   │   ├── create-plan.spec.ts
│   │   ├── assign-cases.spec.ts
│   │   └── plan-execution.spec.ts
│   │
│   ├── functional-test/           # 功能测试流程
│   │   ├── requirement-clarification.spec.ts
│   │   ├── test-point-generation.spec.ts
│   │   └── test-case-generation.spec.ts
│   │
│   └── reports/                   # 测试报告流程
│       ├── view-report.spec.ts
│       └── export-report.spec.ts
│
├── functional/                    # 功能测试 (非浏览器)
│   ├── test_yaml_execution.py     # YAML 执行测试
│   ├── test_engine_integration.py # 引擎集成测试
│   └── test_scheduler.py          # 调度器测试
│
├── pages/                         # Page Object Model
│   ├── BasePage.ts                # 基础页面对象
│   ├── LoginPage.ts               # 登录页
│   ├── DashboardPage.ts           # 仪表板
│   ├── ProjectListPage.ts         # 项目列表
│   ├── InterfaceManagementPage.ts # 接口管理
│   ├── ApiAutomationPage.ts       # API 自动化
│   ├── ScenarioEditorPage.ts      # 场景编辑器
│   └── TestReportPage.ts          # 测试报告
│
├── fixtures/                      # 测试数据
│   ├── test-data.json             # 静态测试数据
│   ├── upload-files/              # 上传文件样本
│   │   ├── swagger.json
│   │   └── postman.json
│   └── screenshots/               # 预期截图 (视觉回归)
│
├── utils/                         # 测试工具
│   ├── helpers.ts                 # 辅助函数
│   ├── assertions.ts              # 自定义断言
│   ├── api-client.ts              # API 客户端
│   └── data-generator.ts          # 测试数据生成器
│
└── reports/                       # 测试报告
    ├── playwright-report/         # Playwright HTML 报告
    ├── screenshots/               # 失败截图
    └── videos/                    # 测试录像
```

### 4.2 E2E 测试组织原则

#### 按用户流程分组
```
e2e/
├── auth/                    # 认证相关 (登录、注册、OAuth)
├── projects/                # 项目管理完整流程
├── interface-management/    # 接口管理完整流程
├── api-automation/          # API 自动化完整流程
├── scenario-orchestration/  # 场景编排完整流程
└── test-plans/              # 测试计划完整流程
```

#### 测试用例命名规范
```typescript
// <feature>-<action>.spec.ts
login.spec.ts
project-creation.spec.ts
interface-debugging.spec.ts
test-case-execution.spec.ts
```

### 4.3 Page Object Model 示例

#### BasePage.ts

```typescript
import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly url: string;

  constructor(page: Page, url: string) {
    this.page = page;
    this.url = url;
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async screenshot(filename: string) {
    await this.page.screenshot({ path: `tests_black/reports/screenshots/${filename}` });
  }
}
```

#### InterfaceManagementPage.ts

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class InterfaceManagementPage extends BasePage {
  readonly createButton: Locator;
  readonly interfaceTree: Locator;
  readonly urlInput: Locator;
  readonly sendButton: Locator;
  readonly responseViewer: Locator;

  constructor(page: Page) {
    super(page, 'http://localhost:5173/interface-management');
    this.createButton = page.getByRole('button', { name: /新建|新建 HTTP/i });
    this.interfaceTree = page.locator('[data-testid="interface-tree"]');
    this.urlInput = page.locator('input[placeholder*="http"]');
    this.sendButton = page.getByRole('button', { name: /发送|Send/i });
    this.responseViewer = page.locator('[data-testid="response-viewer"]');
  }

  async createNewInterface() {
    await this.createButton.click();
  }

  async fillUrl(url: string) {
    await this.urlInput.fill(url);
  }

  async sendRequest() {
    await this.sendButton.click();
    await this.responseViewer.waitFor({ state: 'visible' });
  }

  async getResponseBody() {
    return await this.responseViewer.textContent();
  }
}
```

### 4.4 E2E 测试示例

```typescript
import { test, expect } from '@playwright/test';
import { InterfaceManagementPage } from '../pages/InterfaceManagementPage';

test.describe('接口管理 E2E 测试', () => {
  let page: InterfaceManagementPage;

  test.beforeEach(async ({ page: p }) => {
    page = new InterfaceManagementPage(p);
    await page.goto();
  });

  test('应该成功创建并发送 HTTP 请求', async ({ page }) => {
    // 1. 创建新接口
    await page.createNewInterface();

    // 2. 填写请求信息
    await page.fillUrl('https://api.example.com/users');

    // 3. 发送请求
    await page.sendRequest();

    // 4. 验证响应
    const response = await page.getResponseBody();
    expect(response).toContain('data');

    // 5. 截图保存
    await page.screenshot('http-request-success.png');
  });

  test('应该正确切换环境', async ({ page }) => {
    // 切换到测试环境
    await page.selectEnvironment('Test');
    await expect(page.urlInput).toHaveValue('https://api-test.example.com');

    // 切换到生产环境
    await page.selectEnvironment('Production');
    await expect(page.urlInput).toHaveValue('https://api.example.com');
  });
});
```

---

## 5. 测试组织原则

### 5.1 按模块组织

测试目录结构应与代码结构保持一致:

```
backend/app/
├── models/              -> tests_white/unit/backend/models/
├── services/            -> tests_white/unit/backend/services/
├── api/v1/endpoints/    -> tests_white/api/v1/
└── core/                -> tests_white/unit/backend/core/

frontend/src/
├── components/          -> tests_white/unit/frontend/components/
├── pages/               -> tests_black/e2e/<feature>/
├── api/                 -> tests_white/integration/frontend/
└── utils/               -> tests_white/unit/frontend/utils/
```

### 5.2 测试用例分组

使用 Pytest markers 和 Playwright test.describe:

#### 后端 (Pytest)

```python
# markers 定义
@pytest.mark.unit           # 单元测试
@pytest.mark.integration    # 集成测试
@pytest.mark.api            # API 测试
@pytest.mark.slow           # 慢速测试
@pytest.mark.auth           # 认证相关
@pytest.mark.ai             # AI 相关

# 运行特定组
pytest -m unit              # 只运行单元测试
pytest -m "not slow"        # 排除慢速测试
```

#### 前端 (Playwright)

```typescript
test.describe('项目管理', () => {
  test.beforeAll(async () => {
    // 所有测试前的准备
  });

  test('创建项目', async ({ page }) => {
    // 测试代码
  });

  test('删除项目', async ({ page }) => {
    // 测试代码
  });
});
```

### 5.3 测试数据隔离

每个测试用例应该:
1. **创建自己的数据** - 使用 fixture 或工厂函数
2. **不依赖其他测试** - 独立运行
3. **清理自己的数据** - 使用回滚或 teardown

```python
@pytest.fixture
async def test_project(db_session):
    """创建独立的测试项目"""
    project = Project(name="Test")
    db_session.add(project)
    await db_session.commit()
    yield project
    # 自动回滚
```

---

## 6. Fixture 设计

### 6.1 后端 Fixture 层级

```
conftest.py (全局)
├── db_session (数据库会话)
├── async_client (HTTP 客户端)
└── sample_user (测试用户)

fixtures/backend/
├── db_fixtures.py       # 数据库相关
│   ├── test_project
│   ├── test_environment
│   └── test_api_case
│
├── auth_fixtures.py     # 认证相关
│   ├── authenticated_client
│   └── test_user_with_roles
│
└── api_fixtures.py      # API 相关
    ├── mock_ai_response
    └── mock_engine_execution
```

### 6.2 前端 Fixture 层级

```
fixtures/frontend/
├── mock_data.ts         # Mock 数据
│   ├── mockProjects
│   ├── mockInterfaces
│   └── mockTestCases
│
└── server_handlers.ts   # MSW Handlers
    ├── projectHandlers
    └── authHandlers
```

### 6.3 Fixture 使用示例

#### 后端

```python
# conftest.py
@pytest.fixture
async def test_project_with_env(db_session):
    """创建带环境的测试项目"""
    project = Project(name="Test Project")
    db_session.add(project)
    await db_session.commit()

    env = Environment(
        project_id=project.id,
        name="Dev",
        base_url="http://localhost:8000"
    )
    db_session.add(env)
    await db_session.commit()

    return {
        "project": project,
        "environment": env
    }

# test_file.py
async def test_api_with_env(async_client, test_project_with_env):
    """测试需要环境的 API"""
    project = test_project_with_env["project"]
    env = test_project_with_env["environment"]

    response = await async_client.get(
        f"/api/v1/projects/{project.id}/environments/{env.id}"
    )
    assert response.status_code == 200
```

#### 前端

```typescript
// fixtures/mock_data.ts
export const mockProjects = [
  { id: 1, name: 'Test Project 1' },
  { id: 2, name: 'Test Project 2' },
];

// test file
import { mockProjects } from '@/fixtures/mock_data';

test('should display projects', async ({ page }) => {
  await page.route('**/api/v1/projects', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify(mockProjects),
    });
  });

  await page.goto('/projects');
  await expect(page.locator('text=Test Project 1')).toBeVisible();
});
```

---

## 7. 覆盖率要求

### 7.1 总体目标

| 模块 | 单元测试 | 集成测试 | API 测试 | E2E 测试 |
|------|---------|---------|---------|---------|
| **认证模块** | 90% | 80% | 100% | 100% (关键路径) |
| **项目管理** | 85% | 75% | 100% | 80% (主要流程) |
| **接口管理** | 80% | 70% | 100% | 100% (核心功能) |
| **API 自动化** | 85% | 80% | 100% | 80% (主要流程) |
| **场景编排** | 80% | 75% | 100% | 70% (复杂流程) |
| **测试计划** | 85% | 75% | 100% | 60% (次要功能) |
| **AI 模块** | 70% | 60% | 80% | 50% (辅助功能) |

### 7.2 覆盖率工具配置

#### 后端 (pytest-cov)

```ini
# pytest.ini
[tool:pytest]
addopts =
    --cov=app
    --cov-report=html:tests_white/reports/coverage/html
    --cov-report=xml:tests_white/reports/coverage/coverage.xml
    --cov-report=term-missing
    --cov-fail-under=80
```

#### 前端 (Vitest)

```typescript
// vite.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
  },
});
```

### 7.3 覆盖率报告

生成覆盖率报告:

```bash
# 后端
cd tests_white
pytest --cov=app --cov-report=html
open reports/coverage/html/index.html

# 前端
cd frontend
npm run test:coverage
open coverage/index.html
```

---

## 8. CI/CD 集成

### 8.1 CI 测试流程

```
┌─────────────────┐
│   Git Push      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  触发 CI Pipeline │
└────────┬────────┘
         │
         ├──► 单元测试 (5-10 分钟)
         │   ├─ 后端单元测试
         │   └─ 前端单元测试
         │
         ├──► 集成测试 (10-15 分钟)
         │   ├─ 数据库集成
         │   ├─ API 集成
         │   └─ 引擎集成
         │
         ├──► API 测试 (5-10 分钟)
         │   └─ 所有端点契约测试
         │
         └──► 覆盖率检查 (自动)
             ├─ 验证 80%+ 目标
             └─ 生成覆盖率报告
```

### 8.2 GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # 白盒测试
  whitebox-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: sisyphus_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'

      - name: Install UV
        run: pip install uv

      - name: Install Dependencies
        run: |
          cd backend
          uv sync --dev

      - name: Run Unit Tests
        run: |
          cd tests_white
          pytest -m unit --cov=app --cov-report=xml

      - name: Run Integration Tests
        run: |
          cd tests_white
          pytest -m integration --cov=app --cov-append

      - name: Run API Tests
        run: |
          cd tests_white
          pytest -m api --cov=app --cov-append

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: tests_white/reports/coverage/coverage.xml

  # 黑盒测试 (每晚运行)
  e2e-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule' || contains(github.event.head_commit.message, '[e2e]')

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install Dependencies
        run: |
          cd frontend
          npm ci
          npx playwright install --with-deps

      - name: Start Services
        run: docker-compose up -d

      - name: Run E2E Tests
        run: |
          cd tests_black
          playwright test

      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: tests_black/reports/playwright-report/
```

### 8.3 测试结果通知

```yaml
# 在 PR 中评论测试结果
- name: Comment PR
  uses: actions/github-script@v6
  with:
    script: |
      const coverage = '${{ steps.coverage.outputs.coverage }}';
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        body: `## 测试结果\n\n- 覆盖率: ${coverage}\n- 状态: ${{ job.status }}`
      });
```

---

## 9. 测试执行指南

### 9.1 本地运行测试

#### 后端白盒测试

```bash
# 进入测试目录
cd tests_white

# 运行所有测试
pytest

# 运行单元测试
pytest -m unit

# 运行集成测试
pytest -m integration

# 运行 API 测试
pytest -m api

# 运行特定文件
pytest unit/backend/models/test_user.py

# 运行特定测试函数
pytest unit/backend/models/test_user.py::test_create_user

# 带覆盖率报告
pytest --cov=app --cov-report=html

# 排除慢速测试
pytest -m "not slow"
```

#### 前端白盒测试

```bash
# 进入前端目录
cd frontend

# 运行所有测试
npm run test

# 运行特定文件
npm run test utils.test.ts

# 监听模式
npm run test:watch

# UI 模式
npm run test:ui

# 覆盖率报告
npm run test:coverage
```

#### 黑盒 E2E 测试

```bash
# 进入 E2E 测试目录
cd tests_black

# 运行所有 E2E 测试
playwright test

# 运行特定文件
playwright test e2e/auth/login.spec.ts

# 运行特定测试
playwright test -g "应该成功登录"

# 有头模式 (显示浏览器)
playwright test --headed

# UI 模式 (交互式调试)
playwright test --ui

# 调试模式
playwright test --debug

# 查看报告
playwright show-report
```

### 9.2 调试测试

#### 后端调试

```bash
# 使用 pdb 调试
pytest --pdb

# 使用 ipdb 调试 (需要安装 ipdb)
pytest --pdbcls=IPython.terminal.debugger:Pdb --pdb

# 只运行失败的测试
pytest --lf

# 遇到第一个失败就停止
pytest -x

# 详细输出
pytest -vv

# 打印 print 语句
pytest -s
```

#### 前端调试

```bash
# Vitest UI 模式
npm run test:ui

# 在浏览器中调试
npm run test:debug
```

#### E2E 调试

```bash
# Playwright Inspector
playwright test --debug

# 有头模式
playwright test --headed

# 慢动作模式
playwright test --headed --slow-mo=1000

# 录制测试
playwright codegen http://localhost:5173
```

### 9.3 测试最佳实践

#### 1. 测试隔离
- 每个测试独立运行
- 不依赖测试执行顺序
- 使用 fixture 准备和清理数据

#### 2. 测试命名
- 使用描述性名称
- 格式: `test_<被测功能>_<预期行为>`

```python
# GOOD
def test_create_project_with_valid_data_should_succeed():
    pass

# BAD
def test_project():
    pass
```

#### 3. AAA 模式
- **Arrange** (准备): 准备测试数据
- **Act** (执行): 执行被测代码
- **Assert** (断言): 验证结果

```python
def test_update_project():
    # Arrange
    project = create_test_project()
    update_data = {"name": "Updated Name"}

    # Act
    result = update_project(project.id, update_data)

    # Assert
    assert result.name == "Updated Name"
```

#### 4. Mock 外部依赖
- Mock API 调用
- Mock 数据库操作
- Mock 文件系统

```python
from unittest.mock import patch

@patch('app.services.ai.call_anthropic_api')
def test_ai_service(mock_api):
    mock_api.return_value = {"content": "Test response"}
    result = ai_service.generate_test_case("requirement")
    assert result == {"content": "Test response"}
```

#### 5. 参数化测试

```python
@pytest.mark.parametrize("method,expected", [
    ("GET", 200),
    ("POST", 201),
    ("DELETE", 204),
])
async def test_http_methods(async_client, method, expected):
    response = await async_client.request(method, "/api/v1/projects/")
    assert response.status_code == expected
```

---

## 10. 迁移指南

### 10.1 从 backend/tests/ 迁移到 tests_white/

```bash
# 1. 复制现有测试
mkdir -p tests_white/unit/backend/models
mkdir -p tests_white/api/v1
cp backend/tests/models/*.py tests_white/unit/backend/models/
cp backend/tests/api/*.py tests_white/api/v1/

# 2. 更新导入路径
find tests_white/ -name "*.py" -exec sed -i '' 's/from app/from backend.app/g' {} \;

# 3. 更新 pytest 配置
cp pytest.ini tests_white/

# 4. 验证测试
cd tests_white
pytest --collect-only  # 检查是否所有测试都能发现
```

### 10.2 从 frontend/tests/ 迁移到 tests_black/

```bash
# 1. 移动 E2E 测试
mkdir -p tests_black/e2e
mv frontend/tests/e2e/*.spec.ts tests_black/e2e/

# 2. 移动 fixtures
mkdir -p tests_black/pages
mv frontend/tests/e2e/fixtures/*.ts tests_black/

# 3. 更新 Playwright 配置
cp playwright.config.ts tests_black/

# 4. 验证测试
cd tests_black
playwright test --collect  # 检查是否所有测试都能发现
```

---

## 11. 附录

### 11.1 常用命令速查

```bash
# 后端
cd tests_white && pytest                           # 运行所有测试
cd tests_white && pytest -m unit                   # 单元测试
cd tests_white && pytest --cov                     # 覆盖率报告

# 前端
cd frontend && npm run test                        # 单元测试
cd frontend && npm run test:coverage               # 覆盖率报告

# E2E
cd tests_black && playwright test                  # 运行 E2E
cd tests_black && playwright test --ui             # UI 模式
cd tests_black && playwright show-report           # 查看报告
```

### 11.2 参考资料

- [Pytest 文档](https://docs.pytest.org/)
- [Playwright 文档](https://playwright.dev/)
- [Vitest 文档](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)

---

**文档维护**: 本文档由测试架构师维护,如有更新请及时同步。
