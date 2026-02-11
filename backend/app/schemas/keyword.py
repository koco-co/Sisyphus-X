from pydantic import BaseModel

# === 关键字相关 Schema ===


class KeywordCreate(BaseModel):
    """创建关键字请求"""

    project_id: int
    name: str
    description: str | None = None
    func_name: str
    category: str = "custom"
    input_params: list[dict] = []
    output_params: list[dict] = []
    function_code: str


class KeywordUpdate(BaseModel):
    """更新关键字请求"""

    name: str | None = None
    description: str | None = None
    func_name: str | None = None
    category: str | None = None
    input_params: list[dict] | None = None
    output_params: list[dict] | None = None
    function_code: str | None = None


class KeywordResponse(BaseModel):
    """关键字响应"""

    id: int
    project_id: int
    name: str
    description: str | None = None
    func_name: str
    category: str
    input_params: list[dict]
    output_params: list[dict]
    function_code: str
    is_active: bool = True
