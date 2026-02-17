#!/bin/bash
# 测试场景调试接口的简单脚本
# 用于验证 TASK-022 的实现

BASE_URL="http://localhost:8000/api/v1"

echo "========================================="
echo "测试场景调试接口 (TASK-022)"
echo "========================================="
echo ""

# 1. 测试调试不存在的场景（预期：404）
echo "1. 测试调试不存在的场景（预期 404）..."
curl -s -X POST "${BASE_URL}/scenarios/non-existent-id/debug" \
  -H "Content-Type: application/json" \
  -d '{"variables": {"test": "value"}}' | jq '.'
echo ""
echo ""

# 2. 测试调试空场景（需要先创建场景）
echo "2. 测试调试场景（需要先有场景数据）..."
echo "   注意：此测试需要先创建场景和步骤才能成功"
echo ""

# 3. 检查接口文档
echo "3. 检查调试接口是否在 API 文档中..."
curl -s "${BASE_URL}/../docs" | grep -q "debug" && echo "✅ 调试接口已在文档中" || echo "❌ 调试接口未在文档中"
echo ""

echo "========================================="
echo "测试完成"
echo "========================================="
echo ""
echo "手动测试步骤："
echo "1. 启动后端: cd backend && uv run uvicorn app.main:app --reload"
echo "2. 创建场景: POST ${BASE_URL}/scenarios/"
echo "3. 添加步骤: POST ${BASE_URL}/scenarios/{id}/steps"
echo "4. 调试场景: POST ${BASE_URL}/scenarios/{id}/debug"
echo ""
echo "API 文档: http://localhost:8000/docs"
