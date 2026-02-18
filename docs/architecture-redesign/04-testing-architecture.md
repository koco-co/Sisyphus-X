# 测试架构设计方案

> **生成时间**: 2025-02-17
> **设计专家**: 测试架构师
> **测试策略**: 分层测试 + 80%覆盖率目标

---

## 📐 测试原则

### 测试金字塔

```
        /\
       /  \      E2E Tests (10%)
      /____\     - 关键用户流程
     /      \    - Playwright
    /        \   
   /          \  Integration Tests (30%)
  /____________\ - API测试
 /              \- 数据库集成
/                \
--------------------
Unit Tests (60%)
- 单元函数测试
- 组件测试
- Mock依赖
```

### 测试分层原则

| 测试类型 | 位置 | 比例 | 执行速度 | 维护成本 |
|---------|------|------|---------|---------|
| **单元测试** | tests_white/unit/ | 60% | ⚡⚡⚡ 快 | 💰 低 |
| **集成测试** | tests_white/integration/ | 30% | ⚡⚡ 中 | 💰💰 中 |
| **API测试** | tests_white/api/ | 部分 | ⚡⚡ 中 | 💰💰 中 |
| **E2E测试** | tests_black/e2e/ | 10% | ⚡ 慢 | 💰💰💰 高 |

---

## 🗂️ 新目录结构

### tests_white/ (白盒测试)

```
tests_white/
├── unit/                       # 单元测试
│   ├── backend/
│   │   ├── domain/             # 领域层测试
│   │   │   ├── entities/
│   │   │   │   ├── test_project.py
│   │   │   │   ├── test_test_case.py
│   │   │   │   └── test_scenario.py
│   │   │   └── value_objects/
│   │   │       ├── test_email.py
│   │   │       └── test_http_method.py
│   │   ├── use_cases/          # 用例层测试
│   │   │   ├── test_create_project.py
│   │   │   ├── test_execute_test_case.py
│   │   │   └── test_generate_test_cases.py
│   │   └── services/           # 服务层测试
│   │       ├── test_yaml_parser.py
│   │       └── test_validators.py
│   │
│   └── frontend/
│       ├── entities/           # 实体层测试
│       │   ├── project/
│       │   ├── test-case/
│       │   └── user/
│       ├── features/           # 功能层测试
│       │   ├── auth/
│       │   ├── project-create/
│       │   └── test-execute/
│       └── shared/             # 共享层测试
│           ├── lib/
│           └── ui/
│
├── integration/                # 集成测试
│   ├── backend/
│   │   ├── test_database_integration.py
│   │   ├── test_repository_integration.py
│   │   └── test_ai_gateway_integration.py
│   │
│   └── frontend/
│       ├── test_api_integration.tsx
│       └── test_react_query_integration.tsx
│
├── api/                        # API接口测试
│   ├── test_auth_api.py
│   ├── test_projects_api.py
│   ├── test_test_cases_api.py
│   ├── test_scenarios_api.py
│   └── test_ai_api.py
│
├── fixtures/                   # pytest fixtures
│   ├── database.py             # 数据库fixture
│   ├── auth.py                 # 认证fixture
│   ├── projects.py             # 项目fixture
│   └── test_data.py            # 测试数据
│
├── conftest.py                 # pytest配置
├── pytest.ini                  # pytest设置
└── .pytest_cache/              # pytest缓存
```

### tests_black/ (黑盒测试)

```
tests_black/
├── e2e/                        # E2E测试 (Playwright)
│   ├── auth/
│   │   ├── login.spec.ts
│   │   └── register.spec.ts
│   ├── projects/
│   │   ├── create-project.spec.ts
│   │   ├── list-projects.spec.ts
│   │   └── delete-project.spec.ts
│   ├── api-automation/
│   │   ├── create-test-case.spec.ts
│   │   ├── execute-test.spec.ts
│   │   └── view-results.spec.ts
│   ├── scenario/
│   │   ├── create-scenario.spec.ts
│   │   ├── execute-scenario.spec.ts
│   │   └── view-report.spec.ts
│   └── ai-assistant/
│       ├── chat.spec.ts
│       └── generate-test-cases.spec.ts
│
├── functional/                 # 功能测试
│   ├── test_project_management.py
│   ├── test_test_case_management.py
│   ├── test_scenario_execution.py
│   └── test_ai_features.py
│
├── test-data/                  # 测试数据
│   ├── users.json
│   ├── projects.json
│   ├── test-cases.json
│   └── scenarios.json
│
├── pages/                      # Page Objects (Playwright)
│   ├── BasePage.ts
│   ├── LoginPage.ts
│   ├── ProjectListPage.ts
│   ├── TestCaseEditorPage.ts
│   └── ScenarioEditorPage.ts
│
├── helpers/                    # 测试辅助函数
│   ├── auth-helpers.ts
│   ├── data-helpers.ts
│   └── api-helpers.ts
│
├── playwright.config.ts        # Playwright配置
└── tests/                      # Playwright测试
```

---

## 🔬 单元测试设计

### 后端单元测试示例

```python
# tests_white/unit/backend/domain/entities/test_project.py
import pytest
from datetime import datetime
from domain.entities.project import Project
from domain.value_objects.execution_status import ProjectStatus

def test_project_add_environment_success():
    """测试: 成功添加环境"""
    project = Project(
        id=None,
        name="测试项目",
        description="",
        status=ProjectStatus.ACTIVE,
        created_at=datetime.now(),
        updated_at=datetime.now(),
        environments=[]
    )

    # Act
    env = project.add_environment("生产环境", "https://api.example.com")

    # Assert
    assert env.name == "生产环境"
    assert env.base_url == "https://api.example.com"
    assert len(project.environments) == 1

def test_project_add_environment_exceeds_limit():
    """测试: 超过环境数量限制"""
    project = Project(
        id=None,
        name="测试项目",
        description="",
        status=ProjectStatus.ACTIVE,
        created_at=datetime.now(),
        updated_at=datetime.now(),
        environments=[]
    )

    # 添加10个环境
    for i in range(10):
        project.add_environment(f"环境{i}", "https://api.example.com")

    # Act & Assert
    with pytest.raises(ValueError, match="最多支持 10 个环境"):
        project.add_environment("第11个环境", "https://api.example.com")
```

### 前端单元测试示例

```typescript
// tests_white/unit/frontend/entities/project/lib/validators.test.ts
import { describe, it, expect } from 'vitest'
import { validateProjectName } from './validators'

describe('validateProjectName', () => {
  it('should accept valid project names', () => {
    expect(validateProjectName('测试项目')).toBe(true)
    expect(validateProjectName('Project ABC')).toBe(true)
    expect(validateProjectName('123')).toBe(true)
  })

  it('should reject empty names', () => {
    expect(validateProjectName('')).toBe(false)
    expect(validateProjectName('   ')).toBe(false)
  })

  it('should reject names exceeding max length', () => {
    const longName = 'A'.repeat(101)
    expect(validateProjectName(longName)).toBe(false)
  })
})
```

---

## 🔗 集成测试设计

### 数据库集成测试

```python
# tests_white/integration/backend/test_database_integration.py
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from infrastructure.database.connection import get_session
from adapters.repositories.postgres_project_repository import PostgresProjectRepository

@pytest.fixture
async def test_session():
    """测试数据库会话"""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # 创建表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        yield session

@pytest.mark.asyncio
async def test_repository_save_and_retrieve(test_session):
    """测试: 仓储保存和查询"""
    repo = PostgresProjectRepository(test_session)

    # Arrange
    project = Project(
        id=None,
        name="测试项目",
        description="",
        status=ProjectStatus.ACTIVE,
        created_at=datetime.now(),
        updated_at=datetime.now(),
        environments=[]
    )

    # Act
    saved = await repo.save(project)
    found = await repo.find_by_id(saved.id)

    # Assert
    assert found is not None
    assert found.name == "测试项目"
```

---

## 🌐 API测试设计

### REST API测试

```python
# tests_white/api/test_projects_api.py
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_create_project_success():
    """测试: 成功创建项目"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/projects",
            json={
                "name": "测试项目",
                "description": "项目描述"
            },
            headers={"Authorization": "Bearer test-token"}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "测试项目"
    assert "id" in data

@pytest.mark.asyncio
async def test_create_project_duplicate_name():
    """测试: 项目名称重复"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 第一次创建
        await client.post(
            "/api/v1/projects",
            json={"name": "重复项目", "description": ""}
        )

        # 第二次创建相同名称
        response = await client.post(
            "/api/v1/projects",
            json={"name": "重复项目", "description": ""}
        )

    assert response.status_code == 400
    assert "已存在" in response.json()["detail"]
```

---

## 🎭 E2E测试设计

### Playwright E2E测试

```typescript
// tests_black/e2e/projects/create-project.spec.ts
import { test, expect } from '@playwright/test'

test.describe('创建项目', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('应该成功创建项目', async ({ page }) => {
    // 导航到项目列表
    await page.goto('/projects')
    
    // 点击创建按钮
    await page.click('button:has-text("创建项目")')
    
    // 填写表单
    await page.fill('[name="name"]', 'E2E测试项目')
    await page.fill('[name="description"]', '这是一个E2E测试创建的项目')
    
    // 提交
    await page.click('button:has-text("创建")')
    
    // 验证
    await expect(page.locator('text=项目创建成功')).toBeVisible()
    await expect(page.locator('text=E2E测试项目')).toBeVisible()
  })

  test('应该验证项目名称', async ({ page }) => {
    await page.goto('/projects')
    await page.click('button:has-text("创建项目")')
    
    // 不填写名称直接提交
    await page.click('button:has-text("创建")')
    
    // 验证错误提示
    await expect(page.locator('text=项目名称不能为空')).toBeVisible()
  })
})
```

---

## 📊 测试覆盖率要求

### 覆盖率目标

| 模块 | 目标覆盖率 | 说明 |
|------|-----------|------|
| **domain/** | 95%+ | 核心业务逻辑,最高覆盖率 |
| **use_cases/** | 90%+ | 业务流程,高覆盖率 |
| **adapters/repositories/** | 85%+ | 数据访问,高覆盖率 |
| **adapters/controllers/** | 70%+ | API层,中等覆盖率 |
| **entities/** (前端) | 85%+ | 业务实体,高覆盖率 |
| **features/** (前端) | 70%+ | 功能组件,中等覆盖率 |
| **shared/** | 60%+ | 工具函数,基础覆盖率 |

### 覆盖率检查

```bash
# 后端覆盖率
pytest tests_white/ --cov=backend/app --cov-report=html --cov-report=term

# 前端覆盖率
npm run test:coverage

# CI集成
pytest tests_white/ --cov=backend/app --cov-fail-under=80
```

---

## ⚙️ 测试配置

### pytest配置

```ini
# pytest.ini
[pytest]
testpaths = tests_white
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --strict-markers
    --cov=backend/app
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=80
markers =
    unit: Unit tests
    integration: Integration tests
    api: API tests
    slow: Slow running tests
```

### Playwright配置

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests_black/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
})
```

---

## ✅ 收益

| 方面 | 改进 |
|------|------|
| **质量保障** | 多层次测试,覆盖全面 |
| **快速反馈** | 单元测试秒级反馈 |
| **回归预防** | E2E测试覆盖关键流程 |
| **重构信心** | 高覆盖率提供重构保障 |

---

**状态**: ✅ 测试架构设计完成,等待评审...
