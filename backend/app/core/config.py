import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""

    # 基础配置
    PROJECT_NAME: str = "Sisyphus X"
    APP_NAME: str = "Sisyphus-X"
    APP_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True

    # 数据库配置
    DATABASE_URL: str = "sqlite+aiosqlite:///./sisyphus.db"

    # 安全配置
    SECRET_KEY: str = "dev_secret_key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 天
    AUTH_DISABLED: bool = False  # 开发模式下设为 True

    # Redis 配置
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery 配置
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # MinIO 配置
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "sisyphus-assets"
    MINIO_SECURE: bool = False

    # OAuth - GitHub
    GITHUB_CLIENT_ID: str | None = None
    GITHUB_CLIENT_SECRET: str | None = None

    # OAuth - Google
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None

    # Frontend URL (用于 OAuth 回调重定向)
    FRONTEND_URL: str = "http://localhost:5173"

    # CORS 配置
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    model_config = SettingsConfigDict(
        env_file=os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"
        ),
        env_ignore_empty=True,
        extra="ignore",
    )


settings = Settings()
