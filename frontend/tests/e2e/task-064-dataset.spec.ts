import { test, expect } from './fixtures/test.fixture';
// import { ScenariosPage } from '../../tests_black/pages/ScenariosPage'; // TODO: Page Object未实现,暂时禁用此测试
import path from 'path';
import { fileURLToPath } from 'url';

// ES模块中获取__dirname的替代方案
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * TASK-064: 测试数据集功能黑盒测试
 *
 * 前置条件:
 * - TASK-035: 数据集管理UI必须已实现
 * - TASK-021: 数据集API接口必须可用
 * - 场景编辑器可正常访问
 *
 * 测试文件: task-064-dataset.spec.ts
 * 测试人员: @blackbox-qa
 * 创建日期: 2026-02-17
 */

test.describe.skip('TASK-064: 测试数据集功能黑盒测试 (跳过: Page Object未实现)', () => {
  // let scenariosPage: ScenariosPage; // TODO: Page Object未实现
  const testCsvContent = 'username,password,email\nuser1,pass123,user1@example.com\nuser2,pass456,user2@example.com\n';
  const testCsvFilePath = path.join(__dirname, 'test-data.csv');

  test.beforeEach(async ({ page }) => {
    // TODO: Page Object未实现,暂时禁用此测试
    await page.goto('http://localhost:5173/');
    // scenariosPage = new ScenariosPage(page);

    // 导航到场景页面
    // await scenariosPage.goto();

    // 创建一个测试场景
    // const scenarioName = `DatasetTest_${Date.now()}`;
    // await scenariosPage.createScenario(scenarioName, '数据集测试场景');
    await page.waitForTimeout(1000);

    // 进入场景编辑器
    // await scenariosPage.editScenario(scenarioName);
    await page.waitForTimeout(1000);
  });

  test.describe('数据集侧边栏', () => {
    test('应该显示数据集侧边栏', async ({ page }) => {
      // 验证数据集侧边栏存在
      // 注意: 这个测试需要实际UI实现后才能运行
      const datasetSidebar = page.locator('[data-testid="dataset-sidebar"]');
      await expect(datasetSidebar).toBeVisible();

      // 验证侧边栏标题
      const sidebarTitle = page.locator('[data-testid="dataset-sidebar-title"]');
      await expect(sidebarTitle).toContainText('数据集');
    });

    test('应该显示空状态提示', async ({ page }) => {
      // 验证空数据集提示
      const emptyState = page.locator('[data-testid="dataset-empty-state"]');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('暂无数据集');
    });
  });

  test.describe('创建数据集', () => {
    test('应该成功创建空数据集', async ({ page }) => {
      const datasetName = `TestDataset_${Date.now()}`;

      // 点击创建数据集按钮
      await page.click('[data-testid="create-dataset-button"]');

      // 等待对话框出现
      await expect(page.locator('[data-testid="create-dataset-dialog"]')).toBeVisible();

      // 输入数据集名称
      await page.fill('[data-testid="dataset-name-input"]', datasetName);

      // 确认创建
      await page.click('[data-testid="confirm-create-dataset"]');

      // 验证成功提示
      const toast = page.locator('[data-testid="toast-success"]');
      await expect(toast).toBeVisible({ timeout: 5000 });
      await expect(toast).toContainText('创建成功');

      // 验证数据集出现在列表中
      const datasetItem = page.locator(`[data-testid="dataset-item-${datasetName}"]`);
      await expect(datasetItem).toBeVisible();
    });

    test('应该验证数据集名称不能为空', async ({ page }) => {
      // 点击创建数据集按钮
      await page.click('[data-testid="create-dataset-button"]');

      // 不输入名称，直接点击确认
      await page.click('[data-testid="confirm-create-dataset"]');

      // 验证错误提示
      const errorHint = page.locator('[data-testid="dataset-name-error"]');
      await expect(errorHint).toBeVisible();
      await expect(errorHint).toContainText('数据集名称不能为空');
    });

    test('应该验证数据集名称唯一性', async ({ page }) => {
      const datasetName = `DuplicateDataset_${Date.now()}`;

      // 创建第一个数据集
      await page.click('[data-testid="create-dataset-button"]');
      await page.fill('[data-testid="dataset-name-input"]', datasetName);
      await page.click('[data-testid="confirm-create-dataset"]');
      await page.waitForTimeout(500);

      // 尝试创建同名数据集
      await page.click('[data-testid="create-dataset-button"]');
      await page.fill('[data-testid="dataset-name-input"]', datasetName);
      await page.click('[data-testid="confirm-create-dataset"]');

      // 验证错误提示
      const toast = page.locator('[data-testid="toast-error"]');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('数据集名称已存在');
    });
  });

  test.describe('手动输入测试数据', () => {
    test('应该在数据集中添加测试数据行', async ({ page }) => {
      const datasetName = `ManualDataDataset_${Date.now()}`;

      // 创建数据集
      await page.click('[data-testid="create-dataset-button"]');
      await page.fill('[data-testid="dataset-name-input"]', datasetName);
      await page.click('[data-testid="confirm-create-dataset"]');
      await page.waitForTimeout(1000);

      // 选择数据集
      await page.click(`[data-testid="dataset-item-${datasetName}"]`);

      // 点击添加数据行按钮
      await page.click('[data-testid="add-data-row-button"]');

      // 表格应该显示新的数据行
      const dataRow = page.locator('[data-testid="data-row-0"]');
      await expect(dataRow).toBeVisible();

      // 输入测试数据
      await page.fill('[data-testid="data-cell-0-0"]', 'test_value_1');
      await page.fill('[data-testid="data-cell-0-1"]', 'test_value_2');

      // 保存数据
      await page.click('[data-testid="save-dataset-button"]');

      // 验证保存成功
      const toast = page.locator('[data-testid="toast-success"]');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('保存成功');
    });

    test('应该支持添加多列数据', async ({ page }) => {
      const datasetName = `MultiColumnDataset_${Date.now()}`;

      // 创建数据集
      await page.click('[data-testid="create-dataset-button"]');
      await page.fill('[data-testid="dataset-name-input"]', datasetName);
      await page.click('[data-testid="confirm-create-dataset"]');
      await page.waitForTimeout(1000);

      // 选择数据集
      await page.click(`[data-testid="dataset-item-${datasetName}"]`);

      // 添加列
      await page.click('[data-testid="add-column-button"]');

      // 输入列名
      await page.fill('[data-testid="column-name-input"]', 'username');
      await page.click('[data-testid="confirm-add-column"]');

      // 验证列已添加
      const columnHeader = page.locator('[data-testid="column-header-username"]');
      await expect(columnHeader).toBeVisible();
    });

    test('应该支持删除数据行', async ({ page }) => {
      const datasetName = `DeleteRowDataset_${Date.now()}`;

      // 创建数据集并添加数据
      await page.click('[data-testid="create-dataset-button"]');
      await page.fill('[data-testid="dataset-name-input"]', datasetName);
      await page.click('[data-testid="confirm-create-dataset"]');
      await page.waitForTimeout(1000);

      await page.click(`[data-testid="dataset-item-${datasetName}"]`);
      await page.click('[data-testid="add-data-row-button"]');
      await page.waitForTimeout(500);

      // 删除数据行
      await page.click('[data-testid="delete-row-button-0"]');

      // 确认删除
      await page.click('[data-testid="confirm-delete-row"]');

      // 验证数据行已删除
      const dataRow = page.locator('[data-testid="data-row-0"]');
      await expect(dataRow).not.toBeVisible();
    });
  });

  test.describe('CSV导入功能', () => {
    test('应该成功导入CSV文件', async ({ page }) => {
      const datasetName = `CSVImportDataset_${Date.now()}`;

      // 创建数据集
      await page.click('[data-testid="create-dataset-button"]');
      await page.fill('[data-testid="dataset-name-input"]', datasetName);
      await page.click('[data-testid="confirm-create-dataset"]');
      await page.waitForTimeout(1000);

      // 选择数据集
      await page.click(`[data-testid="dataset-item-${datasetName}"]`);

      // 创建测试CSV文件
      const csvFile = {
        name: 'test-data.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(testCsvContent)
      };

      // 点击导入按钮
      const fileInput = page.locator('[data-testid="csv-file-input"]');
      await fileInput.setInputFiles(csvFile);

      // 验证导入成功
      const toast = page.locator('[data-testid="toast-success"]');
      await expect(toast).toBeVisible({ timeout: 10000 });
      await expect(toast).toContainText('导入成功');

      // 验证数据显示在表格中
      const dataRows = page.locator('[data-testid^="data-row-"]');
      const rowCount = await dataRows.count();
      expect(rowCount).toBeGreaterThan(0);
    });

    test('应该验证CSV文件格式', async ({ page }) => {
      const datasetName = `InvalidCSVDataset_${Date.now()}`;

      // 创建数据集
      await page.click('[data-testid="create-dataset-button"]');
      await page.fill('[data-testid="dataset-name-input"]', datasetName);
      await page.click('[data-testid="confirm-create-dataset"]');
      await page.waitForTimeout(1000);

      // 选择数据集
      await page.click(`[data-testid="dataset-item-${datasetName}"]`);

      // 尝试上传无效的CSV文件
      const invalidFile = {
        name: 'invalid.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Invalid content')
      };

      const fileInput = page.locator('[data-testid="csv-file-input"]');
      await fileInput.setInputFiles(invalidFile);

      // 验证错误提示
      const toast = page.locator('[data-testid="toast-error"]');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('文件格式错误');
    });

    test('应该显示导入进度', async ({ page }) => {
      const datasetName = `LargeCSVDataset_${Date.now()}`;

      // 创建数据集
      await page.click('[data-testid="create-dataset-button"]');
      await page.fill('[data-testid="dataset-name-input"]', datasetName);
      await page.click('[data-testid="confirm-create-dataset"]');
      await page.waitForTimeout(1000);

      // 选择数据集
      await page.click(`[data-testid="dataset-item-${datasetName}"]`);

      // 创建较大的CSV文件
      let largeCsvContent = 'col1,col2,col3\n';
      for (let i = 0; i < 100; i++) {
        largeCsvContent += `val${i},val${i},val${i}\n`;
      }

      const largeCsvFile = {
        name: 'large-data.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(largeCsvContent)
      };

      // 上传文件
      const fileInput = page.locator('[data-testid="csv-file-input"]');
      await fileInput.setInputFiles(largeCsvFile);

      // 验证进度条显示
      const progressBar = page.locator('[data-testid="csv-import-progress"]');
      await expect(progressBar).toBeVisible();
    });
  });

  test.describe('CSV导出功能', () => {
    test('应该成功导出数据集为CSV文件', async ({ page }) => {
      const datasetName = `CSVExportDataset_${Date.now()}`;

      // 创建数据集并添加数据
      await page.click('[data-testid="create-dataset-button"]');
      await page.fill('[data-testid="dataset-name-input"]', datasetName);
      await page.click('[data-testid="confirm-create-dataset"]');
      await page.waitForTimeout(1000);

      await page.click(`[data-testid="dataset-item-${datasetName}"]`);
      await page.click('[data-testid="add-data-row-button"]');

      // 输入数据
      await page.fill('[data-testid="data-cell-0-0"]', 'export_test');
      await page.click('[data-testid="save-dataset-button"]');
      await page.waitForTimeout(1000);

      // 设置下载监听
      const downloadPromise = page.waitForEvent('download');

      // 点击导出按钮
      await page.click('[data-testid="export-csv-button"]');

      // 等待下载完成
      const download = await downloadPromise;

      // 验证文件名
      expect(download.suggestedFilename()).toContain(datasetName);
      expect(download.suggestedFilename()).toContain('.csv');
    });

    test('导出的CSV应该包含所有数据', async ({ page }) => {
      const datasetName = `FullExportDataset_${Date.now()}`;

      // 创建数据集并添加多行数据
      await page.click('[data-testid="create-dataset-button"]');
      await page.fill('[data-testid="dataset-name-input"]', datasetName);
      await page.click('[data-testid="confirm-create-dataset"]');
      await page.waitForTimeout(1000);

      await page.click(`[data-testid="dataset-item-${datasetName}"]`);

      // 添加3行数据
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="add-data-row-button"]');
        await page.fill(`[data-testid="data-cell-${i}-0"]`, `row_${i}`);
      }

      await page.click('[data-testid="save-dataset-button"]');
      await page.waitForTimeout(1000);

      // 导出CSV
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-csv-button"]');
      const download = await downloadPromise;

      // 读取并验证CSV内容
      const content = await download.createReadStream();
      const csvText = await streamToString(content);

      expect(csvText).toContain('row_0');
      expect(csvText).toContain('row_1');
      expect(csvText).toContain('row_2');
    });
  });

  test.describe('数据集管理', () => {
    test('应该成功编辑数据集名称', async ({ page }) => {
      const datasetName = `RenameDataset_${Date.now()}`;
      const newName = `${datasetName}_renamed`;

      // 创建数据集
      await page.click('[data-testid="create-dataset-button"]');
      await page.fill('[data-testid="dataset-name-input"]', datasetName);
      await page.click('[data-testid="confirm-create-dataset"]');
      await page.waitForTimeout(1000);

      // 右键点击数据集
      const datasetItem = page.locator(`[data-testid="dataset-item-${datasetName}"]`);
      await datasetItem.click({ button: 'right' });

      // 点击重命名
      await page.click('[data-testid="rename-dataset-menu-item"]');

      // 输入新名称
      await page.fill('[data-testid="dataset-name-input"]', newName);
      await page.click('[data-testid="confirm-rename-dataset"]');

      // 验证重命名成功
      const renamedItem = page.locator(`[data-testid="dataset-item-${newName}"]`);
      await expect(renamedItem).toBeVisible();
    });

    test('应该成功删除数据集', async ({ page }) => {
      const datasetName = `DeleteDataset_${Date.now()}`;

      // 创建数据集
      await page.click('[data-testid="create-dataset-button"]');
      await page.fill('[data-testid="dataset-name-input"]', datasetName);
      await page.click('[data-testid="confirm-create-dataset"]');
      await page.waitForTimeout(1000);

      // 右键点击数据集
      const datasetItem = page.locator(`[data-testid="dataset-item-${datasetName}"]`);
      await datasetItem.click({ button: 'right' });

      // 点击删除
      await page.click('[data-testid="delete-dataset-menu-item"]');

      // 确认删除
      await page.click('[data-testid="confirm-delete-dataset"]');

      // 验证删除成功
      await expect(datasetItem).not.toBeVisible();

      const toast = page.locator('[data-testid="toast-success"]');
      await expect(toast).toContainText('删除成功');
    });

    test('应该显示数据集详情', async ({ page }) => {
      const datasetName = `DetailDataset_${Date.now()}`;

      // 创建数据集
      await page.click('[data-testid="create-dataset-button"]');
      await page.fill('[data-testid="dataset-name-input"]', datasetName);
      await page.click('[data-testid="confirm-create-dataset"]');
      await page.waitForTimeout(1000);

      // 选择数据集
      await page.click(`[data-testid="dataset-item-${datasetName}"]`);

      // 验证数据集详情显示
      const datasetDetail = page.locator('[data-testid="dataset-detail-panel"]');
      await expect(datasetDetail).toBeVisible();

      // 验证数据集名称显示
      await expect(datasetDetail).toContainText(datasetName);

      // 验证数据统计信息
      const rowCount = page.locator('[data-testid="dataset-row-count"]');
      await expect(rowCount).toBeVisible();
    });
  });

  test.describe('数据集在场景调试中的使用', () => {
    test('应该在调试面板中显示数据集选择器', async ({ page }) => {
      const datasetName = `DebugDataset_${Date.now()}`;

      // 创建数据集
      await page.click('[data-testid="create-dataset-button"]');
      await page.fill('[data-testid="dataset-name-input"]', datasetName);
      await page.click('[data-testid="confirm-create-dataset"]');
      await page.waitForTimeout(1000);

      // 打开调试面板
      await page.click('[data-testid="debug-panel-button"]');

      // 验证数据集选择器存在
      const datasetSelector = page.locator('[data-testid="debug-dataset-selector"]');
      await expect(datasetSelector).toBeVisible();

      // 验证刚创建的数据集在选项中
      await expect(datasetSelector).toContainText(datasetName);
    });

    test('应该能在场景调试时使用数据集', async ({ page }) => {
      const datasetName = `DebugRunDataset_${Date.now()}`;

      // 创建数据集并添加数据
      await page.click('[data-testid="create-dataset-button"]');
      await page.fill('[data-testid="dataset-name-input"]', datasetName);
      await page.click('[data-testid="confirm-create-dataset"]');
      await page.waitForTimeout(1000);

      await page.click(`[data-testid="dataset-item-${datasetName}"]`);
      await page.click('[data-testid="add-data-row-button"]');
      await page.fill('[data-testid="data-cell-0-0"]', 'test_value');
      await page.click('[data-testid="save-dataset-button"]');
      await page.waitForTimeout(1000);

      // 添加一个API节点到画布
      // (这里需要根据实际的节点添加逻辑调整)
      await page.click('[data-testid="node-api"]');
      await page.mouse.click(400, 300);

      // 打开调试面板并选择数据集
      await page.click('[data-testid="debug-panel-button"]');
      await page.selectOption('[data-testid="debug-dataset-selector"]', datasetName);

      // 点击运行
      await page.click('[data-testid="debug-run-button"]');

      // 验证执行结果
      const executionResult = page.locator('[data-testid="execution-result"]');
      await expect(executionResult).toBeVisible({ timeout: 15000 });
    });
  });
});

// 辅助函数：将流转换为字符串
async function streamToString(stream: any): Promise<string> {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}
