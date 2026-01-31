# Models module - SQLModel database tables

# 核心模型
from .user import User
from .project import Project, Interface, InterfaceFolder, ProjectEnvironment, ProjectDataSource
from .scenario import TestScenario
from .test_case import TestCase
from .keyword import Keyword
from .report import TestReport, TestReportDetail
from .plan import TestPlan

# API 测试模型
from .api_test_case import ApiTestCase, ApiTestStep, ApiTestExecution, ApiTestStepResult

# 功能测试模块模型
from .ai_config import AIProviderConfig
from .requirement import Requirement
from .ai_conversation import AIConversation
from .functional_test_point import TestPoint
from .functional_test_case import FunctionalTestCase
from .test_case_knowledge import TestCaseKnowledge
from .test_case_template import TestCaseTemplate
from .file_attachment import FileAttachment

# 其他模型
from .document import Document
from .test_execution import TestExecution
from .settings import GlobalConfig, NotificationChannel
from .user_management import Permission, AuditLog

__all__ = [
    # 核心模型
    "User",
    "Project",
    "Interface",
    "InterfaceFolder",
    "ProjectEnvironment",
    "ProjectDataSource",
    "TestScenario",
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
    "TestExecution",
    "GlobalConfig",
    "NotificationChannel",
    "Permission",
    "AuditLog",
]
