from typing import Any

from pydantic import BaseModel


class InterfaceSendRequest(BaseModel):
    url: str
    method: str
    headers: dict[str, str] | None = {}
    params: dict[str, Any] | None = {}
    body: Any | None = None
    files: dict[str, str] | None = {}  # key: filename, value: object_name
    timeout: int = 10

    model_config = {
        "json_schema_extra": {
            "example": {
                "url": "https://httpbin.org/post",
                "method": "POST",
                "headers": {"Content-Type": "application/json"},
                "body": {"foo": "bar"},
            }
        }
    }


class InterfaceSendResponse(BaseModel):
    status_code: int
    headers: dict[str, str]
    body: Any
    elapsed: float  # seconds
