#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000/api/v1}"
OUTPUT_DIR="${OUTPUT_DIR:-tmp/acceptance-data}"
STAMP="${STAMP:-$(date +%Y%m%d%H%M%S)}"
PROJECT_NAME="${PROJECT_NAME:-验收项目-${STAMP}}"

mkdir -p "$OUTPUT_DIR"

post_json() {
  local url="$1"
  local payload="$2"
  curl -sS -X POST "$url" -H 'Content-Type: application/json' -d "$payload"
}

PROJECT_JSON=$(post_json "$BASE_URL/projects/" "{\"name\":\"$PROJECT_NAME\",\"description\":\"完整性验收自动创建\"}")
printf '%s' "$PROJECT_JSON" > "$OUTPUT_DIR/project.json"
PROJECT_ID=$(jq -r '.id' "$OUTPUT_DIR/project.json")

ENV_JSON=$(post_json "$BASE_URL/projects/$PROJECT_ID/environments/" '{"name":"验收环境","domain":"https://httpbin.org","variables":{"token":"demo-token"},"headers":{"X-Acceptance":"yes"},"is_preupload":false}')
printf '%s' "$ENV_JSON" > "$OUTPUT_DIR/environment.json"

DB_JSON=$(post_json "$BASE_URL/projects/$PROJECT_ID/databases" '{"name":"验收MySQL","variable_name":"acceptance_db","db_type":"mysql","host":"127.0.0.1","port":3306,"db_name":"mysql","username":"root","password":"root","is_enabled":true}')
printf '%s' "$DB_JSON" > "$OUTPUT_DIR/database.json"

KEYWORD_ID=$(python3 - <<'PY'
import uuid
print(uuid.uuid4())
PY
)
KEYWORD_CLASS_NAME="AcceptanceKeyword${STAMP}"
KEYWORD_METHOD_NAME="mark_success_${STAMP}"
KEYWORD_PAYLOAD=$(cat <<JSON
{"id":"$KEYWORD_ID","project_id":"$PROJECT_ID","name":"验收关键字","class_name":"$KEYWORD_CLASS_NAME","method_name":"$KEYWORD_METHOD_NAME","description":"完整性验收关键字","code":"def $KEYWORD_METHOD_NAME():\n    return {'ok': True, 'message': 'acceptance'}","parameters":"[]","return_type":"dict","is_built_in":false,"is_enabled":true}
JSON
)
KEYWORD_JSON=$(post_json "$BASE_URL/keywords/" "$KEYWORD_PAYLOAD")
printf '%s' "$KEYWORD_JSON" > "$OUTPUT_DIR/keyword.json"

INTERFACE_PAYLOAD=$(cat <<JSON
{"name":"验收健康检查接口","url":"/health","method":"GET","status":"stable","description":"调用后端健康检查接口","headers":{},"params":{},"body":null,"body_type":"json","cookies":{},"auth_config":{},"project_id":"$PROJECT_ID","folder_id":null,"order":0}
JSON
)
INTERFACE_JSON=$(post_json "$BASE_URL/interfaces/" "$INTERFACE_PAYLOAD")
printf '%s' "$INTERFACE_JSON" > "$OUTPUT_DIR/interface.json"

SCENARIO_PAYLOAD=$(cat <<JSON
{"name":"验收健康检查场景","description":"完整性验收场景","priority":"P1","tags":["验收","回归"],"variables":{},"project_id":"$PROJECT_ID"}
JSON
)
SCENARIO_JSON=$(post_json "$BASE_URL/scenarios/" "$SCENARIO_PAYLOAD")
printf '%s' "$SCENARIO_JSON" > "$OUTPUT_DIR/scenario.json"
SCENARIO_ID=$(jq -r '.id' "$OUTPUT_DIR/scenario.json")

STEP_PAYLOAD='{"description":"调用后端健康检查","keyword_type":"request","keyword_name":"http_request","parameters":{"method":"GET","url":"http://localhost:8000/health","validate":[{"target":"status_code","comparator":"eq","expected":200}]},"sort_order":0}'
STEP_JSON=$(post_json "$BASE_URL/scenarios/$SCENARIO_ID/steps" "$STEP_PAYLOAD")
printf '%s' "$STEP_JSON" > "$OUTPUT_DIR/scenario-step.json"

PLAN_PAYLOAD=$(cat <<JSON
{"name":"验收计划","project_id":"$PROJECT_ID","description":"完整性验收计划","status":"active"}
JSON
)
PLAN_JSON=$(post_json "$BASE_URL/plans/" "$PLAN_PAYLOAD")
printf '%s' "$PLAN_JSON" > "$OUTPUT_DIR/plan.json"
PLAN_ID=$(jq -r '.id' "$OUTPUT_DIR/plan.json")

PLAN_SCENARIO_PAYLOAD=$(cat <<JSON
{"scenario_id":"$SCENARIO_ID","execution_order":0}
JSON
)
PLAN_SCENARIO_JSON=$(post_json "$BASE_URL/plans/$PLAN_ID/scenarios" "$PLAN_SCENARIO_PAYLOAD")
printf '%s' "$PLAN_SCENARIO_JSON" > "$OUTPUT_DIR/plan-scenario.json"

cat <<SUMMARY
初始化完成：
- 项目: $PROJECT_ID
- 环境: $(jq -r '.id' "$OUTPUT_DIR/environment.json")
- 数据库: $(jq -r '.id' "$OUTPUT_DIR/database.json")
- 关键字: $(jq -r '.id' "$OUTPUT_DIR/keyword.json")
- 接口: $(jq -r '.id' "$OUTPUT_DIR/interface.json")
- 场景: $SCENARIO_ID
- 计划: $PLAN_ID
输出目录: $OUTPUT_DIR
SUMMARY
