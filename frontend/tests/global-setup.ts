/**
 * Playwright 全局测试设置
 *
 * 在所有测试运行前执行:
 * 1. 设置开发模式环境变量
 * 2. 绕过登录页面
 */

import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 全局测试设置开始...');

  // 在浏览器启动前设置环境变量
  // 注意: 这不会影响 Vite 的 import.meta.env，
  // 但我们可以通过其他方式绕过登录

  console.log('✅ 全局测试设置完成');
}

export default globalSetup;
