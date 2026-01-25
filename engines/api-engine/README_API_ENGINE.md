## 输入协议模版 (`case.yaml`)

这份 YAML 设计充分考虑了 HTTP 请求的各种形态、数据库操作、变量提取与断言逻辑。

```yaml
# ==============================================================================
# 适用引擎: api-engine
# 描述: 用于驱动核心执行器运行自动化测试任务的标准格式
# ==============================================================================

config:
  # [必填] 用例/场景名称
  name: "电商下单全流程验证_V1.0"
  
  # [可选] 基础 URL, 步骤中的 url 如果是相对路径, 将会自动拼接此地址
  base_url: "https://api.example.com"
  
  # [可选] 全局配置: 超时时间(秒), 重试次数
  timeout: 10
  retries: 0
  
  # [可选] 全局变量定义 (静态变量)
  # 引用方式: 在后续步骤中使用 ${variable_name}
  variables:
    env_tag: "test"
    db_alias: "master_db"  # 数据库连接别名, 对应后端配置
    default_sku: "SKU_123456"

teststeps:
  # ============================================================================
  # 场景 1: 数据库预处理 (SQL 操作)
  # ============================================================================
  - name: "前置: 清理测试数据"
    id: "step_01"
    type: "database" # 枚举: [api, database, wait, script]
    connection: "${db_alias}" # 引用配置好的数据库连接
    sql_type: "mysql" # 枚举: [mysql, postgresql, oracle, sqlserver]
    command: "execute" # 枚举: [execute, query] -> execute用于增删改, query用于查
    sql: "DELETE FROM orders WHERE user_id = 10086 AND status = 'PENDING';"
    # 数据库操作也可以有断言 (例如确保删除成功)
    validate: []

  # ============================================================================
  # 场景 2: 标准 POST 请求 (JSON Body) + 变量提取
  # ============================================================================
  - name: "API: 用户登录"
    id: "step_02"
    type: "api"
    request:
      method: "POST" # 枚举: [GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS]
      url: "/auth/login"
      headers:
        Content-Type: "application/json"
        User-Agent: "QuantumTest-Agent/1.0"
      
      # 请求体模式: json
      json:
        username: "test_user_01"
        password: "password123"
    
    # [变量提取]
    # 格式: 变量名: "提取表达式"
    # 支持: jsonpath (推荐), regex (正则)
    extract:
      access_token: "body.data.token"      # 从响应体JSON中提取
      user_uid: "body.data.user_info.uid"  # 提取嵌套字段
      server_time: "headers.Date"          # 从响应头提取

    # [断言验证]
    # 格式: - {比较器: [实际值(表达式), 预期值]}
    validate:
      - eq: ["status_code", 200]           # 状态码等于 200
      - eq: ["body.code", 0]               # 业务码等于 0
      - eq: ["body.msg", "success"]        # 消息等于 success
      - len_gt: ["body.data.token", 10]    # token长度大于 10

  # ============================================================================
  # 场景 3: 引用变量 + URL Params + 复杂断言
  # ============================================================================
  - name: "API: 查询商品详情"
    id: "step_03"
    type: "api"
    request:
      method: "GET"
      # 引用上一步提取的 token
      headers:
        Authorization: "Bearer ${access_token}"
      url: "/products/detail"
      # URL 参数: /products/detail?sku_id=SKU_123456&region=cn
      params:
        sku_id: "${default_sku}"
        region: "cn"

    validate:
      - eq: ["status_code", 200]
      - contains: ["body.data.tags", "hot"] # 列表包含某个值
      # 数据库断言: 验证接口返回的价格与数据库一致
      # db_query(sql_statement) 是内置函数
      - eq: ["body.data.price", "${db_query(SELECT price FROM product WHERE sku = '${default_sku}')}"]

  # ============================================================================
  # 场景 4: 文件上传 (Multipart/Form-data)
  # ============================================================================
  - name: "API: 上传头像"
    id: "step_04"
    type: "api"
    request:
      method: "POST"
      url: "/user/avatar"
      headers:
        Authorization: "Bearer ${access_token}"
      
      # 请求体模式: upload
      # 注意: 核心执行器会自动处理 Content-Type 的 boundary
      upload:
        file: "test_data/avatar.jpg" # 文件路径(相对路径或MinIO临时地址)
        type: "avatar"               # 其他 form 字段

    validate:
      - eq: ["status_code", 200]

  # ============================================================================
  # 场景 5: 表单提交 (x-www-form-urlencoded)
  # ============================================================================
  - name: "API: 更新个人简介"
    id: "step_05"
    type: "api"
    request:
      method: "POST"
      url: "/user/profile"
      headers:
        Content-Type: "application/x-www-form-urlencoded"
        Authorization: "Bearer ${access_token}"
      
      # 请求体模式: data
      data:
        nickname: "Quantum User"
        bio: "Automated testing is cool"

    validate:
      - eq: ["status_code", 200]

```

### 补充：YAML 中使用的枚举与断言参考表

请提供给 AI 作为 `Prompt` 的补充知识库：

**1. 比较器 (Comparators) 枚举:**

* `eq`: 等于 (Equal)
* `ne`: 不等于 (Not Equal)
* `gt`: 大于 (Greater Than)
* `ge`: 大于等于 (Greater or Equal)
* `lt`: 小于 (Less Than)
* `le`: 小于等于 (Less or Equal)
* `contains`: 包含 (用于字符串或列表)
* `not_contains`: 不包含
* `len_eq`: 长度等于
* `len_gt`: 长度大于
* `startswith`: 以...开头
* `endswith`: 以...结尾

**2. 提取目标 (Extract Targets):**

* `status_code`: HTTP 状态码
* `body`: 响应体 (自动解析 JSON)
* `headers`: 响应头
* `cookies`: 响应 Cookies
* `elapsed`: 耗时 (秒)

---



## 输出协议模版 (`result.json`)

当 `api-engine` 执行完 YAML 后，必须输出以下标准格式的 JSON 报告。前端（React + Recharts）将直接读取此 JSON 渲染报表。

```json
{
  "summary": {
    "task_name": "电商下单全流程验证_V1.0",
    "status": "failed", // 枚举: [success, failed, error]
    "start_time": "2026-01-24T10:00:00Z",
    "duration": 1.25, // 总耗时(秒)
    "stat": {
      "total": 5,
      "success": 4,
      "failed": 1,
      "skipped": 0,
      "error": 0
    },
    "env": {
      "base_url": "https://api.example.com",
      "server": "linux-docker-node-01"
    }
  },
  "details": [
    {
      "id": "step_01",
      "name": "前置: 清理测试数据",
      "type": "database",
      "status": "success",
      "start_time": "2026-01-24T10:00:00.100Z",
      "duration": 0.05,
      "attachment": "affected rows: 1", // 数据库操作结果
      "variables_mapping": {} // 此步骤提取或生成的变量
    },
    {
      "id": "step_02",
      "name": "API: 用户登录",
      "type": "api",
      "status": "success",
      "start_time": "2026-01-24T10:00:00.155Z",
      "duration": 0.2,
      
      // 请求详情 (用于前端展示“请求信息”)
      "request": {
        "url": "https://api.example.com/auth/login",
        "method": "POST",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "username": "test_user_01",
          "password": "***" // 敏感字段自动脱敏
        }
      },
      
      // 响应详情 (用于前端展示“响应信息”)
      "response": {
        "status_code": 200,
        "headers": {
          "Date": "Sat, 24 Jan 2026 10:00:00 GMT"
        },
        "body": {
          "code": 0,
          "msg": "success",
          "data": { "token": "eyJhbG...", "uid": 10086 }
        }
      },
      
      // 变量提取结果
      "extract_result": {
        "access_token": "eyJhbG...",
        "user_uid": 10086
      },
      
      // 断言结果列表
      "validate_result": [
        { "check": "status_code", "expect": 200, "actual": 200, "result": "pass" },
        { "check": "body.code", "expect": 0, "actual": 0, "result": "pass" }
      ]
    },
    {
      "id": "step_03",
      "name": "API: 查询商品详情",
      "type": "api",
      "status": "failed", // 此步骤失败
      "start_time": "2026-01-24T10:00:00.360Z",
      "duration": 0.1,
      "request": {
        "url": "https://api.example.com/products/detail?sku_id=SKU_123456...",
        "method": "GET"
      },
      "response": {
        "status_code": 200,
        "body": {
          "code": 0,
          "data": { "price": 99.00, "tags": ["new"] } // 缺少 'hot' 标签
        }
      },
      "validate_result": [
        { "check": "status_code", "expect": 200, "actual": 200, "result": "pass" },
        { 
          "check": "body.data.tags contains 'hot'", 
          "expect": "hot", 
          "actual": ["new"], 
          "result": "fail", 
          "error_msg": "AssertionError: Expected ['new'] to contain 'hot'" 
        }
      ],
      "logs": "Traceback (most recent call last)..." // 错误堆栈
    }
  ]
}

```
