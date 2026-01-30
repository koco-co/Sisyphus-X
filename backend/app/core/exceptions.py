"""
自定义异常类
"""
from typing import Optional, Any
from fastapi import HTTPException, status


class SisyphusException(Exception):
    """基础异常类"""

    def __init__(self, message: str, details: Optional[Any] = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


# ============================================================================
# 业务异常
# ============================================================================

class ResourceNotFoundException(SisyphusException):
    """资源未找到异常"""
    pass


class ResourceAlreadyExistsException(SisyphusException):
    """资源已存在异常"""
    pass


class ValidationException(SisyphusException):
    """验证失败异常"""
    pass


class PermissionDeniedException(SisyphusException):
    """权限拒绝异常"""
    pass


class ExecutionException(SisyphusException):
    """执行失败异常"""
    pass


class ConfigurationException(SisyphusException):
    """配置错误异常"""
    pass


# ============================================================================
# FastAPI 异常处理器
# ============================================================================

def handle_resource_not_found(exc: ResourceNotFoundException) -> HTTPException:
    """处理资源未找到异常"""
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "error_type": "resource_not_found",
            "message": exc.message,
            "details": exc.details
        }
    )


def handle_resource_already_exists(exc: ResourceAlreadyExistsException) -> HTTPException:
    """处理资源已存在异常"""
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "error_type": "resource_already_exists",
            "message": exc.message,
            "details": exc.details
        }
    )


def handle_validation(exc: ValidationException) -> HTTPException:
    """处理验证异常"""
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "error_type": "validation_error",
            "message": exc.message,
            "details": exc.details
        }
    )


def handle_permission_denied(exc: PermissionDeniedException) -> HTTPException:
    """处理权限拒绝异常"""
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "error_type": "permission_denied",
            "message": exc.message,
            "details": exc.details
        }
    )


def handle_execution(exc: ExecutionException) -> HTTPException:
    """处理执行异常"""
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={
            "error_type": "execution_error",
            "message": exc.message,
            "details": exc.details
        }
    )


def handle_configuration(exc: ConfigurationException) -> HTTPException:
    """处理配置异常"""
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={
            "error_type": "configuration_error",
            "message": exc.message,
            "details": exc.details
        }
    )
