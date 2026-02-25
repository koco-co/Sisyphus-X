# Models module - SQLAlchemy 2.0 database tables

# 核心模型
from .ai_config import AIProviderConfig
from .ai_conversation import AIConversation

# API 测试模型
from .api_test_case import ApiTestCase, ApiTestExecution, ApiTestStep, ApiTestStepResult

# 其他模型
from .document import Document, DocumentVersion
from .file_attachment import FileAttachment
from .functional_test_case import FunctionalTestCase
from .functional_test_point import TestPoint
from .global_param import GlobalParam
from .keyword import Keyword
from .project import Interface, InterfaceFolder, Project, ProjectDataSource, ProjectEnvironment
from .report import TestReport, TestReportDetail
from .requirement import Requirement
from .scenario import Dataset, Scenario, ScenarioStep
from .settings import GlobalConfig, NotificationChannel, Role, UserRole
from .test_case import TestCase
from .test_case_knowledge import TestCaseKnowledge
from .test_case_template import TestCaseTemplate
from .test_execution import TestExecution
from .test_plan import PlanExecutionStep, PlanScenario, TestPlan, TestPlanExecution
from .user import User
from .user_management import AuditLog, Permission

__all__ = [
    # 核心模型
    "User",
    "Project",
    "Interface",
    "InterfaceFolder",
    "ProjectEnvironment",
    "ProjectDataSource",
    "Scenario",
    "ScenarioStep",
    "Dataset",
    "TestCase",
    "Keyword",
    "TestReport",
    "TestReportDetail",
    "TestPlan",
    # API 测试模型
    "ApiTestCase",
    "ApiTestStep",
    "ApiTestExecution",
    "ApiTestStepResult",
    # 功能测试模块模型
    "AIProviderConfig",
    "Requirement",
    "AIConversation",
    "TestPoint",
    "FunctionalTestCase",
    "TestCaseKnowledge",
    "TestCaseTemplate",
    "FileAttachment",
    # 其他模型
    "Document",
    "DocumentVersion",
    "GlobalParam",
    "TestExecution",
    "PlanScenario",
    "TestPlanExecution",
    "PlanExecutionStep",
    "GlobalConfig",
    "NotificationChannel",
    "Role",
    "UserRole",
    "Permission",
    "AuditLog",
]
