# backend/app/core/redis.py
import redis.asyncio as redis
from typing import Optional
from app.core.config import settings

redis_client: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    """获取 Redis 客户端"""
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
    return redis_client


async def close_redis():
    """关闭 Redis 连接"""
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None
