import { test, expect } from '@playwright/test'
import { randomUUID } from 'crypto'

const API_BASE = 'http://127.0.0.1:8000/api/v1'

test.describe('接口自动化主干 Happy Path', () => {
  test.setTimeout(300000)

  test('项目->关键字->接口->场景->计划执行->报告详情', async ({ page, request }) => {
    const ts = Date.now()
    const projectName = `HP_UI_${ts}`
    const keywordName = `hp_kw_${ts}`
    const interfaceName = `hp_interface_${ts}`
    const scenarioName = `hp_scenario_${ts}`
    const planName = `hp_plan_${ts}`

    // 0) 认证绕过（开发模式）
    await page.goto('http://localhost:5173/')
    await page.evaluate(() => {
      localStorage.setItem('sisyphus-token', 'test-token-for-e2e')
      localStorage.setItem('sisyphus-user', JSON.stringify({
        id: '00000000-0000-0000-0000-000000000001',
        username: 'E2E Test User',
        email: 'e2e-test@example.com',
      }))
    })

    // 1) 项目
    const createProjectRes = await request.post(`${API_BASE}/projects/`, {
      data: {
        name: projectName,
        description: 'Happy path project',
        key: `HP_${ts}`,
        owner: 'e2e',
      },
    })
    expect(createProjectRes.ok()).toBeTruthy()
    const project = await createProjectRes.json()
    const projectId = String(project.id)

    // 2) 关键字
    const createKeywordRes = await request.post(`${API_BASE}/keywords/`, {
      data: {
        id: randomUUID(),
        project_id: projectId,
        name: keywordName,
        class_name: 'custom',
        method_name: `hp_method_${ts}`,
        description: 'Happy path keyword',
        code: 'def hp_method():\n    return {"ok": True}\n',
        is_built_in: false,
        is_enabled: true,
      },
    })
    expect(createKeywordRes.ok()).toBeTruthy()

    // 3) 接口
    const createInterfaceRes = await request.post(`${API_BASE}/interfaces/`, {
      data: {
        project_id: projectId,
        name: interfaceName,
        method: 'GET',
        url: 'http://127.0.0.1:8000/health',
        headers: {},
        params: {},
        body: {},
        body_type: 'none',
      },
    })
    expect(createInterfaceRes.ok()).toBeTruthy()
    const createdInterface = await createInterfaceRes.json()
    const interfaceId = String(createdInterface.id)

    // 4) 场景 + 步骤
    const createScenarioRes = await request.post(`${API_BASE}/scenarios/`, {
      data: {
        project_id: projectId,
        name: scenarioName,
        description: 'Happy path scenario',
        priority: 'P1',
        tags: ['happy-path'],
        variables: {},
      },
    })
    expect(createScenarioRes.ok()).toBeTruthy()
    const scenario = await createScenarioRes.json()
    const scenarioId = String(scenario.id)

    const createStepRes = await request.post(`${API_BASE}/scenarios/${scenarioId}/steps`, {
      data: {
        keyword_type: 'request',
        keyword_name: 'http_get',
        description: 'health check',
        sort_order: 1,
        parameters: {
          method: 'GET',
          url: 'http://127.0.0.1:8000/health',
          interface_id: interfaceId,
        },
      },
    })
    expect(createStepRes.ok()).toBeTruthy()

    // 5) 计划 + 关联场景 + 执行
    const createPlanRes = await request.post(`${API_BASE}/plans/`, {
      data: {
        project_id: projectId,
        name: planName,
        description: 'Happy path plan',
      },
    })
    expect(createPlanRes.ok()).toBeTruthy()
    const plan = await createPlanRes.json()
    const planId = String(plan.id)

    const addScenarioRes = await request.post(`${API_BASE}/plans/${planId}/scenarios`, {
      data: {
        scenario_id: scenarioId,
        execution_order: 1,
      },
    })
    expect(addScenarioRes.ok()).toBeTruthy()

    const executeRes = await request.post(`${API_BASE}/plans/${planId}/execute`)
    expect(executeRes.ok()).toBeTruthy()
    const executeData = await executeRes.json()
    const executionId = String(executeData.execution_id)

    // 轮询执行状态，直到终态
    let executionStatus = 'pending'
    for (let i = 0; i < 30; i += 1) {
      const executionRes = await request.get(`${API_BASE}/plans/executions/${executionId}`)
      expect(executionRes.ok()).toBeTruthy()
      const executionData = await executionRes.json()
      executionStatus = executionData?.execution?.status ?? executionData?.current_status ?? 'pending'
      if (['completed', 'failed', 'cancelled'].includes(executionStatus)) break
      await page.waitForTimeout(1000)
    }
    expect(['completed', 'failed', 'cancelled']).toContain(executionStatus)

    // 读取报告 ID（按场景名检索）
    const reportListRes = await request.get(`${API_BASE}/reports/`, {
      params: { page: 1, size: 20, search: scenarioName },
    })
    expect(reportListRes.ok()).toBeTruthy()
    const reportListData = await reportListRes.json()
    const reportId = reportListData?.items?.[0]?.id
    expect(reportId).toBeTruthy()

    // 6) UI 验证：各模块可访问 + 报告详情可打开
    await page.goto('http://localhost:5173/api/projects')
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/\/api\/projects/)

    await page.goto('http://localhost:5173/keywords')
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/\/keywords/)

    await page.goto(`http://localhost:5173/interface-management/${interfaceId}?projectId=${projectId}`)
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/\/interface-management\//)

    await page.goto('http://localhost:5173/scenarios')
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/\/scenarios/)

    await page.goto('http://localhost:5173/plans')
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/\/plans/)

    await page.goto(`http://localhost:5173/reports/${reportId}`)

    await expect(page.getByText('测试报告').first()).toBeVisible({ timeout: 15000 })
    await expect(
      page.getByText('执行步骤详情').first().or(page.getByText('暂无步骤详情数据').first())
    ).toBeVisible({ timeout: 15000 })
  })
})

