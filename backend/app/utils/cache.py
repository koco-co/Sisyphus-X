"""简单的内存缓存工具

用于缓存频繁访问的数据，减少数据库查询。
适用于 Dashboard 统计等场景。
"""

import asyncio
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, Callable, TypeVar

T = TypeVar("T")


@dataclass
class CacheEntry:
    """缓存条目"""

    value: Any
    expires_at: float
    created_at: float


class SimpleCache:
    """简单的 LRU 内存缓存

    特性:
    - LRU 淘汰策略
    - TTL 过期机制
    - 线程安全 (使用 asyncio.Lock)
    - 最大条目限制
    """

    def __init__(self, max_size: int = 100, default_ttl: int = 60):
        """初始化缓存

        Args:
            max_size: 最大缓存条目数
            default_ttl: 默认过期时间（秒）
        """
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._max_size = max_size
        self._default_ttl = default_ttl
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Any | None:
        """获取缓存值

        Args:
            key: 缓存键

        Returns:
            缓存值，如果不存在或已过期则返回 None
        """
        async with self._lock:
            if key not in self._cache:
                return None

            entry = self._cache[key]

            # 检查是否过期
            if time.time() > entry.expires_at:
                del self._cache[key]
                return None

            # LRU: 移到最后表示最近使用
            self._cache.move_to_end(key)
            return entry.value

    async def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """设置缓存值

        Args:
            key: 缓存键
            value: 缓存值
            ttl: 过期时间（秒），None 则使用默认值
        """
        async with self._lock:
            now = time.time()
            expires_at = now + (ttl if ttl is not None else self._default_ttl)

            # 如果键已存在，先删除
            if key in self._cache:
                del self._cache[key]

            # 添加新条目
            self._cache[key] = CacheEntry(
                value=value,
                expires_at=expires_at,
                created_at=now,
            )

            # LRU 淘汰
            while len(self._cache) > self._max_size:
                self._cache.popitem(last=False)

    async def delete(self, key: str) -> bool:
        """删除缓存

        Args:
            key: 缓存键

        Returns:
            是否成功删除
        """
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    async def clear(self) -> None:
        """清空缓存"""
        async with self._lock:
            self._cache.clear()

    async def get_or_set(
        self,
        key: str,
        factory: Callable[[], T] | Callable[[], Any],
        ttl: int | None = None,
    ) -> T:
        """获取缓存值，如果不存在则通过 factory 创建并缓存

        Args:
            key: 缓存键
            factory: 创建缓存值的函数（可以是协程）
            ttl: 过期时间（秒）

        Returns:
            缓存值或新创建的值
        """
        # 先尝试获取
        value = await self.get(key)
        if value is not None:
            return value

        # 创建新值
        result = factory()
        if asyncio.iscoroutine(result):
            result = await result

        # 缓存
        await self.set(key, result, ttl)
        return result

    def stats(self) -> dict:
        """获取缓存统计信息"""
        now = time.time()
        valid_count = sum(
            1 for entry in self._cache.values() if now <= entry.expires_at
        )
        return {
            "total_entries": len(self._cache),
            "valid_entries": valid_count,
            "max_size": self._max_size,
            "default_ttl": self._default_ttl,
        }


# 全局缓存实例
# Dashboard 缓存 (5分钟 TTL)
dashboard_cache = SimpleCache(max_size=50, default_ttl=300)

# 通用缓存 (1分钟 TTL)
general_cache = SimpleCache(max_size=200, default_ttl=60)


def cached(cache: SimpleCache, key: str, ttl: int | None = None):
    """缓存装饰器

    用法:
        @cached(dashboard_cache, "my_key", ttl=60)
        async def my_function():
            return expensive_operation()

    Args:
        cache: 缓存实例
        key: 缓存键
        ttl: 过期时间（秒）
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        async def wrapper(*args, **kwargs):
            # 尝试从缓存获取
            cached_value = await cache.get(key)
            if cached_value is not None:
                return cached_value

            # 执行函数
            result = func(*args, **kwargs)
            if asyncio.iscoroutine(result):
                result = await result

            # 缓存结果
            await cache.set(key, result, ttl)
            return result

        return wrapper  # type: ignore

    return decorator
