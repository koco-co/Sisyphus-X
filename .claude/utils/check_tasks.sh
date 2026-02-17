#!/bin/bash
# ============================================================
# check_tasks.sh — 任务规划状态检查脚本
# 用途：查询 docs/任务规划.json 中未关闭的任务
# 输出：前 5 个非「已关闭」的任务信息（按 assigned 分组）
# 退出码：0 = 全部已关闭，1 = 存在未关闭任务
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TASK_FILE="$PROJECT_ROOT/docs/任务规划.json"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 检查文件是否存在
if [ ! -f "$TASK_FILE" ]; then
  echo -e "${RED}❌ 错误：找不到任务规划文件 $TASK_FILE${NC}"
  exit 2
fi

# 检查 jq 是否可用
if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ 错误：需要安装 jq（brew install jq）${NC}"
  exit 2
fi

echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo -e "${BOLD}  📋 任务规划状态检查${NC}"
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo ""

# 统计总数
TOTAL=$(jq '.tasks | length' "$TASK_FILE")
CLOSED=$(jq '[.tasks[] | select(.status == "已关闭")] | length' "$TASK_FILE")
UNCLOSED=$((TOTAL - CLOSED))

echo -e "  总任务数：${BOLD}$TOTAL${NC}"
echo -e "  已关闭：  ${GREEN}$CLOSED${NC}"
echo -e "  未关闭：  ${RED}$UNCLOSED${NC}"
echo ""

# 如果全部已关闭
if [ "$UNCLOSED" -eq 0 ]; then
  echo -e "${GREEN}✅ 所有任务已关闭，可以交付！${NC}"
  echo ""
  exit 0
fi

# 获取前 5 个未关闭任务
echo -e "${YELLOW}⚠️  存在 $UNCLOSED 个未关闭任务，以下为前 5 个：${NC}"
echo -e "${BOLD}───────────────────────────────────────────${NC}"
echo ""

jq -r '
  [.tasks[] | select(.status != "已关闭")] | .[0:5] | .[] |
  "  \(.id) | \(.status) | \(.assigned)\n  └─ \(.description)" +
  (if (.reason // "") != "" then "\n  └─ 原因: \(.reason)" else "" end) + "\n"
' "$TASK_FILE"

# 按 assigned 分组统计未关闭任务
echo -e "${BOLD}───────────────────────────────────────────${NC}"
echo -e "${CYAN}  📊 未关闭任务按成员分布：${NC}"
echo ""

jq -r '
  [.tasks[] | select(.status != "已关闭")] |
  group_by(.assigned) | .[] |
  "  \(.[0].assigned): \(length) 个任务"
' "$TASK_FILE"

echo ""
echo -e "${RED}❌ 任务未全部关闭，不可交付${NC}"
echo ""
exit 1
