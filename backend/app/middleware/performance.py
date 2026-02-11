"""
性能优化中间件

提供多种性能优化中间件，包括缓存控制、响应压缩、请求监控等。
"""

import time
import gzip
import json
from typing import Callable, Awaitable

from fastapi import Request, Response
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.engine import Engine

from app.utils.rich_logger import get_logger

logger = get_logger("sisyphus")


class CacheControlMiddleware(BaseHTTPMiddleware):
    """
    缓存控制中间件

    为不同类型的响应添加适当的 Cache-Control 头。
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # 静态资源缓存 1 天
        if request.url.path.startswith('/static'):
            response.headers['Cache-Control'] = 'public, max-age=86400, immutable'
            return response

        # API 响应缓存策略
        if request.url.path.startswith('/api'):
            # GET 请求可以缓存 5 分钟
            if request.method == 'GET':
                # 对于列表查询，使用较短的缓存时间
                if 'list' in request.url.path or request.url.path.endswith('/'):
                    response.headers['Cache-Control'] = 'public, max-age=300, s-maxage=600'
                else:
                    # 对于单个资源查询，可以使用较长缓存
                    response.headers['Cache-Control'] = 'public, max-age=60, s-maxage=300'
            else:
                # 非 GET 请求不缓存
                response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate'
                response.headers['Pragma'] = 'no-cache'
                response.headers['Expires'] = '0'

        return response


class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """
    性能监控中间件

    记录慢请求和响应时间。
    """

    def __init__(
        self,
        app: ASGIApp,
        slow_request_threshold: float = 1.0,  # 超过 1 秒视为慢请求
        enable_logging: bool = True,
    ):
        super().__init__(app)
        self.slow_request_threshold = slow_request_threshold
        self.enable_logging = enable_logging

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # 处理请求
        response: Response = await call_next(request)

        # 计算处理时间
        process_time = time.time() - start_time

        # 添加响应头
        response.headers['X-Process-Time'] = f'{process_time:.3f}s'

        # 记录慢请求
        if self.enable_logging and process_time > self.slow_request_threshold:
            logger.warning(
                f'Slow request detected',
                extra={
                    'method': request.method,
                    'path': request.url.path,
                    'process_time': f'{process_time:.3f}s',
                    'status_code': response.status_code,
                }
            )

        # 记录性能指标（可用于后续分析）
        if self.enable_logging:
            logger.info(
                f'{request.method} {request.url.path}',
                extra={
                    'process_time': process_time,
                    'status_code': response.status_code,
                }
            )

        return response


class ResponseCompressionMiddleware(BaseHTTPMiddleware):
    """
    响应压缩中间件

    对 JSON 响应进行 Gzip 压缩，减少网络传输量。
    """

    def __init__(self, app: ASGIApp, minimum_size: int = 1000):
        super().__init__(app)
        self.minimum_size = minimum_size

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # 检查是否应该压缩
        should_compress = (
            'gzip' in request.headers.get('accept-encoding', '') and
            len(response.body) > self.minimum_size if hasattr(response, 'body') else
            response.headers.get('content-length', 0) and
            int(response.headers.get('content-length', 0)) > self.minimum_size
        )

        if should_compress:
            # 压缩响应体
            compressed_body = gzip.compress(response.body)
            response.headers['Content-Encoding'] = 'gzip'
            response.headers['Content-Length'] = str(len(compressed_body))
            response.body = compressed_body

        return response


class DatabaseQueryMonitoringMiddleware:
    """
    数据库查询监控中间件

    监控数据库查询性能，记录慢查询。
    """

    def __init__(self, engine: Engine, slow_query_threshold: float = 0.1):
        """
        Args:
            engine: SQLAlchemy 数据库引擎
            slow_query_threshold: 慢查询阈值（秒）
        """
        self.engine = engine
        self.slow_query_threshold = slow_query_threshold
        self._setup_event_listeners()

    def _setup_event_listeners(self):
        """设置 SQLAlchemy 事件监听器"""
        from sqlalchemy import event

        @event.listens_for(self.engine, 'before_cursor_execute')
        def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            context._query_start_time = time.time()

        @event.listens_for(self.engine, 'after_cursor_execute')
        def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            total = time.time() - context._query_start_time

            # 记录慢查询
            if total > self.slow_query_threshold:
                logger.warning(
                    f'Slow database query',
                    extra={
                        'query_time': f'{total:.3f}s',
                        'statement': statement[:200],  # 只记录前 200 字符
                        'parameters': str(parameters)[:100],
                    }
                )

            # 记录所有查询（用于分析）
            logger.debug(
                f'DB query: {total:.3f}s',
                extra={
                    'query_time': total,
                    'statement_length': len(statement),
                }
            )


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    安全头中间件

    添加安全相关的 HTTP 头。
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # 添加安全头
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

        # 内容安全策略（根据需要调整）
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:;"
        )

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    简单的速率限制中间件

    防止 API 滥用（生产环境建议使用专业的限流库如 slowapi）。
    """

    def __init__(self, app: ASGIApp, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_counts = {}  # 生产环境应使用 Redis

    async def dispatch(self, request: Request, call_next):
        # 获取客户端标识
        client_id = request.client.host if request.client else 'unknown'

        # 简单的内存限流（生产环境应使用 Redis）
        current_time = time.time()
        if client_id in self.request_counts:
            requests, window_start = self.request_counts[client_id]

            # 重置时间窗口
            if current_time - window_start > 60:
                self.request_counts[client_id] = (1, current_time)
            else:
                # 检查是否超过限制
                if requests >= self.requests_per_minute:
                    from fastapi import HTTPException, status

                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f'Rate limit exceeded. Max {self.requests_per_minute} requests per minute.',
                    )

                # 增加计数
                self.request_counts[client_id] = (requests + 1, window_start)
        else:
            self.request_counts[client_id] = (1, current_time)

        # 添加限流头
        response = await call_next(request)
        response.headers['X-RateLimit-Limit'] = str(self.requests_per_minute)
        response.headers['X-RateLimit-Remaining'] = str(
            self.requests_per_minute - self.request_counts[client_id][0]
        )

        return response


class CORSMiddlewareWithLogging(BaseHTTPMiddleware):
    """
    带日志的 CORS 中间件
    """

    async def dispatch(self, request: Request, call_next):
        # 检查 Origin
        origin = request.headers.get('Origin')

        # 记录跨域请求
        if origin and origin != request.headers.get('Host'):
            logger.debug(f'CORS request from: {origin}')

        response = await call_next(request)

        # 添加 CORS 头（开发环境）
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = '*'

        return response


# ============================================
# 中间件应用示例
# ============================================

def setup_performance_middleware(app, engine=None):
    """
    设置所有性能优化中间件

    在 main.py 中调用:

    from app.middleware.performance import setup_performance_middleware
    from app.core.db import engine

    setup_performance_middleware(app, engine)
    """
    # 添加 Gzip 压缩
    app.add_middleware(
        GZipMiddleware,
        minimum_size=1000,
    )

    # 添加缓存控制
    app.add_middleware(CacheControlMiddleware)

    # 添加性能监控
    app.add_middleware(
        PerformanceMonitoringMiddleware,
        slow_request_threshold=1.0,
        enable_logging=True,
    )

    # 添加安全头
    app.add_middleware(SecurityHeadersMiddleware)

    # 添加速率限制（可选）
    # app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

    # 添加数据库查询监控（如果提供了引擎）
    if engine:
        DatabaseQueryMonitoringMiddleware(engine, slow_query_threshold=0.1)

    logger.info('Performance middleware enabled')
