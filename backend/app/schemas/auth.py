# 认证相关的 Pydantic 模型

from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    """用户注册请求模型"""

    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    """用户登录请求模型"""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """用户响应模型 (不包含密码)"""

    id: int
    username: str
    email: str
    avatar: str | None = None
    is_active: bool = True


class TokenResponse(BaseModel):
    """登录成功响应模型"""

    token: str
    user: UserResponse


class Token(BaseModel):
    """JWT 令牌模型"""

    access_token: str
    token_type: str = "bearer"
