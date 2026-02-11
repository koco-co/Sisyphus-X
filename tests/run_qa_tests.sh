#!/bin/bash
# QA 测试执行脚本

set -e

echo "=========================================="
echo "接口管理模块重构 - QA 测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

cd /Users/poco/Documents/Projects/Sisyphus-X/backend

echo -e "${YELLOW}1. 运行 cURL 解析器单元测试${NC}"
uv run pytest ../tests/unit/backend/services/test_curl_parser.py -v --tb=short

echo ""
echo -e "${YELLOW}2. 运行变量替换引擎单元测试${NC}"
uv run pytest ../tests/unit/backend/services/test_variable_replacer.py -v --tb=short

echo ""
echo -e "${YELLOW}3. 运行所有服务单元测试${NC}"
uv run pytest ../tests/unit/backend/services/ -v --tb=short

echo ""
echo -e "${GREEN}=========================================="
echo "单元测试完成！"
echo "==========================================${NC}"
echo ""
echo "测试报告: docs/interface-refactor/05_QA测试报告.md"
echo ""
echo -e "${YELLOW}下一步建议:${NC}"
echo "1. 运行集成测试 (需要数据库)"
echo "2. 检查测试覆盖率 (安装 pytest-cov)"
echo "3. 运行 E2E 测试 (使用 Playwright)"
