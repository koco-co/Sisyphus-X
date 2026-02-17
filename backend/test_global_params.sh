#!/bin/bash

# 测试全局参数 API
BASE_URL="http://localhost:8000/api/v1"

echo "================================================================================"
echo "测试全局参数 API"
echo "================================================================================"

# 测试代码
TEST_CODE='class StringUtils:
    """字符串工具类"""

    @staticmethod
    def generate_random_string(length: int) -> str:
        """生成随机字符串

        :param length: 生成字符串的长度
        :type length: int
        :return: 随机字符串
        :rtype: str
        """
        import random
        import string
        return '"'"''".join(random.choices(string.ascii_letters + string.digits, k=length))'

# 1. 测试创建全局参数
echo ""
echo "1. 测试创建全局参数"
echo "--------------------------------------------------------------------------------"

RESPONSE=$(curl -s -X POST "$BASE_URL/global-params/" \
  -H "Content-Type: application/json" \
  -d "{\"code\": $TEST_CODE}")

echo "$RESPONSE" | python3 -m json.tool

PARAM_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ -n "$PARAM_ID" ]; then
  echo "✅ 创建成功！ID: $PARAM_ID"
else
  echo "❌ 创建失败"
  exit 1
fi

# 2. 测试获取全局参数列表
echo ""
echo "2. 测试获取全局参数列表"
echo "--------------------------------------------------------------------------------"

RESPONSE=$(curl -s "$BASE_URL/global-params/")
echo "$RESPONSE" | python3 -m json.tool

TOTAL=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['total'])" 2>/dev/null)
echo "✅ 获取成功！总数: $TOTAL"

# 3. 测试按类名获取全局参数
echo ""
echo "3. 测试按类名获取全局参数"
echo "--------------------------------------------------------------------------------"

RESPONSE=$(curl -s "$BASE_URL/global-params/by-class/StringUtils")
echo "$RESPONSE" | python3 -m json.tool

echo "✅ 获取成功！"

# 4. 测试获取全局参数详情
echo ""
echo "4. 测试获取全局参数详情"
echo "--------------------------------------------------------------------------------"

RESPONSE=$(curl -s "$BASE_URL/global-params/$PARAM_ID")
echo "$RESPONSE" | python3 -m json.tool

CLASS_NAME=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['class_name'])" 2>/dev/null)
METHOD_NAME=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['method_name'])" 2>/dev/null)

echo "✅ 获取成功！$CLASS_NAME.$METHOD_NAME"

# 5. 测试更新全局参数
echo ""
echo "5. 测试更新全局参数"
echo "--------------------------------------------------------------------------------"

RESPONSE=$(curl -s -X PUT "$BASE_URL/global-params/$PARAM_ID" \
  -H "Content-Type: application/json" \
  -d '{"description": "更新后的描述"}')

echo "$RESPONSE" | python3 -m json.tool

echo "✅ 更新成功！"

# 6. 测试删除全局参数
echo ""
echo "6. 测试删除全局参数"
echo "--------------------------------------------------------------------------------"

RESPONSE=$(curl -s -X DELETE "$BASE_URL/global-params/$PARAM_ID" -w "\n%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "204" ]; then
  echo "✅ 删除成功！"
else
  echo "❌ 删除失败，HTTP 状态码: $HTTP_CODE"
fi

echo ""
echo "================================================================================"
echo "✅ 所有测试完成"
echo "================================================================================"
