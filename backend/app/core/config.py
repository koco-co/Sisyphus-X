import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Sisyphus X"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "dev_secret_key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8

    # Auth
    AUTH_DISABLED: bool = False

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str | None = "redis://localhost:6379/0"

    # MinIO
    MINIO_ENDPOINT: str | None = "localhost:9000"
    MINIO_ACCESS_KEY: str | None = "minioadmin"
    MINIO_SECRET_KEY: str | None = "minioadmin"
    MINIO_BUCKET: str | None = "sisyphus-assets"

    # OAuth - GitHub
    GITHUB_CLIENT_ID: str | None = None
    GITHUB_CLIENT_SECRET: str | None = None

    # OAuth - Google
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None

    # Frontend URL (用于 OAuth 回调重定向)
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"
        ),
        env_ignore_empty=True,
        extra="ignore",
    )


settings = Settings()
