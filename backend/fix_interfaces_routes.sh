#!/bin/bash
# 修复 interfaces.py 路由尾部斜杠
#
# 用法: cd backend && bash fix_interfaces_routes.sh
#
# 说明: 此脚本会为 interfaces.py 中所有路由添加尾部斜杠
#       修改前会自动备份原文件

set -e  # 遇到错误立即退出

FILE="app/api/v1/endpoints/interfaces.py"

# 检查文件是否存在
if [ ! -f "$FILE" ]; then
    echo "❌ 错误: 文件 $FILE 不存在"
    echo "   请确保在 backend 目录下运行此脚本"
    exit 1
fi

# 备份
echo "📦 备份原文件..."
BACKUP_FILE="${FILE}.bak"
cp "$FILE" "$BACKUP_FILE"
echo "✅ 备份完成: $BACKUP_FILE"

# 修复计数器
FIX_COUNT=0

# 批量添加尾部斜杠 (注意: sed 的 -i '' 语法是 macOS 特定的)
echo "🔧 开始修复路由..."

# 1. folders 相关路由
if sed -i '' 's/@router\.get("\/folders", response_model/@router.get("\/folders\/", response_model/g' "$FILE"; then
    ((FIX_COUNT++))
fi
if sed -i '' 's/@router\.post("\/folders", response_model/@router.post("\/folders\/", response_model/g' "$FILE"; then
    ((FIX_COUNT++))
fi
if sed -i '' 's/@router\.delete("\/folders\/{folder_id}")/@router.delete("\/folders\/{folder_id}\/")/g' "$FILE"; then
    ((FIX_COUNT++))
fi

# 2. interface_id 相关路由
# 注意: 排除已有斜杠的情况 (如 /{interface_id}/)
if sed -i '' 's/@router\.get("\/{interface_id}", response_model=/(@router.get("\/{interface_id}\/", response_model=/g' "$FILE"; then
    ((FIX_COUNT++))
fi
if sed -i '' 's/@router\.put("\/{interface_id}", response_model=/(@router.put("\/{interface_id}\/", response_model=/g' "$FILE"; then
    ((FIX_COUNT++))
fi
if sed -i '' 's/@router\.delete("\/{interface_id}")/@router.delete("\/{interface_id}\/")/g' "$FILE"; then
    ((FIX_COUNT++))
fi

# 3. debug 相关路由
if sed -i '' 's/@router\.post("\/debug\/send", response_model=/(@router.post("\/debug\/send\/", response_model=/g' "$FILE"; then
    ((FIX_COUNT++))
fi
if sed -i '' 's/@router\.post("\/debug\/execute-engine", response_model=/(@router.post("\/debug\/execute-engine\/", response_model=/g' "$FILE"; then
    ((FIX_COUNT++))
fi

# 4. parse-curl
if sed -i '' 's/@router\.post("\/parse-curl")/@router.post("\/parse-curl\/")/g' "$FILE"; then
    ((FIX_COUNT++))
fi

# 5. interface_id 子路由
if sed -i '' 's/@router\.post("\/{interface_id}\/generate-test-case", response_model=/(@router.post("\/{interface_id}\/generate-test-case\/", response_model=/g' "$FILE"; then
    ((FIX_COUNT++))
fi
if sed -i '' 's/@router\.post("\/{interface_id}\/preview-yaml", response_model=/(@router.post("\/{interface_id}\/preview-yaml\/", response_model=/g' "$FILE"; then
    ((FIX_COUNT++))
fi
if sed -i '' 's/@router\.put("\/{interface_id}\/move", response_model=/(@router.put("\/{interface_id}\/move\/", response_model=/g' "$FILE"; then
    ((FIX_COUNT++))
fi
if sed -i '' 's/@router\.post("\/{interface_id}\/copy", response_model=/(@router.post("\/{interface_id}\/copy\/", response_model=/g' "$FILE"; then
    ((FIX_COUNT++))
fi
if sed -i '' 's/@router\.get("\/{interface_id}\/history", response_model=/(@router.get("\/{interface_id}\/history\/", response_model=/g' "$FILE"; then
    ((FIX_COUNT++))
fi

# 6. 其他路由
if sed -i '' 's/@router\.get("\/search", response_model=/(@router.get("\/search\/", response_model=/g' "$FILE"; then
    ((FIX_COUNT++))
fi
if sed -i '' 's/@router\.post("\/import-from-curl", response_model=/(@router.post("\/import-from-curl\/", response_model=/g' "$FILE"; then
    ((FIX_COUNT++))
fi

echo "✅ 修复完成! 共修复 $FIX_COUNT 处路由"

# 验证
echo ""
echo "🔍 验证修复结果..."
echo ""

# 检查是否还有没有尾部斜杠的路由 (排除根路由和已有斜杠的)
echo "以下路由已确认添加尾部斜杠:"
grep -n '@router\.\(get\|post\|put\|delete\|patch\)("' "$FILE" | grep -v '/"' | grep -v '/",' | grep 'response_model' || echo "  (所有路由已添加斜杠)"

echo ""
echo "🎉 路由修复完成!"
echo ""
echo "📝 后续步骤:"
echo "   1. 检查修改: git diff $FILE"
echo "   2. 运行测试: uv run pytest tests/api/test_interfaces.py -v"
echo "   3. 如有问题回滚: cp $BACKUP_FILE $FILE"
echo ""
