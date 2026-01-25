from typing import Optional, List, Dict
from pydantic import BaseModel

# === 关键字相关 Schema ===

class KeywordCreate(BaseModel):
    """创建关键字请求"""
    project_id: int
    name: str
    description: Optional[str] = None
    func_name: str
    category: str = "custom"
    input_params: List[Dict] = []
    output_params: List[Dict] = []
    function_code: str

class KeywordUpdate(BaseModel):
    """更新关键字请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    func_name: Optional[str] = None
    category: Optional[str] = None
    input_params: Optional[List[Dict]] = None
    output_params: Optional[List[Dict]] = None
    function_code: Optional[str] = None

class KeywordResponse(BaseModel):
    """关键字响应"""
    id: int
    project_id: int
    name: str
    description: Optional[str] = None
    func_name: str
    category: str
    input_params: List[Dict]
    output_params: List[Dict]
    function_code: str
    is_active: bool = True

