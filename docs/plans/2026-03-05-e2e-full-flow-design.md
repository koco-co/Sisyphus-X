# E2E 全流程自动化测试设计

## 概述

采用测试驱动开发（TDD）模式，通过 Playwright 自动化测试驱动 Sisyphus-X 平台的功能完善。测试运行时发现任何问题自动修复，直到全流程通过。

## 设计决策

| 项目 | 决定 |
|------|------|
| 测试起点 | 项目（所有功能依赖项目） |
| 优先级 | 核心链路：项目 → 环境 → 接口 → 场景 → 计划 → 报告 |
| 测试对象 | Sisyphus-X 自身 API（自引用测试） |
| 执行方式 | 全自动化，自动分析修复，用户只看结果 |
| 数据策略 | 命名隔离，唯一标识符（runId） |
| 架构模式 | Page Object + 模块化测试套件 |

## 整体架构

```
tests/auto/
├── e2e/
│   ├── fixtures/                    # 测试夹具
│   │   ├── auth.fixture.ts          # 认证状态
│   │   ├── test-data.fixture.ts     # 测试数据生成器
│   │   └── cleanup.fixture.ts       # 清理钩子
│   │
│   ├── pages/                       # Page Objects
│   │   ├── base.page.ts             # 基类（通用方法）
│   │   ├── login.page.ts            # 登录页
│   │   ├── project.page.ts          # 项目管理页
│   │   ├── environment.page.ts      # 环境管理页
│   │   ├── interface.page.ts        # 接口管理页
│   │   ├── scenario.page.ts         # 场景编排页
│   │   ├── plan.page.ts             # 测试计划页
│   │   └── report.page.ts           # 测试报告页
│   │
│   ├── flows/                       # 业务流程测试（核心链路）
│   │   ├── 01-auth.flow.spec.ts     # 认证流程
│   │   ├── 02-project.flow.spec.ts  # 项目 CRUD
│   │   ├── 03-environment.flow.spec.ts  # 环境 CRUD
│   │   ├── 04-interface.flow.spec.ts    # 接口 CRUD
│   │   ├── 05-scenario.flow.spec.ts     # 场景 CRUD + 执行
│   │   ├── 06-plan.flow.spec.ts         # 计划 CRUD + 执行
│   │   └── 07-report.flow.spec.ts       # 报告查看
│   │
│   └── full-flow.spec.ts            # 完整流程集成测试
│
└── playwright.config.ts             # 配置文件
```

## Page Object 设计

每个 Page Object 封装该页面的：
- **选择器**：元素定位（使用 data-testid）
- **操作方法**：增删改查操作
- **断言方法**：状态验证

```typescript
// pages/base.page.ts - 基类
abstract class BasePage {
  // 通用方法
  async navigate(path: string)
  async waitForLoad()
  async takeScreenshot(name: string)
  async getToastMessage(): Promise<string>

  // 通用 CRUD 模板
  async create(data: CreateDTO): Promise<string>  // 返回 ID
  async update(id: string, data: UpdateDTO)
  async delete(id: string)
  async list(filters?: FilterDTO): Promise<Item[]>
  async get(id: string): Promise<Item>
}
```

**关键约定**：
1. 所有选择器使用 `data-testid` 属性，避免依赖 CSS 类名
2. 创建方法返回资源 ID，供后续测试使用
3. 断言方法以 `assert` 前缀命名

## 测试数据流与依赖管理

采用 **全局状态文件** 方案跨测试文件共享数据：

```typescript
// fixtures/test-state.ts
interface TestState {
  runId: string;  // 本次运行唯一标识 (时间戳)
  projectId: string;
  environmentId: string;
  interfaceId: string;
  scenarioId: string;
  planId: string;
  reportId: string;
}
```

**数据流**：

```
01-auth          → 登录成功，保存 token
02-project       → 创建项目 "E2E_{runId}_项目" → 保存 projectId
03-environment   → 读取 projectId，创建环境 → 保存 environmentId
04-interface     → 读取 projectId，创建接口 → 保存 interfaceId
05-scenario      → 读取 projectId/interfaceId，创建场景 → 保存 scenarioId
06-plan          → 读取 scenarioId，创建计划并执行 → 保存 planId, reportId
07-report        → 读取 reportId，验证报告内容
```

**命名规则**：
- 项目: `E2E_{runId}_项目`
- 环境: `E2E_{runId}_环境`
- 接口: `E2E_{runId}_接口_{序号}`
- 场景: `E2E_{runId}_场景`

## 核心链路测试用例

### 01 - 认证流程
- 访问登录页
- 使用测试账号登录
- 验证跳转到 Dashboard
- 保存认证状态到 Playwright Storage

### 02 - 项目管理 CRUD
- Create: 创建项目
- Read: 查询项目列表，验证项目存在
- Update: 修改项目描述
- Delete: 最后执行

### 03 - 环境管理 CRUD
- Create: 创建环境，配置 base_url = http://localhost:8000/api/v1
- Read: 验证环境配置
- Update: 添加全局变量
- Delete: 最后执行

### 04 - 接口管理 CRUD (自引用测试)
- Create: 创建接口，目标 = 本项目 API
  - GET /api/v1/projects
  - POST /api/v1/projects
  - GET /api/v1/projects/{id}
- Read: 验证接口定义
- Update: 修改请求参数
- 执行: 发送请求，验证响应
- Delete: 最后执行

### 05 - 场景编排 CRUD
- Create: 创建场景，添加步骤
- Read: 验证场景配置
- Update: 添加断言规则
- 执行: 运行场景，验证成功
- Delete: 最后执行

### 06 - 测试计划 CRUD
- Create: 创建计划，关联场景
- Read: 验证计划配置
- 执行: 立即执行计划
- Delete: 最后执行

### 07 - 测试报告
- Read: 查看报告列表
- 验证: 报告状态 = 成功

## 自动化执行与修复流程

```
启动测试 → 运行测试用例 → 测试结果?
                           ├─ 全部通过 → 完成报告
                           └─ 部分失败 → 分析失败原因
                                        ├─ 前端问题 → 修复前端代码
                                        ├─ 后端问题 → 修复后端代码
                                        └─ 需求问题 → 删除功能
                                             ↓
                                        重新运行
```

**失败分类与处理策略**：

| 失败类型 | 识别特征 | 处理方式 |
|---------|---------|---------|
| 元素未找到 | `locator not found`, `timeout` | 检查选择器，添加 data-testid |
| API 错误 | `500`, `404`, `422` | 修复后端逻辑或 API 端点 |
| 业务逻辑错误 | 断言失败，数据不匹配 | 修复前后端业务代码 |
| 需求不合理 | 功能复杂/无意义/无法实现 | 直接删除该功能 |
| 环境问题 | 连接超时，服务不可用 | 检查/重启服务 |

## Playwright 配置

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/auto/e2e/flows',
  fullyParallel: false,  // 顺序执行
  retries: 0,  // 失败不重试，直接修复
  timeout: 30000,

  projects: [
    {
      name: 'chromium',
      use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
      },
    },
  ],

  webServer: [
    {
      command: 'cd backend && uv run uvicorn app.main:app --port 8000',
      url: 'http://localhost:8000/api/v1/projects',
      reuseExistingServer: true,
    },
    {
      command: 'cd frontend && npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
    },
  ],
});
```

## 实施计划

### Phase 1: 基础设施
- 创建 Page Object 基类
- 创建测试状态管理模块
- 配置 Playwright
- 添加 data-testid 属性到关键元素

### Phase 2: 认证 + 项目
- 01-auth.flow.spec.ts
- 02-project.flow.spec.ts
- 运行测试 → 修复问题 → 直到通过

### Phase 3: 环境管理
- 03-environment.flow.spec.ts
- 运行测试 → 修复问题 → 直到通过

### Phase 4: 接口管理
- 04-interface.flow.spec.ts
- 运行测试 → 修复问题 → 直到通过

### Phase 5: 场景编排
- 05-scenario.flow.spec.ts
- 运行测试 → 修复问题 → 直到通过

### Phase 6: 计划 + 报告
- 06-plan.flow.spec.ts
- 07-report.flow.spec.ts
- 运行测试 → 修复问题 → 直到通过

### Phase 7: 完整流程验证
- full-flow.spec.ts
- 清理遗留测试数据

## 最终交付物

| 交付物 | 说明 |
|-------|------|
| Page Objects | 7 个页面对象封装 |
| 测试用例 | 7 个模块测试 + 1 个集成测试 |
| 测试状态管理 | 跨测试数据共享 |
| 运行脚本 | 一键执行脚本 |
| 修复后的代码 | 所有问题已修复的生产代码 |
