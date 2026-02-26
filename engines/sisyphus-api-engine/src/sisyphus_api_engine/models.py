"""YAML 配置模型定义（EG-003）- 符合 YAML 输入规范"""

from typing import Any

from pydantic import BaseModel, Field


class EnvironmentConfig(BaseModel):
    """config.environment"""

    name: str
    base_url: str
    variables: dict[str, Any] = Field(default_factory=dict)


class PrePostSql(BaseModel):
    """config.pre_sql / post_sql"""

    datasource: str
    statements: list[str]


class Config(BaseModel):
    """config - 场景配置"""

    name: str
    description: str | None = None
    project_id: str = ""
    scenario_id: str = ""
    priority: str = "P2"
    tags: list[str] = Field(default_factory=list)
    environment: EnvironmentConfig | None = None
    variables: dict[str, Any] = Field(default_factory=dict)
    pre_sql: PrePostSql | None = None
    post_sql: PrePostSql | None = None
    csv_datasource: str | None = None


class RequestStepParams(BaseModel):
    """teststeps[].request"""

    model_config = {"populate_by_name": True}

    method: str = "GET"
    url: str
    headers: dict[str, Any] = Field(default_factory=dict)
    params: dict[str, Any] = Field(default_factory=dict)
    json_body: dict[str, Any] | list[Any] | None = Field(default=None, alias="json")
    data: dict[str, Any] | None = None
    files: dict[str, Any] | None = None
    cookies: dict[str, Any] = Field(default_factory=dict)
    timeout: int = 30
    allow_redirects: bool = True
    verify: bool = True


class StepDefinition(BaseModel):
    """单条测试步骤 - 通用字段（避免与 pytest 的 Test* 混淆）"""

    name: str
    keyword_type: str  # request / assertion / extract / db / custom
    keyword_name: str
    enabled: bool = True
    request: RequestStepParams | None = None
    # assertion / extract / db / custom 等参数略，按需扩展


class Ddts(BaseModel):
    """ddts - 数据驱动"""

    name: str
    parameters: list[dict[str, Any]]


class CaseModel(BaseModel):
    """YAML 顶层结构"""

    config: Config
    teststeps: list[StepDefinition]
    ddts: Ddts | None = None
