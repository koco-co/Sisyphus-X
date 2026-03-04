# backend/app/modules/auth/service.py
from datetime import datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    PermissionDeniedException,
    ResourceAlreadyExistsException,
    ValidationException,
)
from app.models_new.user import User
from app.modules.auth.schemas import TokenResponse, UserLogin, UserRegister, UserResponse

# 密码哈希上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """哈希密码"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, expires_delta: timedelta | None = None) -> str:
    """创建 JWT Token"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt


def decode_token(token: str) -> str | None:
    """解码 JWT Token，返回用户 ID"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except JWTError:
        return None


class AuthService:
    """认证服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def register(self, data: UserRegister) -> UserResponse:
        """用户注册"""
        # 检查邮箱是否已存在
        result = await self.session.execute(
            select(User).where(User.email == data.email)
        )
        if result.scalar_one_or_none():
            raise ResourceAlreadyExistsException("该邮箱已被注册")

        # 创建用户
        user = User(
            email=data.email,
            username=data.username,
            password_hash=hash_password(data.password),
            is_active=True,
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        return UserResponse.model_validate(user)

    async def login(self, data: UserLogin) -> TokenResponse:
        """用户登录"""
        # 查找用户
        result = await self.session.execute(
            select(User).where(User.email == data.email)
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(data.password, user.password_hash):
            raise PermissionDeniedException("邮箱或密码错误")

        if not user.is_active:
            raise PermissionDeniedException("账户已被禁用")

        # 创建 Token
        access_token = create_access_token(str(user.id))

        return TokenResponse(
            access_token=access_token,
            user=UserResponse.model_validate(user),
        )

    async def get_user(self, user_id: str) -> UserResponse | None:
        """获取用户信息"""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user:
            return UserResponse.model_validate(user)
        return None

    async def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """修改密码"""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise PermissionDeniedException("用户不存在")

        if not verify_password(old_password, user.password_hash):
            raise ValidationException("原密码错误")

        user.password_hash = hash_password(new_password)
        user.updated_at = datetime.utcnow()
        await self.session.commit()

        return True
