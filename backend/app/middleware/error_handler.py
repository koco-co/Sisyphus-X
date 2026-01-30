"""
全局错误处理中间件
"""
import logging
import time
import traceback
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import (
    SisyphusException,
    ResourceNotFoundException,
    ResourceAlreadyExistsException,
    ValidationException,
    PermissionDeniedException,
    ExecutionException,
    ConfigurationException
)

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """全局错误处理中间件"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
        except SisyphusException as exc:
            return await self.handle_sisyphus_exception(exc, request)
        except SQLAlchemyError as exc:
            return await self.handle_database_exception(exc, request)
        except Exception as exc:
            return await self.handle_unexpected_exception(exc, request)

    async def handle_sisyphus_exception(self, exc: SisyphusException, request: Request) -> JSONResponse:
        """处理业务异常"""
        logger.error(f"业务异常: {exc.message}", extra={
            "exception_type": type(exc).__name__,
            "path": request.url.path,
            "method": request.method,
            "details": exc.details
        })

        status_code = 500
        if isinstance(exc, ResourceNotFoundException):
            status_code = 404
        elif isinstance(exc, ResourceAlreadyExistsException):
            status_code = 409
        elif isinstance(exc, ValidationException):
            status_code = 400
        elif isinstance(exc, PermissionDeniedException):
            status_code = 403

        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "error": {
                    "type": type(exc).__name__,
                    "message": exc.message,
                    "details": exc.details
                }
            }
        )

    async def handle_database_exception(self, exc: SQLAlchemyError, request: Request) -> JSONResponse:
        """处理数据库异常"""
        logger.error(f"数据库异常: {str(exc)}", extra={
            "exception_type": "SQLAlchemyError",
            "path": request.url.path,
            "method": request.method
        })

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "type": "database_error",
                    "message": "数据库操作失败",
                    "details": str(exc) if logger.level <= logging.DEBUG else None
                }
            }
        )

    async def handle_unexpected_exception(self, exc: Exception, request: Request) -> JSONResponse:
        """处理未预期的异常"""
        logger.error(f"未预期的异常: {str(exc)}", extra={
            "exception_type": type(exc).__name__,
            "path": request.url.path,
            "method": request.method,
            "traceback": traceback.format_exc()
        })

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "type": "internal_server_error",
                    "message": "服务器内部错误",
                    "details": str(exc) if logger.level <= logging.DEBUG else None
                }
            }
        )


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """请求日志中间件"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()

        # 记录请求开始
        logger.info(f"请求开始: {request.method} {request.url.path}", extra={
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client": request.client.host if request.client else None
        })

        # 执行请求
        try:
            response = await call_next(request)
            duration = time.time() - start_time

            # 记录请求完成
            logger.info(f"请求完成: {request.method} {request.url.path} - {response.status_code}", extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2)
            })

            # 添加响应头
            response.headers["X-Response-Time"] = f"{duration*1000:.2f}ms"

            return response

        except Exception as exc:
            duration = time.time() - start_time
            logger.error(f"请求失败: {request.method} {request.url.path}", extra={
                "method": request.method,
                "path": request.url.path,
                "duration_ms": round(duration * 1000, 2),
                "error": str(exc)
            })
            raise


class SecurityMiddleware(BaseHTTPMiddleware):
    """安全中间件"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 添加安全响应头
        response = await call_next(request)

        # 安全头
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # CORS 已经在 main.py 中配置，这里不需要重复

        return response
