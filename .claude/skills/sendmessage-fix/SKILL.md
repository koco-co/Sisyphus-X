---
name: sendmessage-fix
description: 自动修复 SendMessage 工具调用失败问题。当 leader 使用 SendMessage 向 teammate 发送消息时，如果因参数缺失、格式错误或类型不匹配导致失败，此 skill 提供自动诊断和修复方案。适用于 agent teams 协作场景中 leader 与 teammate 之间的通信错误处理。
---

# SendMessage 自动修复助手

## 快速开始

当 SendMessage 工具调用失败时，此 skill 提供以下自动修复功能：

1. **自动补全缺失参数** - 根据 recipient 智能补全 type/content 等字段
2. **参数类型验证** - 检查参数是否符合 API 规范
3. **错误诊断** - 分析失败原因并提供具体修复建议
4. **重试机制** - 生成修复后的完整工具调用

## 常见错误与修复

### 错误 1: 缺少 `type` 字段

**错误信息**：`Missing required field: type`

**自动修复**：
```json
{
  "type": "message",
  "recipient": "teammate-name",
  "content": "消息内容"
}
```

**可用的 type 值**：
- `message` - 普通消息（最常用）
- `broadcast` - 广播给所有团队成员（谨慎使用）
- `shutdown_request` - 请求关闭团队成员
- `shutdown_response` - 响应关闭请求
- `plan_approval_response` - 审批计划

### 错误 2: 缺少 `recipient` 字段

**错误信息**：`Missing required field: recipient`

**自动修复**：
```json
{
  "type": "message",
  "recipient": "exact-teammate-name",
  "content": "消息内容"
}
```

**重要**：recipient 必须是**精确的 teammate 名称**（如 `data-processor`），不是描述或角色

### 错误 3: 参数格式错误

**错误信息**：`Invalid JSON format` 或 `Parameter type mismatch`

**诊断步骤**：
1. 检查 JSON 是否有效（逗号、引号、括号）
2. 确认字段名拼写正确
3. 验证字段值类型（string/boolean/array）

**常见格式问题**：
```json
// ❌ 错误：缺少引号
{type: message, recipient: test-runner}

// ✅ 正确
{"type": "message", "recipient": "test-runner"}
```

### 错误 4: Teammate 不存在

**错误信息**：`Teammate not found: xxx`

**解决方案**：
1. 读取团队配置：`~/.claude/teams/{team-name}/config.json`
2. 检查 `members` 数组中的 `name` 字段
3. 使用准确的名称（不是 agentId 或 displayName）

**示例**：
```json
// config.json 中的成员
{
  "name": "test-runner",  // ✅ 使用这个
  "agentId": "test-runner@team-name",
  "displayName": "测试执行器"  // ❌ 不使用这个
}
```

### 错误 5: Content 为空或仅包含空白字符

**错误信息**：`Content cannot be empty or whitespace only`

**修复**：
```json
{
  "type": "message",
  "recipient": "teammate-name",
  "content": "请明确描述任务内容，例如：审查 src/App.tsx 文件"
}
```

## 调试清单

在重新调用 SendMessage 前，确认以下事项：

- [ ] `type` 字段已设置且值有效
- [ ] `recipient` 是准确的 teammate name
- [ ] `content` 包含有意义的任务描述
- [ ] JSON 格式正确（使用双引号）
- [ ] 如需回复，`summary` 字段简短明确（5-10 字）

## 高级用法

### 条件发送（针对特定错误场景）

**场景**：需要多个 teammate 协同完成一个任务

```json
{
  "type": "message",
  "recipient": "data-processor",
  "content": "分析以下数据：\n1. 用户登录日志\n2. 交易记录\n3. 系统性能指标"
}
```

**场景**：请求关闭 teammate

```json
{
  "type": "shutdown_request",
  "recipient": "code-reviewer",
  "content": "审查任务已完成，请优雅关闭"
}
```

**场景**：批准计划（plan mode）

```json
{
  "type": "plan_approval_response",
  "recipient": "planner",
  "request_id": "plan-req-123",
  "approve": true
}
```

## 调试工作流

1. **读取错误信息** - 从工具返回的错误中提取关键信息
2. **匹配错误模式** - 识别是哪种参数问题
3. **生成修复方案** - 根据"常错误与修复"部分自动生成
4. **验证修复后参数** - 确保所有必填字段存在
5. **重新调用工具** - 使用修复后的参数重试

## 相关资源

- **SendMessage API 参考**：见 Claude Code SendMessage 工具文档
- **团队配置示例**：参考 `~/.claude/teams/` 中的 config.json 文件
- **调试技巧**：在 content 中明确说明期望的输出格式
