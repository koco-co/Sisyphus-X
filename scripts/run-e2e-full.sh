#!/bin/bash

# E2E 全流程测试运行脚本
# 使用方法: ./scripts/run-e2e-full.sh

set -e

echo "=========================================="
echo "  E2E 全流程自动化测试"
echo "=========================================="

# 生成唯一运行 ID
export TEST_RUN_ID=$(date +%Y%m%d%H%M%S)
echo "Test Run ID: $TEST_RUN_ID"

# 清理旧状态文件
echo "Cleaning up old state files..."
rm -f .test-state/test-state-*.json
rm -f .test-state/auth-*.json

# 确保状态目录存在
mkdir -p .test-state
mkdir -p test-results/screenshots

# 运行测试
echo ""
echo "Running E2E tests..."
echo ""

npx playwright test tests/auto/e2e/flows/ tests/auto/e2e/full-flow.spec.ts \
  --project=chromium \
  --reporter=list \
  --timeout=60000

EXIT_CODE=$?

echo ""
echo "=========================================="
if [ $EXIT_CODE -eq 0 ]; then
  echo "  ✅ All tests passed!"
else
  echo "  ❌ Some tests failed. Exit code: $EXIT_CODE"
fi
echo "=========================================="
echo "Test Run ID: $TEST_RUN_ID"
echo "State files: .test-state/"
echo "Screenshots: test-results/screenshots/"
echo ""

exit $EXIT_CODE
