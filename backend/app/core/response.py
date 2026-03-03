# backend/app/core/response.py
from typing import Generic, TypeVar, Optional, List
from pydantic import BaseModel

T = TypeVar('T')


class ApiResponse(BaseModel, Generic[T]):
    """统一 API 响应格式"""
    code: int = 0
    message: str = "success"
    data: Optional[T] = None


class PagedData(BaseModel, Generic[T]):
    """分页数据格式"""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class PagedResponse(BaseModel, Generic[T]):
    """分页响应格式"""
    code: int = 0
    message: str = "success"
    data: PagedData[T]


def success(data=None, message: str = "success") -> dict:
    """成功响应快捷方法"""
    return {"code": 0, "message": message, "data": data}


def error(code: int = 400, message: str = "error", detail: str = None) -> dict:
    """错误响应快捷方法"""
    return {"code": code, "message": message, "detail": detail}
