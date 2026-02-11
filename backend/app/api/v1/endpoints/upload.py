"""
文件上传模块 - 使用 MinIO 存储
"""

import os
import uuid
from datetime import datetime

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.storage import (
    MINIO_BUCKET,
    MINIO_ENDPOINT,
    MINIO_USE_SSL,
    ensure_bucket_exists,
    get_minio_client,
)

router = APIRouter()


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), folder: str | None = "uploads"):
    """
    上传文件到 MinIO
    返回文件访问 URL
    """
    try:
        client = get_minio_client()
        ensure_bucket_exists(client)

        # 生成唯一文件名
        ext = os.path.splitext(file.filename)[1] if file.filename else ""
        unique_name = f"{folder}/{datetime.now().strftime('%Y%m%d')}/{uuid.uuid4().hex}{ext}"

        # 读取文件内容
        content = await file.read()
        file_size = len(content)

        # 上传到 MinIO
        from io import BytesIO

        client.put_object(
            MINIO_BUCKET,
            unique_name,
            BytesIO(content),
            file_size,
            content_type=file.content_type or "application/octet-stream",
        )

        # 生成访问 URL
        protocol = "https" if MINIO_USE_SSL else "http"
        file_url = f"{protocol}://{MINIO_ENDPOINT}/{MINIO_BUCKET}/{unique_name}"

        return {
            "success": True,
            "filename": file.filename,
            "object_name": unique_name,
            "url": file_url,
            "size": file_size,
            "content_type": file.content_type,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传失败: {e}")


@router.delete("/upload/{object_name:path}")
async def delete_file(object_name: str):
    """从 MinIO 删除文件"""
    try:
        client = get_minio_client()
        client.remove_object(MINIO_BUCKET, object_name)
        return {"success": True, "deleted": object_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除失败: {e}")
