from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PageResponse[T](BaseModel):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int
