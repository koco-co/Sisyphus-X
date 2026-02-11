"""
MinIO 存储服务
"""

import os

from fastapi import HTTPException
from minio import Minio  # type: ignore

from app.core.config import settings

# MinIO 配置
MINIO_ENDPOINT = settings.MINIO_ENDPOINT or "localhost:9000"
MINIO_ACCESS_KEY = settings.MINIO_ACCESS_KEY or "minioadmin"
MINIO_SECRET_KEY = settings.MINIO_SECRET_KEY or "minioadmin"
MINIO_BUCKET = settings.MINIO_BUCKET or "sisyphus-assets"
MINIO_USE_SSL = os.getenv("MINIO_USE_SSL", "false").lower() == "true"


def get_minio_client() -> Minio:
    """获取 MinIO 客户端"""
    try:
        client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_USE_SSL,
        )
        return client
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MinIO 连接失败: {e}")


def ensure_bucket_exists(client: Minio):
    if not client.bucket_exists(MINIO_BUCKET):
        client.make_bucket(MINIO_BUCKET)
