# 测试快速入门指南

> **目标**: 帮助开发者快速上手 Sisyphus-X 测试体系

## 目录

- [1. 测试架构概览](#1-测试架构概览)
- [2. 环境准备](#2-环境准备)
- [3. 白盒测试快速开始](#3-白盒测试快速开始)
- [4. 黑盒测试快速开始](#4-黑盒测试快速开始)
- [5. 常见问题](#5-常见问题)

---

## 1. 测试架构概览

### 测试分层

```
┌─────────────────────────────────┐
│   E2E Tests (10%)               │  黑盒测试
│   - 用户完整流程                 │  tests_black/e2e/
│   - Playwright                  │
├─────────────────────────────────┤
│   API Tests (30%)               │  白盒测试
│   - 接口契约验证                 │  tests_white/api/
│   - Pytest                      │
├─────────────────────────────────┤
│   Unit Tests (60%)              │  白盒测试
│   - 函数、类、组件               │  tests_white/unit/
│   - Pytest + Vitest             │
└─────────────────────────────────┘
```

### 目录结构

```
Sisyphus-X/
├── tests_white/          # 白盒测试
│   ├── unit/            # 单元测试
│   ├── integration/     # 集成测试
│   └── api/             # API 测试
│
└── tests_black/         # 黑盒测试
    ├── e2e/            # E2E 测试
    └── functional/     # 功能测试
```

---

## 2. 环境准备

### 2.1 安装依赖

#### 后端测试依赖

```bash
cd backend
uv sync --dev  # 包含 pytest, pytest-asyncio, pytest-cov
```

#### 前端测试依赖

```bash
cd frontend
npm install  # 包含 vitest, @testing-library/react
```

#### E2E 测试依赖

```bash
cd tests_black
npm install
npm run install:browsers  # 安装 Playwright 浏览器
```

### 2.2 配置环境变量

创建 `.env.testing` 文件:

```bash
# 复制模板
cp .env.example .env.testing

# 编辑配置
# - 设置测试数据库 URL
# - 禁用认证 (开发模式)
# - 配置测试端口
```

### 2.3 启动测试服务

```bash
# 启动基础设施服务 (PostgreSQL, Redis)
docker compose up -d

# 启动后端服务
cd backend
uv run uvicorn app.main:app --reload --port 8000

# 启动前端服务 (新终端)
cd frontend
npm run dev
```

---

## 3. 白盒测试快速开始

### 3.1 运行现有测试

```bash
# 进入测试目录
cd tests_white

# 运行所有测试
pytest

# 查看测试状态
pytest --collect-only

# 运行特定类型的测试
pytest -m unit          # 只运行单元测试
pytest -m integration   # 只运行集成测试
pytest -m api           # 只运行 API 测试
```

### 3.2 编写单元测试

#### 后端单元测试示例

创建文件 `tests_white/unit/backend/services/test_user_service.py`:

```python
import pytest
from app.services.user import UserService

@pytest.mark.unit
class TestUserService:
    """用户服务单元测试"""

    def test_create_user_with_valid_data(self, db_session):
        """测试创建用户"""
        service = UserService(db_session)

        user = service.create_user(
            email="test@example.com",
            password="test123"
        )

        assert user.email == "test@example.com"
        assert user.id is not None

    def test_create_duplicate_user_should_fail(self, db_session):
        """测试创建重复用户应该失败"""
        service = UserService(db_session)

        # 创建第一个用户
        service.create_user(email="test@example.com", password="test123")

        # 尝试创建重复用户
        with pytest.raises(ValueError):
            service.create_user(
                email="test@example.com",
                password="test456"
            )
```

运行测试:

```bash
pytest tests_white/unit/backend/services/test_user_service.py -v
```

#### 前端单元测试示例

创建文件 `frontend/src/components/common/EmptyState.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState 组件', () => {
  it('应该渲染标题和描述', () => {
    render(
      <EmptyState
        title="无数据"
        description="暂无数据可显示"
      />
    );

    expect(screen.getByText('无数据')).toBeInTheDocument();
    expect(screen.getByText('暂无数据可显示')).toBeInTheDocument();
  });

  it('应该渲染自定义图标', () => {
    const { container } = render(
      <EmptyState
        title="测试"
        icon={<span data-testid="custom-icon">Icon</span>}
      />
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});
```

运行测试:

```bash
cd frontend
npm test EmptyState
```

### 3.3 编写 API 测试

创建文件 `tests_white/api/v1/projects/test_crud.py`:

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

运行测试:

```bash
pytest tests_white/api/v1/projects/test_crud.py -v
```

### 3.4 使用 Fixture

```python
import pytest

# 使用内置 fixture
async def test_with_fixtures(
    db_session,           # 数据库会话
    async_client,         # HTTP 客户端
    sample_user,          # 示例用户
    sample_project        # 示例项目
):
    # 测试代码
    pass

# 自定义 fixture
@pytest.fixture
async def custom_data(db_session):
    """准备测试数据"""
    project = Project(name="Test")
    db_session.add(project)
    await db_session.commit()
    return project
```

---

## 4. 黑盒测试快速开始

### 4.1 运行现有 E2E 测试

```bash
# 进入测试目录
cd tests_black

# 运行所有测试
npm test

# 有头模式 (显示浏览器)
npm run test:headed

# UI 模式 (交互式)
npm run test:ui

# 调试模式
npm run test:debug
```

### 4.2 编写 E2E 测试

创建文件 `tests_black/e2e/projects/project-management.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('项目管理 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到项目页面
    await page.goto('http://localhost:5173/projects');
    await page.waitForLoadState('domcontentloaded');
  });

  test('应该显示项目列表', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/项目管理/);

    // 验证项目列表可见
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();
  });

  test('应该能够创建新项目', async ({ page }) => {
    // 点击创建按钮
    await page.click('button:has-text("创建")');

    // 填写表单
    await page.fill('input[name="name"]', 'Test Project');
    await page.fill('textarea[name="description"]', 'Test Description');

    // 提交表单
    await page.click('button:has-text("保存")');

    // 验证成功消息
    await expect(page.locator('text=/创建成功/i')).toBeVisible();

    // 验证新项目出现在列表中
    await expect(page.locator('text=Test Project')).toBeVisible();
  });

  test('应该能够删除项目', async ({ page }) => {
    // 点击项目操作菜单
    await page.click('[data-testid="project-item"] button:has-text("更多")');

    // 点击删除按钮
    await page.click('text=删除');

    // 确认删除
    await page.click('button:has-text("确认")');

    // 验证删除成功
    await expect(page.locator('text=/删除成功/i')).toBeVisible();
  });
});
```

运行测试:

```bash
cd tests_black
npm run test:projects
```

### 4.3 使用 Page Object Model

创建页面对象 `tests_black/pages/ProjectListPage.ts`:

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProjectListPage extends BasePage {
  readonly createButton: Locator;
  readonly projectList: Locator;
  readonly projectName: Locator;

  constructor(page: Page) {
    super(page, 'http://localhost:5173/projects', '项目管理');
    this.createButton = page.getByRole('button', { name: /创建/i });
    this.projectList = page.locator('[data-testid="project-list"]');
    this.projectName = page.locator('[data-testid="project-name"]');
  }

  async createProject(name: string, description: string): Promise<void> {
    await this.createButton.click();
    await this.page.fill('input[name="name"]', name);
    await this.page.fill('textarea[name="description"]', description);
    await this.page.click('button:has-text("保存")');
    await this.waitForLoad();
  }

  async getProjectCount(): Promise<number> {
    return await this.projectList.count();
  }

  async verifyProjectExists(name: string): Promise<void> {
    await expect(this.projectList.filter({ hasText: name })).toBeVisible();
  }
}
```

使用页面对象:

```typescript
import { test } from '@playwright/test';
import { ProjectListPage } from '../../pages/ProjectListPage';

test('创建项目 E2E 测试', async ({ page }) => {
  const projectPage = new ProjectListPage(page);
  await projectPage.goto();

  // 创建项目
  await projectPage.createProject('Test Project', 'Description');

  // 验证
  await projectPage.verifyProjectExists('Test Project');
});
```

### 4.4 调试 E2E 测试

```bash
# 调试模式 (带 Playwright Inspector)
npm run test:debug

# 有头模式 + 慢动作
playwright test --headed --slow-mo=1000

# 只运行特定测试
playwright test -g "应该能够创建新项目"

# 截图和视频
playwright test --creenshot=only-on-failure --video=retain-on-failure
```

---

## 5. 常见问题

### 5.1 测试数据库连接失败

**问题**: `OperationalError: unable to open database file`

**解决**:
```bash
# 检查数据库路径
cat tests_white/.env.testing | grep DATABASE_URL

# 使用内存数据库 (测试默认)
DATABASE_URL=sqlite+aiosqlite:///:memory:
```

### 5.2 E2E 测试找不到元素

**问题**: `TimeoutError: locator.click: Timeout exceeded`

**解决**:
```typescript
// 1. 增加超时时间
await page.click('button', { timeout: 10000 });

// 2. 等待元素可见
await page.waitForSelector('button', { state: 'visible' });

// 3. 使用 data-testid 属性
// HTML: <button data-testid="submit-button">提交</button>
await page.click('[data-testid="submit-button"]');
```

### 5.3 测试覆盖率不达标

**问题**: Coverage 报告显示低于 80%

**解决**:
```bash
# 查看未覆盖的代码
pytest --cov=app --cov-report=term-missing

# 在 HTML 报告中查看详细覆盖情况
pytest --cov=app --cov-report=html
open reports/coverage/html/index.html

# 针对性补充测试
# 1. 优先测试核心业务逻辑
# 2. 添加边界条件测试
# 3. 增加错误处理测试
```

### 5.4 异步测试失败

**问题**: `asyncio` 测试报错

**解决**:
```python
# 确保使用正确的 pytest 标记
@pytest.mark.asyncio
async def test_async_function():
    result = await async_function()
    assert result is not None

# 检查 conftest.py 配置
# asyncio_mode = "auto"
```

### 5.5 Playwright 测试超时

**问题**: `Test timeout exceeded`

**解决**:
```typescript
// 1. 增加全局超时
test.setTimeout(60000); // 60 秒

// 2. 增加特定操作超时
await page.click('button', { timeout: 30000 });

// 3. 分步等待
await page.waitForLoadState('networkidle');
await page.waitForSelector('button');
```

---

## 6. 最佳实践

### 6.1 测试命名

- 使用描述性名称
- 格式: `test_<功能>_<场景>_<预期结果>`

```python
# GOOD
def test_create_project_with_valid_name_should_succeed():
    pass

# BAD
def test_project():
    pass
```

### 6.2 测试独立性

- 每个测试独立运行
- 不依赖测试执行顺序
- 使用 fixture 准备数据

```python
@pytest.fixture
async def test_data(db_session):
    """准备独立的测试数据"""
    data = Model(name="Test")
    db_session.add(data)
    await db_session.commit()
    return data
```

### 6.3 AAA 模式

- **Arrange** (准备): 准备测试数据
- **Act** (执行): 执行被测代码
- **Assert** (断言): 验证结果

```python
def test_update_project():
    # Arrange
    project = create_test_project()
    update_data = {"name": "Updated"}

    # Act
    result = update_project(project.id, update_data)

    # Assert
    assert result.name == "Updated"
```

### 6.4 Mock 外部依赖

```python
from unittest.mock import patch

@patch('app.services.ai.call_anthropic_api')
def test_ai_service(mock_api):
    mock_api.return_value = {"content": "Test"}
    result = ai_service.generate("requirement")
    assert result == {"content": "Test"}
```

### 6.5 E2E 测试只覆盖关键流程

- ✅ 登录/注册流程
- ✅ 创建/删除项目
- ✅ 发送 API 请求
- ✅ 执行测试用例
- ❌ 样式细节
- ❌ 动画效果
- ❌ 次要功能

---

## 7. 下一步

1. 阅读 [测试架构设计](./TEST_ARCHITECTURE.md)
2. 查看 [示例测试文件](../tests_white/README.md)
3. 了解 [CI/CD 集成](./TEST_ARCHITECTURE.md#8-cicd-集成)
4. 参与 [测试开发规范](./TEST_ARCHITECTURE.md#5-测试组织原则)

---

**文档更新**: 2025-02-17
**维护者**: @whitebox-qa, @blackbox-qa
