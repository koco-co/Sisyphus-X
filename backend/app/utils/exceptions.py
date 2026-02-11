"""
异常工具类 - 统一错误处理

提供标准化的异常处理和错误响应格式。
"""

from typing import Any, Optional
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse


class AppException(HTTPException):
    """
    应用异常基类

    提供统一的异常格式和处理方式。
    """

    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        **kwargs: Any,
    ):
        """
        初始化异常

        Args:
            status_code: HTTP 状态码
            detail: 错误详情
            error_code: 业务错误码（用于国际化）
            **kwargs: 额外的错误信息
        """
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.extra = kwargs

    def to_response(self) -> JSONResponse:
        """转换为 JSONResponse"""
        content = {"detail": self.detail}
        if self.error_code:
            content["error_code"] = self.error_code
        if self.extra:
            content.update(self.extra)
        return JSONResponse(status_code=self.status_code, content=content)


class NotFoundError(AppException):
    """404 错误"""

    def __init__(
        self,
        resource_name: str,
        resource_id: Optional[Any] = None,
        error_code: Optional[str] = None,
    ):
        """
        Args:
            resource_name: 资源名称，如 "Project", "User"
            resource_id: 资源 ID
            error_code: 业务错误码
        """
        if resource_id:
            detail = f"{resource_name} with id {resource_id} not found"
        else:
            detail = f"{resource_name} not found"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code=error_code or f"{resource_name.upper()}_NOT_FOUND",
        )


class ValidationError(AppException):
    """400 验证错误"""

    def __init__(
        self,
        detail: str,
        field: Optional[str] = None,
        error_code: Optional[str] = None,
    ):
        """
        Args:
            detail: 错误详情
            field: 出错字段名
            error_code: 业务错误码
        """
        extra = {}
        if field:
            extra["field"] = field
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code=error_code or "VALIDATION_ERROR",
            **extra,
        )


class ConflictError(AppException):
    """409 冲突错误"""

    def __init__(
        self,
        detail: str,
        conflict_field: Optional[str] = None,
        conflict_value: Optional[Any] = None,
        error_code: Optional[str] = None,
    ):
        """
        Args:
            detail: 错误详情
            conflict_field: 冲突字段
            conflict_value: 冲突值
            error_code: 业务错误码
        """
        extra = {}
        if conflict_field and conflict_value:
            extra[conflict_field] = conflict_value
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code=error_code or "CONFLICT",
            **extra,
        )


class UnauthorizedError(AppException):
    """401 未授权错误"""

    def __init__(
        self,
        detail: str = "Unauthorized",
        error_code: Optional[str] = None,
    ):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code=error_code or "UNAUTHORIZED",
        )


class ForbiddenError(AppException):
    """403 禁止访问错误"""

    def __init__(
        self,
        detail: str = "Forbidden",
        error_code: Optional[str] = None,
    ):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code=error_code or "FORBIDDEN",
        )


class InternalServerError(AppException):
    """500 内部服务器错误"""

    def __init__(
        self,
        detail: str = "Internal server error",
        error_code: Optional[str] = None,
    ):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code=error_code or "INTERNAL_ERROR",
        )


class BusinessError(AppException):
    """业务逻辑错误（422）"""

    def __init__(
        self,
        detail: str,
        error_code: Optional[str] = None,
        **kwargs: Any,
    ):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code=error_code or "BUSINESS_ERROR",
            **kwargs,
        )


# 便捷函数
def raise_not_found(resource_name: str, resource_id: Optional[Any] = None) -> None:
    """抛出 404 错误"""
    raise NotFoundError(resource_name, resource_id)


def raise_validation(detail: str, field: Optional[str] = None) -> None:
    """抛出验证错误"""
    raise ValidationError(detail, field)


def raise_conflict(
    detail: str,
    conflict_field: Optional[str] = None,
    conflict_value: Optional[Any] = None,
) -> None:
    """抛出冲突错误"""
    raise ConflictError(detail, conflict_field, conflict_value)


def raise_business(detail: str, error_code: Optional[str] = None) -> None:
    """抛出业务错误"""
    raise BusinessError(detail, error_code)
