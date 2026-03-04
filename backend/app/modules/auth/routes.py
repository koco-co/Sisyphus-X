"""
认证路由模块

提供用户注册、登录、获取用户信息、登出、修改密码等接口
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.response import success
from app.models_new.user import User
from app.modules.auth import schemas, service

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/register")
async def register(
    data: schemas.UserRegister,
    session: AsyncSession = Depends(get_session),
):
    """用户注册"""
    auth_service = service.AuthService(session)
    user = await auth_service.register(data)
    return success(data=schemas.UserResponse.model_validate(user).model_dump(), message="注册成功")


@router.post("/login")
async def login(
    data: schemas.UserLogin,
    session: AsyncSession = Depends(get_session),
):
    """用户登录"""
    auth_service = service.AuthService(session)
    token = await auth_service.login(data)
    return success(data=token.model_dump(), message="登录成功")


@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """获取当前用户信息"""
    return success(data=schemas.UserResponse.model_validate(current_user).model_dump())


@router.post("/logout")
async def logout():
    """用户登出(前端清除 Token 即可)"""
    return success(message="登出成功")


@router.post("/change-password")
async def change_password(
    data: schemas.PasswordChange,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """修改密码"""
    auth_service = service.AuthService(session)
    await auth_service.change_password(
        str(current_user.id),
        data.old_password,
        data.new_password,
    )
    return success(message="密码修改成功")
