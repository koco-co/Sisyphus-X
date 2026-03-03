"""新模型模块 - Phase 1 重构

这个模块包含重构后的 SQLAlchemy 2.0 async 模型。
模型定义在 models_new 目录中以避免与现有 models 目录冲突。

注意：这些模型将在 Phase 1 完成后替换现有模型。
"""

from app.models_new.database_config import DatabaseConfig
from app.models_new.environment import Environment, EnvironmentVariable, GlobalVariable
from app.models_new.execution import Execution, ExecutionStep, Report
from app.models_new.interface import Interface, InterfaceFolder
from app.models_new.keyword import Keyword
from app.models_new.plan import PlanScenario, TestPlan
from app.models_new.project import Project
from app.models_new.scenario import Scenario, ScenarioStep, TestDataset, DatasetRow
from app.models_new.setting import GlobalParam
from app.models_new.user import User

__all__ = [
    "User",
    "Project",
    "DatabaseConfig",
    "Environment",
    "EnvironmentVariable",
    "GlobalVariable",
    "InterfaceFolder",
    "Interface",
    "Keyword",
    "GlobalParam",
    "TestPlan",
    "PlanScenario",
    "Scenario",
    "ScenarioStep",
    "TestDataset",
    "DatasetRow",
    "Execution",
    "ExecutionStep",
    "Report",
]
