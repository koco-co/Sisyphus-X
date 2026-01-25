from typing import Dict, Any, Optional
from pydantic import BaseModel

class InterfaceSendRequest(BaseModel):
    url: str
    method: str
    headers: Optional[Dict[str, str]] = {}
    params: Optional[Dict[str, Any]] = {}
    body: Optional[Any] = None
    timeout: int = 10

    model_config = {
        "json_schema_extra": {
            "example": {
                "url": "https://httpbin.org/post",
                "method": "POST",
                "headers": {"Content-Type": "application/json"},
                "body": {"foo": "bar"}
            }
        }
    }

class InterfaceSendResponse(BaseModel):
    status_code: int
    headers: Dict[str, str]
    body: Any
    elapsed: float # seconds
