# backend/app/modules/auth/schemas.py
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from uuid import UUID


class UserRegister(BaseModel):
    """用户注册请求"""
    email: EmailStr
    username: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    """用户登录请求"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """用户响应"""
    id: UUID
    email: str
    username: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Token 响应"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class PasswordChange(BaseModel):
    """修改密码请求"""
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=100)
