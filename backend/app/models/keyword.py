from datetime import datetime

from sqlmodel import JSON, Column, Field, SQLModel


class Keyword(SQLModel, table=True):
    """关键字库 - 存储自定义测试关键字"""

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    name: str  # 关键字名称
    description: str | None = None  # 关键字描述
    func_name: str  # Python 函数名
    category: str = "custom"  # 'request', 'assert', 'extract', 'db', 'custom'
    input_params: list[dict] = Field(default=[], sa_column=Column(JSON))  # 输入参数定义
    output_params: list[dict] = Field(default=[], sa_column=Column(JSON))  # 输出参数定义
    function_code: str = ""  # Python 函数代码
    is_active: bool = True  # 启用/禁用状态
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
