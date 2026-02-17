"""用户相关的 Pydantic Schemas"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """用户基础 Schema"""

    email: EmailStr = Field(..., description="用户邮箱")
    is_active: bool = Field(default=True, description="账户是否激活")


class UserCreate(UserBase):
    """用户创建 Schema"""

    password: str = Field(..., min_length=8, max_length=20, description="密码")
    password_confirm: str = Field(..., description="确认密码")

    # 验证两次密码是否一致
    def validate_passwords(self) -> "UserCreate":
        if self.password != self.password_confirm:
            raise ValueError("两次密码不一致")
        return self


class UserLogin(BaseModel):
    """用户登录 Schema"""

    email: EmailStr = Field(..., description="用户邮箱")
    password: str = Field(..., description="密码")


class UserUpdate(BaseModel):
    """用户更新 Schema"""

    email: Optional[EmailStr] = Field(None, description="用户邮箱")
    is_active: Optional[bool] = Field(None, description="账户是否激活")


class UserResponse(UserBase):
    """用户响应 Schema"""

    id: str = Field(..., description="用户 ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    # OAuth 字段(仅展示)
    oauth_provider: Optional[str] = Field(None, description="OAuth 提供商")

    model_config = {"from_attributes": True}


class UserWithToken(UserResponse):
    """用户响应 Schema (含 Token)"""

    token: str = Field(..., description="JWT Token")


class OAuthCallbackRequest(BaseModel):
    """OAuth 回调请求 Schema"""

    code: str = Field(..., description="授权码")
    state: Optional[str] = Field(None, description="状态参数")
