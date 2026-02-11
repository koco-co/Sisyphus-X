from sqlmodel import JSON, Column, Field, SQLModel


class TestCase(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    interface_id: int | None = Field(
        default=None, foreign_key="interface.id"
    )  # 关联接口(若是纯功能测试则为空)
    title: str
    priority: str  # P0-P3
    pre_conditions: str | None = None  # 前置条件

    # 核心数据：存储步骤和预期的 JSON 结构
    # 结构示例: [{"step": "输入密码", "expect": "显示掩码"}, {"step": "点击登录", "expect": "跳转首页"}]
    steps_data: list[dict] = Field(default=[], sa_column=Column(JSON))

    engine_type: str  # 'api', 'web', 'app', 'manual'
    tags: list[str] = Field(default=[], sa_column=Column(JSON))
