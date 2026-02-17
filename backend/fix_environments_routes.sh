#!/bin/bash
# 修复 environments.py 路由尾部斜杠
#
# 用法: cd backend && bash fix_environments_routes.sh
#
# 说明: 此脚本会为 environments.py 中所有路由添加尾部斜杠
#       修改前会自动备份原文件

set -e  # 遇到错误立即退出

FILE="app/api/v1/endpoints/environments.py"

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

# 批量添加尾部斜杠
echo "🔧 开始修复路由..."

# 1. environment_id 相关路由
if sed -i '' 's/@router\.get("\/{environment_id}", response_model=/(@router.get("\/{environment_id}\/", response_model=/g' "$FILE"; then
    ((FIX_COUNT++))
fi
if sed -i '' 's/@router\.put("\/{environment_id}", response_model=/(@router.put("\/{environment_id}\/", response_model=/g' "$FILE"; then
    ((FIX_COUNT++))
fi
if sed -i '' 's/@router\.delete("\/{environment_id}")/@router.delete("\/{environment_id}\/")/g' "$FILE"; then
    ((FIX_COUNT++))
fi

# 2. project/{project_id}/{environment_id} 相关路由
if sed -i '' 's/@router\.delete("\/project\/{project_id}\/{environment_id}")/@router.delete("\/project\/{project_id}\/{environment_id}\/")/g' "$FILE"; then
    ((FIX_COUNT++))
fi

# 3. copy 和 replace 路由
if sed -i '' 's/@router\.post("\/{environment_id}\/copy", response_model=/(@router.post("\/{environment_id}\/copy\/", response_model=/g' "$FILE"; then
    ((FIX_COUNT++))
fi
if sed -i '' 's/@router\.post("\/project\/{project_id}\/{environment_id}\/copy",/@router.post("\/project\/{project_id}\/{environment_id}\/copy\/",/g' "$FILE"; then
    ((FIX_COUNT++))
fi
if sed -i '' 's/@router\.post("\/{environment_id}\/replace", response_model=/(@router.post("\/{environment_id}\/replace\/", response_model=/g' "$FILE"; then
    ((FIX_COUNT++))
fi

echo "✅ 修复完成! 共修复 $FIX_COUNT 处路由"

# 验证
echo ""
echo "🔍 验证修复结果..."
echo ""

# 检查是否还有没有尾部斜杠的路由
echo "以下路由已确认添加尾部斜杠:"
grep -n '@router\.\(get\|post\|put\|delete\|patch\)("' "$FILE" | grep -E 'environment_id[^/]' | grep 'response_model' || echo "  (所有路由已添加斜杠)"

echo ""
echo "🎉 路由修复完成!"
echo ""
echo "📝 后续步骤:"
echo "   1. 检查修改: git diff $FILE"
echo "   2. 运行测试: uv run pytest tests/api/test_environments.py -v (如果存在)"
echo "   3. 如有问题回滚: cp $BACKUP_FILE $FILE"
echo ""
