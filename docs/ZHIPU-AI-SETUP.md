# 智谱AI (GLM) 配置指南

## ✅ 已完成功能

### 1. 智谱AI支持
- ✅ 已添加智谱AI (GLM) 厂商类型
- ✅ 支持模型: `glm-4-flash`, `glm-4`, `glm-3-turbo` 等
- ✅ API端点: `https://open.bigmodel.cn/api/paas/v4`

### 2. API连接测试功能
- ✅ 测试API Key是否有效
- ✅ 验证模型连接
- ✅ 返回详细的测试结果

### 3. 已测试的API Key
```
API Key: 5b3312a29aad491d94c00be156be205f.f5JBJeb9axAoHfyC
模型: glm-4-flash
状态: ✅ 连接成功
```

## 📖 API使用说明

### 1. 测试智谱AI配置

**端点**: `POST /api/v1/ai/configs/test`

**请求示例**:
```json
{
  "provider_type": "glm",
  "api_key": "5b3312a29aad491d94c00be156be205f.f5JBJeb9axAoHfyC",
  "model_name": "glm-4-flash"
}
```

**成功响应**:
```json
{
  "success": true,
  "message": "智谱AI API连接成功！模型响应: 你好👋！我是人工智能助手..."
}
```

**失败响应**:
```json
{
  "success": false,
  "message": "API Key验证失败",
  "error": "请检查API Key是否正确"
}
```

### 2. 获取预设配置

**端点**: `GET /api/v1/ai/configs/presets/glm`

**响应示例**:
```json
{
  "provider_name": "智谱AI",
  "provider_type": "glm",
  "model_name": "glm-4-flash",
  "temperature": 0.7,
  "max_tokens": 4000,
  "api_endpoint": "https://open.bigmodel.cn/api/paas/v4"
}
```

### 3. 创建AI配置

**端点**: `POST /api/v1/ai/configs/`

**请求示例**:
```json
{
  "provider_name": "智谱AI",
  "provider_type": "glm",
  "model_name": "glm-4-flash",
  "api_key": "5b3312a29aad491d94c00be156be205f.f5JBJeb9axAoHfyC",
  "api_endpoint": "https://open.bigmodel.cn/api/paas/v4",
  "temperature": 0.7,
  "max_tokens": 4000,
  "is_enabled": true,
  "is_default": true
}
```

## 🧪 测试脚本

项目根目录提供了测试脚本：

```bash
# 测试智谱AI API连接
python3 test_zhipu_api.py
```

**预期输出**:
```
============================================================
测试智谱AI API连接
============================================================

API Key: 5b33...HfyC
端点: https://open.bigmodel.cn/api/paas/v4
模型: glm-4-flash

正在发送请求...

状态码: 200
✅ API连接成功！

模型回复: 你好👋！我是人工智能助手，很高兴为你服务，有什么可以帮助你的吗？

============================================================
```

## 📝 支持的厂商

当前系统支持以下AI厂商的配置和测试：

| 厂商 | provider_type | 推荐模型 |
|-----|---------------|---------|
| OpenAI | `openai` | gpt-4o-mini, gpt-4 |
| Anthropic | `anthropic` | claude-3-5-sonnet-20241022 |
| 智谱AI | `glm` | glm-4-flash, glm-4 |
| 通义千问 | `qwen` | qwen-turbo |
| 文心一言 | `qianfan` | ERNIE-Bot-turbo |

## 🔧 初始化配置

如需在数据库中添加预设配置，可以使用初始化脚本：

```bash
cd backend
python3 init_ai_config.py
```

## ⚠️ 注意事项

1. **API Key 安全**: API Key会被加密存储在数据库中
2. **用户隔离**: 每个用户只能访问自己的配置
3. **默认配置**: 每个厂商类型只能有一个默认配置
4. **网络要求**: 需要能够访问 `open.bigmodel.cn`

## 🚀 下一步

1. 在前端添加AI配置管理界面
2. 实现AI需求澄清功能
3. 实现AI辅助测试用例生成
4. 添加配置有效性定期检查

## 📚 相关文档

- [AI配置模型](../backend/app/models/ai_config.py)
- [AI配置服务](../backend/app/services/ai_config_service.py)
- [AI配置API](../backend/app/api/v1/endpoints/ai_config.py)
