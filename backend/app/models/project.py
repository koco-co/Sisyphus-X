from datetime import datetime

from sqlmodel import JSON, Column, Field, SQLModel


class Project(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str  # 项目名称
    key: str  # 项目标识 (如: ORDER_CENTER)
    owner: str  # 负责人
    description: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class InterfaceFolder(SQLModel, table=True):
    """接口文件夹 - 支持树形组织结构"""

    __tablename__ = "interfacefolder"  # pyright: ignore[reportAssignmentType]
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    name: str  # 文件夹名称
    parent_id: int | None = Field(
        default=None, foreign_key="interfacefolder.id"
    )  # 父文件夹ID (支持树形结构)
    order: int = Field(default=0, description="同级排序序号")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Interface(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    folder_id: int | None = Field(default=None, foreign_key="interfacefolder.id")  # 所属文件夹
    name: str  # 接口名称
    url: str  # 接口路径
    method: str  # GET/POST/PUT/DELETE
    status: str = "draft"  # draft/stable/deprecated
    description: str | None = None  # 接口描述
    headers: dict = Field(default={}, sa_column=Column(JSON))  # 请求头
    params: dict = Field(default={}, sa_column=Column(JSON))  # Query 参数
    body: dict = Field(default={}, sa_column=Column(JSON))  # 请求体
    body_type: str = "json"  # none/json/form-data/x-www-form-urlencoded/raw
    cookies: dict = Field(default={}, sa_column=Column(JSON))  # Cookies
    order: int = Field(default=0, description="同级排序序号")
    auth_config: dict = Field(default={}, sa_column=Column(JSON), description="认证配置")
    # 存储 Swagger 解析后的原始结构
    schema_snapshot: dict = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProjectEnvironment(SQLModel, table=True):
    """项目环境配置 - 存储不同环境的URL、变量、请求头"""

    __tablename__ = "projectenvironment"  # pyright: ignore[reportAssignmentType]
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    name: str  # 环境名称 (如: Dev, Test, Prod)
    domain: str = ""  # Base URL (如: https://api-dev.example.com)
    variables: dict = Field(default={}, sa_column=Column(JSON))  # 全局变量
    headers: dict = Field(default={}, sa_column=Column(JSON))  # 全局请求头
    is_preupload: bool = Field(default=False, description="是否预上传")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProjectDataSource(SQLModel, table=True):
    """项目数据源配置 - 存储数据库连接信息"""

    __tablename__ = "projectdatasource"  # pyright: ignore[reportAssignmentType]
    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    name: str  # 数据源名称 (如: 主库, 从库)
    db_type: str  # 数据库类型 (mysql, postgresql, mongodb, redis)
    host: str
    port: int
    db_name: str = ""  # 数据库名
    username: str = ""
    password_hash: str = ""  # 加密存储的密码

    # 新增配置字段
    variable_name: str = ""  # 引用变量名
    is_enabled: bool = Field(default=True)  # 是否启用
    status: str = "unchecked"  # unchecked, connected, error
    last_test_at: datetime | None = None
    error_msg: str | None = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# 别名，用于简化导入
Environment = ProjectEnvironment
