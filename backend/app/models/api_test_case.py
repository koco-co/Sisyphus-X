"""
API 测试用例模型 - SQLAlchemy 2.0 ORM
用于存储 Sisyphus-api-engine 的测试用例配置
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from typing import Optional, Dict, Any, List


class ApiTestCase(Base):
    """API 测试用例表"""

    __tablename__ = "api_test_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID 主键
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # 基本信息
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # YAML 配置（存储原始 YAML 内容，用于直接导入/导出）
    yaml_content: Mapped[str] = mapped_column(Text, default="")

    # 结构化配置（JSON 格式，便于前端编辑）
    config_data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    # 环境配置关联
    environment_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("project_environments.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # 标签和状态
    tags: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # 元数据
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=lambda: datetime.utcnow(), nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # 软删除
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)


class ApiTestStep(Base):
    """API 测试步骤表（可选，如果需要单独管理步骤）"""

    __tablename__ = "api_test_steps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID 主键
    test_case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("api_test_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # 步骤序号
    step_order: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    # 步骤配置
    step_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # request, database, wait, loop, script, concurrent
    step_config: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    # 步骤元数据
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=lambda: datetime.utcnow(), nullable=False)


class ApiTestExecution(Base):
    """API 测试执行记录表"""

    __tablename__ = "api_test_executions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID 主键
    test_case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("api_test_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    environment_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("project_environments.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # 执行状态
    status: Mapped[str] = mapped_column(
        String(20), default="pending", index=True
    )  # pending, running, passed, failed, skipped, error

    # 时间信息
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration: Mapped[Optional[float]] = mapped_column(nullable=True)  # 执行时长（秒）

    # 执行结果（存储 API Engine 的完整 JSON 输出）
    result_data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    # 统计信息
    total_steps: Mapped[int] = mapped_column(Integer, default=0)
    passed_steps: Mapped[int] = mapped_column(Integer, default=0)
    failed_steps: Mapped[int] = mapped_column(Integer, default=0)
    skipped_steps: Mapped[int] = mapped_column(Integer, default=0)

    # 错误信息
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # AssertionError, TimeoutError, ConnectionError, etc.
    error_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # assertion, network, timeout, parsing, business, system

    # 执行选项
    execution_options: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=lambda: datetime.utcnow(), nullable=False)


class ApiTestStepResult(Base):
    """API 测试步骤执行结果表（可选，用于详细分析）"""

    __tablename__ = "api_test_step_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID 主键
    execution_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("api_test_executions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # 步骤信息
    step_name: Mapped[str] = mapped_column(String(255), nullable=False)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    step_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # 执行状态
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # success, failed, skipped, error

    # 时间信息
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration: Mapped[Optional[float]] = mapped_column(nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)

    # 性能指标
    performance_metrics: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    # 响应数据
    response_data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    # 验证结果
    validations: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)

    # 提取的变量
    extracted_vars: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    # 错误信息
    error_info: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=lambda: datetime.utcnow(), nullable=False)
