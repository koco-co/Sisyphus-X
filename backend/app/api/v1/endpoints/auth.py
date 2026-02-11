# 认证 API 端点

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from app.api import deps
from app.core.config import settings
from app.core.db import get_session
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import TokenResponse, UserLogin, UserRegister, UserResponse

router = APIRouter()


def _user_id_or_raise(user: User) -> int:
    if user.id is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="用户ID缺失")
    return user.id


# ========== 邮箱+密码认证 ==========


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, session: AsyncSession = Depends(get_session)):
    """用户注册"""
    # 检查邮箱是否已存在
    result = await session.execute(select(User).where(col(User.email) == data.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该邮箱已被注册")

    # 检查用户名是否已存在
    result = await session.execute(select(User).where(col(User.username) == data.username))
    existing_username = result.scalar_one_or_none()
    if existing_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该用户名已被使用")

    # 创建新用户
    user = User(
        username=data.username, email=data.email, password_hash=get_password_hash(data.password)
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    # 生成令牌
    token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        token=token,
        user=UserResponse(
            id=_user_id_or_raise(user),
            username=user.username,
            email=user.email,
            avatar=user.avatar,
            is_active=user.is_active,
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, session: AsyncSession = Depends(get_session)):
    """用户登录"""
    result = await session.execute(select(User).where(col(User.email) == data.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="邮箱或密码错误")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="该账户已被禁用")

    # 生成令牌
    token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        token=token,
        user=UserResponse(
            id=_user_id_or_raise(user),
            username=user.username,
            email=user.email,
            avatar=user.avatar,
            is_active=user.is_active,
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(deps.get_current_user)):
    """获取当前登录用户信息"""
    return UserResponse(
        id=_user_id_or_raise(current_user),
        username=current_user.username,
        email=current_user.email,
        avatar=current_user.avatar,
        is_active=current_user.is_active,
    )


# ========== GitHub OAuth ==========


@router.get("/github")
async def github_login():
    """获取 GitHub OAuth 授权 URL"""
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GitHub OAuth 未配置")

    # GitHub OAuth 授权 URL
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&scope=user:email"
    )
    return {"url": github_auth_url}


@router.get("/github/callback")
async def github_callback(code: str, session: AsyncSession = Depends(get_session)):
    """处理 GitHub OAuth 回调"""
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth 未配置")

    async with httpx.AsyncClient(trust_env=False) as client:
        # 1. 用 code 换取 access_token
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_response.json()

        if "error" in token_data:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=github_auth_failed")

        access_token = token_data.get("access_token")

        # 检查 access_token 是否有效
        if not access_token:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=github_token_failed")

        # 2. 获取用户信息
        user_response = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        github_user = user_response.json()

        # 检查用户信息是否有效
        if "id" not in github_user:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=github_user_failed")

        # 3. 获取用户邮箱（可能需要单独请求）
        email = github_user.get("email")
        if not email:
            try:
                emails_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                emails = emails_response.json()
                if isinstance(emails, list):
                    primary_email = next((e for e in emails if e.get("primary")), None)
                    email = (
                        primary_email["email"]
                        if primary_email
                        else f"{github_user['id']}@github.local"
                    )
                else:
                    email = f"{github_user['id']}@github.local"
            except Exception:
                email = f"{github_user['id']}@github.local"

    github_id = str(github_user["id"])

    # 4. 查找或创建用户
    result = await session.execute(
        select(User).where(col(User.oauth_provider) == "github", col(User.oauth_id) == github_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        # 检查邮箱是否已被使用
        result = await session.execute(select(User).where(col(User.email) == email))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            # 关联现有账户
            existing_user.oauth_provider = "github"
            existing_user.oauth_id = github_id
            existing_user.avatar = existing_user.avatar or github_user.get("avatar_url")
            user = existing_user
        else:
            # 创建新用户
            username = github_user.get("login") or f"github_{github_id}"
            # 确保用户名唯一
            base_username = username
            counter = 1
            while True:
                result = await session.execute(select(User).where(col(User.username) == username))
                if not result.scalar_one_or_none():
                    break
                username = f"{base_username}_{counter}"
                counter += 1

            user = User(
                username=username,
                email=email,
                oauth_provider="github",
                oauth_id=github_id,
                avatar=github_user.get("avatar_url"),
            )
            session.add(user)

        await session.commit()
        await session.refresh(user)

    # 5. 生成 JWT token
    token = create_access_token(data={"sub": str(user.id)})

    # 6. 重定向到前端
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/?token={token}")


# ========== Google OAuth ==========


@router.get("/google")
async def google_login():
    """获取 Google OAuth 授权 URL"""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth 未配置")

    # 回调 URL
    redirect_uri = "http://localhost:8000/api/v1/auth/google/callback"

    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=email%20profile"
    )
    return {"url": google_auth_url}


@router.get("/google/callback")
async def google_callback(code: str, session: AsyncSession = Depends(get_session)):
    """处理 Google OAuth 回调"""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth 未配置")

    redirect_uri = "http://localhost:8000/api/v1/auth/google/callback"

    async with httpx.AsyncClient(trust_env=False) as client:
        # 1. 用 code 换取 access_token
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
        )
        token_data = token_response.json()

        if "error" in token_data:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=google_auth_failed")

        access_token = token_data.get("access_token")

        # 检查 access_token 是否有效
        if not access_token:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=google_token_failed")

        # 2. 获取用户信息
        user_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        google_user = user_response.json()

        # 检查用户信息是否有效
        if "id" not in google_user:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=google_user_failed")

    google_id = google_user["id"]
    email = google_user.get("email", f"{google_id}@google.local")

    # 3. 查找或创建用户
    result = await session.execute(
        select(User).where(col(User.oauth_provider) == "google", col(User.oauth_id) == google_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        # 检查邮箱是否已被使用
        result = await session.execute(select(User).where(col(User.email) == email))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            # 关联现有账户
            existing_user.oauth_provider = "google"
            existing_user.oauth_id = google_id
            existing_user.avatar = existing_user.avatar or google_user.get("picture")
            user = existing_user
        else:
            # 创建新用户
            username = google_user.get("name", "").replace(" ", "_") or f"google_{google_id}"
            # 确保用户名唯一
            base_username = username
            counter = 1
            while True:
                result = await session.execute(select(User).where(col(User.username) == username))
                if not result.scalar_one_or_none():
                    break
                username = f"{base_username}_{counter}"
                counter += 1

            user = User(
                username=username,
                email=email,
                oauth_provider="google",
                oauth_id=google_id,
                avatar=google_user.get("picture"),
            )
            session.add(user)

        await session.commit()
        await session.refresh(user)

    # 4. 生成 JWT token
    token = create_access_token(data={"sub": str(user.id)})

    # 5. 重定向到前端
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/?token={token}")
