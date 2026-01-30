"""
AI配置相关Schemas - 功能测试模块
用于API请求/响应验证
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ProviderType(str, Enum):
    """AI厂商类型"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    QWEN = "qwen"  # 阿里云通义千问
    QIANFAN = "qianfan"  # 百度文心一言
    GLM = "glm"  # 智谱AI


class AIProviderConfigBase(BaseModel):
    """AI厂商配置基础Schema"""
    provider_name: str = Field(..., description="厂商名称，如OpenAI/Anthropic")
    provider_type: ProviderType = Field(..., description="厂商类型")
    model_name: str = Field(..., description="模型名称，如gpt-4/claude-3-opus")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="温度参数")
    max_tokens: int = Field(default=4000, ge=1, le=128000, description="最大token数")
    is_enabled: bool = Field(default=True, description="是否启用")
    is_default: bool = Field(default=False, description="是否为默认配置")

    @validator('provider_name')
    def validate_provider_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('厂商名称不能为空')
        return v.strip()

    @validator('model_name')
    def validate_model_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('模型名称不能为空')
        return v.strip()


class AIProviderConfigCreate(AIProviderConfigBase):
    """创建AI配置"""
    api_key: str = Field(..., description="API密钥")
    api_endpoint: Optional[str] = Field(None, description="自定义API端点")


class AIProviderConfigUpdate(BaseModel):
    """更新AI配置"""
    provider_name: Optional[str] = None
    model_name: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=128000)
    is_enabled: Optional[bool] = None
    is_default: Optional[bool] = None
    api_endpoint: Optional[str] = None
    api_key: Optional[str] = None  # 如果提供则更新


class AIProviderConfigResponse(AIProviderConfigBase):
    """AI配置响应（不返回完整API Key）"""
    id: int
    api_key_masked: str = Field(..., description="脱敏的API Key")
    api_endpoint: Optional[str] = None
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AIProviderConfigTest(BaseModel):
    """测试AI配置"""
    provider_type: ProviderType
    api_key: str
    model_name: str
    api_endpoint: Optional[str] = None


class TestResult(BaseModel):
    """测试结果"""
    success: bool
    message: str
    error: Optional[str] = None


# 预设配置模板
PRESET_CONFIGS = {
    "openai": {
        "provider_name": "OpenAI",
        "provider_type": "openai",
        "model_name": "gpt-4o-mini",
        "temperature": 0.7,
        "max_tokens": 4000,
        "api_endpoint": "https://api.openai.com/v1"
    },
    "anthropic": {
        "provider_name": "Anthropic",
        "provider_type": "anthropic",
        "model_name": "claude-3-5-sonnet-20241022",
        "temperature": 0.7,
        "max_tokens": 4000,
        "api_endpoint": "https://api.anthropic.com"
    },
    "qwen": {
        "provider_name": "阿里云通义千问",
        "provider_type": "qwen",
        "model_name": "qwen-turbo",
        "temperature": 0.7,
        "max_tokens": 4000,
        "api_endpoint": "https://dashscope.aliyuncs.com/compatible-mode/v1"
    },
    "qianfan": {
        "provider_name": "百度文心一言",
        "provider_type": "qianfan",
        "model_name": "ERNIE-Bot-turbo",
        "temperature": 0.7,
        "max_tokens": 4000,
        "api_endpoint": "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat"
    },
    "glm": {
        "provider_name": "智谱AI",
        "provider_type": "glm",
        "model_name": "glm-4-flash",
        "temperature": 0.7,
        "max_tokens": 4000,
        "api_endpoint": "https://open.bigmodel.cn/api/paas/v4"
    }
}
