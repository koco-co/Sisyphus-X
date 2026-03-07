# API Automation Full Integrity Acceptance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 `Sisyphus-API-Test` 上下文中完成接口自动化模块全流程验收（含系统设置），执行中遇阻塞即修复，最终交付深色模式/简体中文的可播放 `.webm` 操作视频，并给出 UI+API+PostgreSQL 闭环证据。

**Architecture:** 采用“Playwright 前端主流程驱动 + API 辅助建数 + PostgreSQL 关键实体断言”的三层闭环。所有数据分为 A（保留）/B（可销毁）两套隔离集，避免历史脏数据污染结果。执行中按 `@systematic-debugging` 先定位根因再最小修复，并为每个修复补回归断言。

**Tech Stack:** Playwright 1.58、TypeScript、Vite React、FastAPI、PostgreSQL、pytest、SQLAlchemy

---

**执行约束（必须遵守）**
- 仅使用新建测试数据，不读取历史脏数据做断言基线。
- 主流程数据集 A 保留；删除验证仅使用数据集 B 并在结束后清理。
- 每个任务按 TDD 执行（先失败测试，再实现，再通过测试）。
- 每个最小改动点独立提交（智能原子化提交）。
- 回归前使用 `@verification-before-completion` 校验证据，不口头宣称“已完成”。

---

### Task 1: 验收运行基线（深色/简中/录屏/后端联通）

**Files:**
- Create: `frontend/e2e/helpers/runtimeContext.ts`
- Modify: `frontend/playwright-acceptance.config.ts`
- Modify: `frontend/e2e/acceptance-full-flow.spec.ts`
- Test: `frontend/e2e/acceptance-full-flow.spec.ts`

**Step 1: Write the failing test**

```ts
test('运行基线上下文生效', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', /zh/i);
  await expect(page.locator('body')).toContainText('项目管理');
  const theme = await page.evaluate(() => localStorage.getItem('sisyphus-theme'));
  expect(theme).toBe('dark');
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts --grep "运行基线上下文生效"`
Expected: FAIL（未注入主题/语言或后端未就绪）

**Step 3: Write minimal implementation**

```ts
// frontend/e2e/helpers/runtimeContext.ts
export async function applyRuntimeContext(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('sisyphus-theme', 'dark');
    localStorage.setItem('sisyphus-language', 'zh-CN');
    localStorage.setItem('sisyphus-token', 'test-token-for-e2e');
  });
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts --grep "运行基线上下文生效"`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/playwright-acceptance.config.ts frontend/e2e/helpers/runtimeContext.ts frontend/e2e/acceptance-full-flow.spec.ts
git commit -m "🔧 chore(e2e): 固化验收运行基线与深色简中上下文"
```

---

### Task 2: 构建 A/B 干净数据集（API 建数，不依赖历史数据）

**Files:**
- Create: `frontend/e2e/helpers/seedData.ts`
- Modify: `frontend/e2e/acceptance-full-flow.spec.ts`
- Test: `frontend/e2e/acceptance-full-flow.spec.ts`

**Step 1: Write the failing test**

```ts
test('创建隔离数据集 A/B', async ({ request }) => {
  const data = await createSeedData(request);
  expect(data.project.name).toContain('Sisyphus-API-Test');
  expect(data.datasetA.prefix).not.toBe(data.datasetB.prefix);
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts --grep "创建隔离数据集 A/B"`
Expected: FAIL（`createSeedData` 未实现）

**Step 3: Write minimal implementation**

```ts
// 只创建新数据，不读取历史脏数据
const prefixA = `A_${Date.now()}`;
const prefixB = `B_${Date.now()}`;
const project = await ensureProjectByName(request, 'Sisyphus-API-Test');
const datasetA = await createDatasetA(request, project.id, prefixA);
const datasetB = await createDatasetB(request, project.id, prefixB);
return { project, datasetA, datasetB };
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts --grep "创建隔离数据集 A/B"`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/e2e/helpers/seedData.ts frontend/e2e/acceptance-full-flow.spec.ts
git commit -m "✅ test(e2e): 新增 A/B 隔离数据集建数能力"
```

---

### Task 3: 接口自动化主流程前半段（项目→关键字→接口）高压覆盖

**Files:**
- Modify: `frontend/e2e/acceptance-full-flow.spec.ts`
- Create: `frontend/e2e/helpers/controlAudit.ts`
- Test: `frontend/e2e/acceptance-full-flow.spec.ts`

**Step 1: Write the failing test**

```ts
test('主流程前半段可用且交互完整', async ({ page }) => {
  await runProjectKeywordInterfaceFlow(page);
  const audit = await auditCurrentPageControls(page);
  expect(audit.buttons.clicked).toBeGreaterThan(0);
  expect(audit.inputs.filled).toBeGreaterThan(0);
  expect(audit.selects.selected).toBeGreaterThan(0);
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts --grep "主流程前半段可用且交互完整"`
Expected: FAIL（流程函数/审计助手未实现）

**Step 3: Write minimal implementation**

```ts
// controlAudit.ts: 统计可点击/可输入/可选择控件
export async function auditCurrentPageControls(page: Page) {
  const buttons = page.getByRole('button');
  const inputs = page.locator('input, textarea');
  const selects = page.locator('[role="combobox"], select');
  return {
    buttons: { clicked: await clickVisibleButtons(buttons) },
    inputs: { filled: await fillVisibleInputs(inputs) },
    selects: { selected: await selectVisibleOptions(selects) },
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts --grep "主流程前半段可用且交互完整"`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/e2e/acceptance-full-flow.spec.ts frontend/e2e/helpers/controlAudit.ts
git commit -m "✅ test(e2e): 覆盖主流程前半段与核心交互控件"
```

---

### Task 4: 接口自动化主流程后半段（场景→计划执行→报告）闭环

**Files:**
- Modify: `frontend/e2e/acceptance-full-flow.spec.ts`
- Test: `frontend/e2e/acceptance-full-flow.spec.ts`

**Step 1: Write the failing test**

```ts
test('计划执行后可进入报告详情', async ({ page, request }) => {
  const ids = await runScenarioPlanReportFlow(page, request);
  expect(ids.executionId).toBeTruthy();
  expect(ids.reportId).toBeTruthy();
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts --grep "计划执行后可进入报告详情"`
Expected: FAIL（执行轮询/报告查询断言缺失）

**Step 3: Write minimal implementation**

```ts
// 轮询 execution 直到终态，再从 /reports/ 按场景名检索 reportId
const executionId = await executePlanAndWait(request, planId);
const reportId = await findReportByScenarioName(request, scenarioName);
await page.goto(`/reports/${reportId}`);
await expect(page.getByText('测试报告')).toBeVisible();
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts --grep "计划执行后可进入报告详情"`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/e2e/acceptance-full-flow.spec.ts
git commit -m "✅ test(e2e): 打通场景计划执行到报告详情闭环"
```

---

### Task 5: 系统设置覆盖（全局参数 + 环境管理）并关联主流程

**Files:**
- Modify: `frontend/e2e/acceptance-full-flow.spec.ts`
- Create: `frontend/e2e/helpers/settingsFlow.ts`
- Test: `frontend/e2e/acceptance-full-flow.spec.ts`

**Step 1: Write the failing test**

```ts
test('系统设置功能可用并可被主流程引用', async ({ page, request }) => {
  const { envId, globalParamId } = await runSettingsFlow(page, request);
  expect(envId).toBeTruthy();
  expect(globalParamId).toBeTruthy();
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts --grep "系统设置功能可用并可被主流程引用"`
Expected: FAIL（系统设置流程助手未实现）

**Step 3: Write minimal implementation**

```ts
// 在 /environments 与 /global-params 完成新增与可见性校验
const envId = await createEnvironmentAndAssert(page, request, projectId, envPayload);
const globalParamId = await createGlobalParamAndAssert(page, request, codePayload);
await bindEnvToPlanScenario(request, planId, scenarioId, envId);
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts --grep "系统设置功能可用并可被主流程引用"`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/e2e/acceptance-full-flow.spec.ts frontend/e2e/helpers/settingsFlow.ts
git commit -m "✅ test(settings): 补齐环境管理与全局参数闭环覆盖"
```

---

### Task 6: PostgreSQL 闭环断言（关键实体字段与关系）

**Files:**
- Create: `tests/interface/test_acceptance_postgres_closure.py`
- Create: `tests/interface/data/acceptance_artifacts.example.json`
- Modify: `frontend/e2e/acceptance-full-flow.spec.ts`
- Test: `tests/interface/test_acceptance_postgres_closure.py`

**Step 1: Write the failing test**

```python
def test_acceptance_entities_exist(pg_session, artifacts):
    assert query_project(pg_session, artifacts["project_id"]) is not None
    assert query_plan_execution(pg_session, artifacts["execution_id"]).status in {"completed", "failed", "cancelled"}
```

**Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest ../tests/interface/test_acceptance_postgres_closure.py -v`
Expected: FAIL（artifacts 文件/查询函数未实现）

**Step 3: Write minimal implementation**

```python
# 从 tests/interface/data/acceptance_artifacts.json 读取 ids
# 用 SQLAlchemy 查询 projects/interfaces/scenarios/test_plans/test_plan_executions/test_reports/global_params/project_environments
assert project.id == artifacts["project_id"]
assert report.execution_id == artifacts["execution_id"]
```

**Step 4: Run test to verify it passes**

Run: `cd backend && uv run pytest ../tests/interface/test_acceptance_postgres_closure.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/interface/test_acceptance_postgres_closure.py tests/interface/data/acceptance_artifacts.example.json frontend/e2e/acceptance-full-flow.spec.ts
git commit -m "✅ test(db): 新增 PostgreSQL 闭环断言测试"
```

---

### Task 7: 删除类操作专用数据集 B（执行并清理）

**Files:**
- Modify: `frontend/e2e/helpers/seedData.ts`
- Modify: `frontend/e2e/acceptance-full-flow.spec.ts`
- Test: `frontend/e2e/acceptance-full-flow.spec.ts`

**Step 1: Write the failing test**

```ts
test('数据集 B 删除后应不可查询', async ({ request }) => {
  const b = await buildDatasetB(request);
  await cleanupDatasetB(request, b);
  const res = await request.get(`/api/v1/plans/${b.planId}`);
  expect(res.status()).toBe(404);
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts --grep "数据集 B 删除后应不可查询"`
Expected: FAIL（清理逻辑缺失）

**Step 3: Write minimal implementation**

```ts
// 按依赖逆序删除: 报告 -> 执行 -> 计划场景 -> 计划 -> 场景步骤 -> 场景 -> 接口 -> 关键字 -> 环境 -> 全局参数(若只属于B)
await deleteInReverseDependencyOrder(request, b);
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts --grep "数据集 B 删除后应不可查询"`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/e2e/helpers/seedData.ts frontend/e2e/acceptance-full-flow.spec.ts
git commit -m "✅ test(cleanup): 新增删除链路专用数据集B与自动清理"
```

---

### Task 8: 阻塞问题修复循环（发现即修复并补回归）

**Files:**
- Modify: `frontend/src/pages/api-automation/ProjectManagement.tsx`
- Modify: `frontend/src/pages/keywords/KeywordManagement.tsx`
- Modify: `frontend/src/pages/interface-management/index.tsx`
- Modify: `frontend/src/pages/scenario/editor/ScenarioEditorLayout.tsx`
- Modify: `frontend/src/pages/plans/TestPlan.tsx`
- Modify: `frontend/src/pages/reports/TestReport.tsx`
- Modify: `frontend/src/pages/environments/EnvironmentList.tsx`
- Modify: `frontend/src/pages/global-params/index.tsx`
- Modify: `backend/app/api/v1/endpoints/projects.py`
- Modify: `backend/app/api/v1/endpoints/interfaces.py`
- Modify: `backend/app/api/v1/endpoints/scenarios.py`
- Modify: `backend/app/api/v1/endpoints/plans.py`
- Modify: `backend/app/api/v1/endpoints/reports.py`
- Modify: `backend/app/api/v1/endpoints/global_params.py`
- Modify: `backend/app/api/v1/endpoints/environments.py`
- Test: `frontend/e2e/acceptance-full-flow.spec.ts`, `tests/interface/test_acceptance_postgres_closure.py`

**Step 1: Write the failing regression test for the blocker**

```ts
test('回归: 创建项目按钮可见且可点击', async ({ page }) => {
  await page.goto('/api/projects');
  await expect(page.getByTestId('create-project-button')).toBeVisible();
  await expect(page.getByTestId('create-project-button')).toBeEnabled();
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts --grep "回归:"`
Expected: FAIL（复现当前阻塞）

**Step 3: Write minimal implementation using @systematic-debugging**

```ts
// 仅修复根因，不做无关重构
// 例如：修复 disabled 条件、缺失 onClick、错误字段映射、错误接口路径
```

**Step 4: Run tests to verify it passes**

Run: `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts --grep "回归:"`
Expected: PASS

**Step 5: Commit**

```bash
git add <本次修复涉及文件> frontend/e2e/acceptance-full-flow.spec.ts
git commit -m "🐛 fix(acceptance): 修复<阻塞点描述>并补回归用例"
```

---

### Task 9: 视频导出与验收结果固化

**Files:**
- Create: `frontend/e2e/helpers/exportVideo.ts`
- Create: `tests/e2e/artifacts/.gitkeep`
- Create: `tests/e2e/ACCEPTANCE_RESULT_2026-03-07.md`
- Modify: `frontend/e2e/acceptance-full-flow.spec.ts`
- Test: `frontend/e2e/acceptance-full-flow.spec.ts`

**Step 1: Write the failing test**

```ts
test('生成最终 webm 交付文件', async ({}, testInfo) => {
  const output = await exportFinalVideo(testInfo, 'tests/e2e/artifacts/acceptance-full-flow.webm');
  expect(output.exists).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts --grep "生成最终 webm 交付文件"`
Expected: FAIL（导出逻辑未实现）

**Step 3: Write minimal implementation**

```ts
// 从 testInfo.outputDir 中定位 video.webm 并复制到 tests/e2e/artifacts/acceptance-full-flow.webm
await fs.copyFile(videoPath, targetPath);
```

**Step 4: Run full acceptance + DB closure to verify it passes**

Run:
- `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts`
- `cd backend && uv run pytest ../tests/interface/test_acceptance_postgres_closure.py -v`
Expected: PASS + 产出 `tests/e2e/artifacts/acceptance-full-flow.webm`

**Step 5: Commit**

```bash
git add frontend/e2e/helpers/exportVideo.ts frontend/e2e/acceptance-full-flow.spec.ts tests/e2e/artifacts/.gitkeep tests/e2e/ACCEPTANCE_RESULT_2026-03-07.md
git commit -m "📝 docs(acceptance): 固化验收视频与闭环结果记录"
```

---

### Task 10: 提交前核验与清理

**Files:**
- Modify: `CHANGELOG.md`（如有用户可见行为变更）
- Modify: `README.md`（如测试运行方式有更新）
- Modify: `AGENTS.md`（仅当流程规范变更）
- Test: `frontend/e2e/acceptance-full-flow.spec.ts`, `tests/interface/test_acceptance_postgres_closure.py`

**Step 1: Write the failing check**

```bash
git status --short
# 若出现未跟踪临时目录（playwright-report、test-results 等）则视为失败
```

**Step 2: Run checks to verify failure state**

Run: `git status --short`
Expected: FAIL（存在临时产物）

**Step 3: Write minimal cleanup implementation**

```bash
rm -rf frontend/playwright-report frontend/test-results tests/e2e/playwright-report tests/e2e/test-results .pytest_cache
```

**Step 4: Run full verification**

Run:
- `cd frontend && npm run lint`
- `cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts`
- `cd backend && uv run pytest ../tests/interface/test_acceptance_postgres_closure.py -v`
- `git status --short`
Expected: 全部 PASS 且 `git status` 仅包含预期源码改动

**Step 5: Commit**

```bash
git add <受影响文件>
git commit -m "🔧 chore(verification): 验收前最终校验与产物清理"
```

---

## 执行顺序建议

1. 先完成 Task 1-2（基线与干净建数）
2. 再完成 Task 3-5（主流程 + 系统设置）
3. 然后完成 Task 6-7（PostgreSQL 闭环 + 删除链路）
4. 执行 Task 8（针对阻塞点逐个修复）
5. 最后完成 Task 9-10（视频固化 + 交付前核验）

## 关键命令速查

- 启动全栈（建议调试模式）：`./sisyphus_init.sh start --backend --debug`、`./sisyphus_init.sh start --frontend --debug`
- 跑验收脚本：`cd frontend && npx playwright test e2e/acceptance-full-flow.spec.ts -c playwright-acceptance.config.ts`
- 跑 DB 闭环：`cd backend && uv run pytest ../tests/interface/test_acceptance_postgres_closure.py -v`

