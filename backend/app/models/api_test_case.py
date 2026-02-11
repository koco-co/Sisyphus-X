"""
API 测试用例模型
用于存储 Sisyphus-api-engine 的测试用例配置
"""

from datetime import datetime

from sqlalchemy import DateTime
from sqlmodel import JSON, Column, Field, SQLModel


class ApiTestCase(SQLModel, table=True):
    """API 测试用例"""

    __tablename__ = "apitestcase"

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)

    # 基本信息
    name: str = Field(index=True)
    description: str | None = Field(default=None)

    # YAML 配置（存储原始 YAML 内容，用于直接导入/导出）
    yaml_content: str = Field(default="")

    # 结构化配置（JSON 格式，便于前端编辑）
    # 结构: {name, description, config: {profiles, variables, timeout}, steps: [...], tags, enabled}
    config_data: dict = Field(default={}, sa_column=Column(JSON))

    # 环境配置关联
    environment_id: int | None = Field(
        default=None, foreign_key="projectenvironment.id", index=True
    )

    # 标签和状态
    tags: list[str] = Field(default=[], sa_column=Column(JSON))
    enabled: bool = Field(default=True)

    # 元数据
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)))

    # 软删除
    is_deleted: bool = Field(default=False)


class ApiTestStep(SQLModel, table=True):
    """API 测试步骤（可选，如果需要单独管理步骤）"""

    __tablename__ = "apiteststep"

    id: int | None = Field(default=None, primary_key=True)
    test_case_id: int = Field(foreign_key="apitestcase.id", index=True)

    # 步骤序号
    step_order: int = Field(index=True)

    # 步骤配置
    step_type: str = Field(index=True)  # request, database, wait, loop, script, concurrent
    step_config: dict = Field(default={}, sa_column=Column(JSON))

    # 步骤元数据
    name: str
    description: str | None = None

    created_at: datetime = Field(default_factory=datetime.utcnow)


class ApiTestExecution(SQLModel, table=True):
    """API 测试执行记录"""

    __tablename__ = "apitestexecution"

    id: int | None = Field(default=None, primary_key=True)
    test_case_id: int = Field(foreign_key="apitestcase.id", index=True)
    environment_id: int | None = Field(
        default=None, foreign_key="projectenvironment.id", index=True
    )

    # 执行状态
    status: str = Field(
        default="pending", index=True
    )  # pending, running, passed, failed, skipped, error

    # 时间信息
    started_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    completed_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    duration: float | None = Field(default=None)  # 执行时长（秒）

    # 执行结果（存储 API Engine 的完整 JSON 输出）
    result_data: dict = Field(default={}, sa_column=Column(JSON))

    # 统计信息
    total_steps: int = Field(default=0)
    passed_steps: int = Field(default=0)
    failed_steps: int = Field(default=0)
    skipped_steps: int = Field(default=0)

    # 错误信息
    error_message: str | None = None
    error_type: str | None = None  # AssertionError, TimeoutError, ConnectionError, etc.
    error_category: str | None = None  # assertion, network, timeout, parsing, business, system

    # 执行选项
    execution_options: dict = Field(default={}, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)


class ApiTestStepResult(SQLModel, table=True):
    """API 测试步骤执行结果（可选，用于详细分析）"""

    __tablename__ = "apiteststepresult"

    id: int | None = Field(default=None, primary_key=True)
    execution_id: int = Field(foreign_key="apitestexecution.id", index=True)

    # 步骤信息
    step_name: str
    step_order: int
    step_type: str

    # 执行状态
    status: str = Field(index=True)  # success, failed, skipped, error

    # 时间信息
    started_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    completed_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    duration: float | None = Field(default=None)
    retry_count: int = Field(default=0)

    # 性能指标
    performance_metrics: dict = Field(default={}, sa_column=Column(JSON))

    # 响应数据
    response_data: dict = Field(default={}, sa_column=Column(JSON))

    # 验证结果
    validations: list[dict] = Field(default=[], sa_column=Column(JSON))

    # 提取的变量
    extracted_vars: dict = Field(default={}, sa_column=Column(JSON))

    # 错误信息
    error_info: dict | None = Field(default=None, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)
