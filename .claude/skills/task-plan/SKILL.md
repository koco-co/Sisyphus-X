---
name: task-plan
description: "生成任务规划.json 状态机文件。仅由架构师(@architect)在完成接口定义文档和数据库设计文档后调用。将需求拆分为最小粒度任务，预指派成员，生成符合禅道状态流转模型的 JSON 文件。"
---

# 任务规划 JSON 生成器（Task Plan Generator）

## 前置条件

> ⚠️ 调用此 skill 前，必须确保以下文档已就绪：

1. `docs/需求文档.md` — 由 `@pm` 产出
2. `docs/接口定义.md` — 由 `@architect` 产出
3. `docs/数据库设计.md` — 由 `@architect` 产出

## 输出

- **文件路径**：`docs/任务规划.json`
- **编码**：UTF-8，2 空格缩进

## 任务拆分原则

1. **最小粒度**：每个任务聚焦于单一功能点，预计开发时间 ≤ 2 小时
2. **可独立验证**：每个任务完成后可独立测试或验证
3. **依赖明确**：如有前后依赖关系，在 `dependencies` 字段中标注
4. **覆盖全面**：需求文档中的每个功能点必须拆分出对应的开发任务 + 测试任务

## 成员标识与工作目录

| 标识            | 角色     | 工作目录      |
| --------------- | -------- | ------------- |
| `@frontend-dev` | 前端开发 | `frontend/`   |
| `@backend-dev`  | 后端开发 | `backend/`    |
| `@blackbox-qa`  | 黑盒测试 | `test_black/` |
| `@whitebox-qa`  | 白盒测试 | `test_white/` |

> ⚠️ 每个任务必须通过 `workspace` 字段明确工作目录，成员只能在指定目录内编辑文件。

## 状态枚举与流转

| 阶段 | 状态值                         | 说明                       |
| ---- | ------------------------------ | -------------------------- |
| 开发 | `未开始` → `进行中` → `已完成` | 创建 → 领取 → 开发完成     |
| 测试 | `已激活` → `已解决` → `已关闭` | 发现 Bug → 修复 → 验证通过 |

> 无 Bug 时：`已完成` → `已关闭`。有 Bug 时：`已完成` → `已激活` → `已解决` → `已关闭`（验证未通过可再次 `已激活`）。

## 任务分类与指派

| 类别          | 说明            | 指派对象        | 工作目录      |
| ------------- | --------------- | --------------- | ------------- |
| `db`          | 数据库模型/迁移 | `@backend-dev`  | `backend/`    |
| `api`         | 后端接口实现    | `@backend-dev`  | `backend/`    |
| `ui`          | 前端页面/组件   | `@frontend-dev` | `frontend/`   |
| `integration` | 前后端集成      | 视具体内容      | 视具体内容    |
| `functional`  | 功能黑盒测试    | `@blackbox-qa`  | `test_black/` |
| `unit-test`   | 单元测试        | `@whitebox-qa`  | `test_white/` |
| `api-test`    | 接口自动化测试  | `@whitebox-qa`  | `test_white/` |

## JSON Schema

```json
{
  "project": "项目名称",
  "version": "版本号",
  "created_by": "@architect",
  "created_at": "YYYY-MM-DD",
  "tasks": [
    {
      "id": "TASK-001",
      "category": "api | ui | db | functional | unit-test | api-test | integration",
      "description": "简明任务描述",
      "steps": ["具体实现步骤1", "具体实现步骤2"],
      "workspace": "backend/ | frontend/ | test_black/ | test_white/",
      "dependencies": ["TASK-000"],
      "status": "未开始",
      "creator": "@architect",
      "assigned": "@backend-dev | @frontend-dev | @blackbox-qa | @whitebox-qa",
      "reason": ""
    }
  ]
}
```

## 生成流程

### 1. 任务拆分

按以下顺序从输入文档中提取并拆分任务：

1. **数据库层**（`db`）：从数据库设计文档提取每个表/模型 → 一个任务
2. **接口层**（`api`）：从接口定义文档提取每个 API 端点 → 一个任务
3. **页面层**（`ui`）：从需求文档提取每个页面/组件 → 一个任务
4. **集成层**（`integration`）：前后端对接 → 按功能模块拆分
5. **黑盒测试**（`functional`）：每个用户场景 → 一个测试任务
6. **单元测试**（`unit-test`）：每个核心模块 → 一个测试任务
7. **接口测试**（`api-test`）：每组相关 API → 一个测试任务

### 2. 设置依赖

- `api` 依赖对应的 `db` 任务
- `ui` 的接口对接部分依赖对应的 `api` 任务
- `functional` 依赖对应的 `ui` + `api` 任务
- `unit-test` 依赖对应的 `api` 任务

### 3. 写入文件

- `id` 按 `TASK-001`、`TASK-002` 递增
- 所有任务初始 `status` 为 `"未开始"`，`reason` 为 `""`

## 示例输出

```json
{
  "project": "Sisyphus-X",
  "version": "1.0.0",
  "created_by": "@architect",
  "created_at": "2026-02-14",
  "tasks": [
    {
      "id": "TASK-001",
      "category": "api",
      "description": "实现用户注册接口 POST /api/auth/register",
      "steps": [
        "创建注册请求/响应 Schema",
        "实现注册路由处理函数",
        "添加邮箱唯一性校验",
        "实现密码加密存储",
        "返回创建成功响应"
      ],
      "workspace": "backend/",
      "dependencies": [],
      "status": "未开始",
      "creator": "@architect",
      "assigned": "@backend-dev",
      "reason": ""
    },
    {
      "id": "TASK-002",
      "category": "functional",
      "description": "用户注册功能黑盒测试",
      "steps": [
        "打开注册页面",
        "填写有效注册信息",
        "提交表单",
        "验证注册成功提示",
        "验证可使用新账号登录"
      ],
      "workspace": "test_black/",
      "dependencies": ["TASK-001"],
      "status": "未开始",
      "creator": "@architect",
      "assigned": "@blackbox-qa",
      "reason": ""
    }
  ]
}
```

## 注意事项

1. **不要遗漏任务**：需求文档中的每个功能点都必须有对应的开发 + 测试任务
2. **粒度把控**：太大的任务必须拆分，太小的任务可以合并（如同一模块的 CRUD 可以合为 2-3 个任务）
3. **ID 连续性**：任务 ID 必须从 `TASK-001` 开始连续递增
4. **初始状态**：所有任务的 `status` 为 `"未开始"`，`creator` 为 `"@architect"`
5. **reason 字段**：初始为空字符串 `""`，仅在测试或审查阶段将 `status` 改为 `"已激活"` 时必须填写具体原因
