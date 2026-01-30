from typing import Optional, Dict
from datetime import datetime
from sqlmodel import SQLModel, Field, Column, JSON

class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str  # 项目名称
    key: str   # 项目标识 (如: ORDER_CENTER)
    owner: str # 负责人
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class InterfaceFolder(SQLModel, table=True):
    """接口文件夹 - 支持树形组织结构"""
    __tablename__ = "interfacefolder"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    name: str  # 文件夹名称
    parent_id: Optional[int] = Field(default=None, foreign_key="interfacefolder.id")  # 父文件夹ID (支持树形结构)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Interface(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    folder_id: Optional[int] = Field(default=None, foreign_key="interfacefolder.id")  # 所属文件夹
    name: str        # 接口名称
    url: str         # 接口路径
    method: str      # GET/POST/PUT/DELETE
    status: str = "draft"     # draft/stable/deprecated
    description: Optional[str] = None  # 接口描述
    headers: Dict = Field(default={}, sa_column=Column(JSON))  # 请求头
    params: Dict = Field(default={}, sa_column=Column(JSON))   # Query 参数
    body: Dict = Field(default={}, sa_column=Column(JSON))     # 请求体
    body_type: str = "json"  # none/json/form-data/x-www-form-urlencoded/raw
    cookies: Dict = Field(default={}, sa_column=Column(JSON))  # Cookies
    # 存储 Swagger 解析后的原始结构
    schema_snapshot: Dict = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)



class ProjectEnvironment(SQLModel, table=True):
    """项目环境配置 - 存储不同环境的URL、变量、请求头"""
    __tablename__ = "projectenvironment"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    name: str  # 环境名称 (如: Dev, Test, Prod)
    domain: str = ""  # Base URL (如: https://api-dev.example.com)
    variables: Dict = Field(default={}, sa_column=Column(JSON))  # 全局变量
    headers: Dict = Field(default={}, sa_column=Column(JSON))  # 全局请求头
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProjectDataSource(SQLModel, table=True):
    """项目数据源配置 - 存储数据库连接信息"""
    __tablename__ = "projectdatasource"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    name: str  # 数据源名称 (如: 主库, 从库)
    db_type: str  # 数据库类型 (mysql, postgresql, mongodb, redis)
    host: str
    port: int
    db_name: str = ""  # 数据库名
    username: str = ""
    password_hash: str = ""  # 加密存储的密码

    # 新增配置字段
    variable_name: str = ""   # 引用变量名
    is_enabled: bool = Field(default=True)  # 是否启用
    status: str = "unchecked" # unchecked, connected, error
    last_test_at: Optional[datetime] = None
    error_msg: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# 别名，用于简化导入
Environment = ProjectEnvironment

