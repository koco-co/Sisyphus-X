"""
文件上传模块 - 使用 MinIO 存储
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
import uuid
from datetime import datetime
import os

router = APIRouter()

# MinIO 配置 (从环境变量读取)
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "admin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "password123")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "sisyphus")
MINIO_USE_SSL = os.getenv("MINIO_USE_SSL", "false").lower() == "true"


def get_minio_client():
    """获取 MinIO 客户端"""
    try:
        from minio import Minio
        client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_USE_SSL
        )
        # 确保 bucket 存在
        if not client.bucket_exists(MINIO_BUCKET):
            client.make_bucket(MINIO_BUCKET)
        return client
    except ImportError:
        raise HTTPException(status_code=500, detail="MinIO 客户端未安装，请运行: pip install minio")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MinIO 连接失败: {e}")


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder: Optional[str] = "uploads"
):
    """
    上传文件到 MinIO
    返回文件访问 URL
    """
    try:
        client = get_minio_client()
        
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
            content_type=file.content_type or "application/octet-stream"
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
            "content_type": file.content_type
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
