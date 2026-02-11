# Models module - SQLModel database tables

# 核心模型
# 功能测试模块模型
from .ai_config import AIProviderConfig
from .ai_conversation import AIConversation

# API 测试模型
from .api_test_case import ApiTestCase, ApiTestExecution, ApiTestStep, ApiTestStepResult

# 其他模型
from .document import Document
from .file_attachment import FileAttachment
from .functional_test_case import FunctionalTestCase
from .functional_test_point import TestPoint
from .keyword import Keyword
from .plan import TestPlan
from .project import Interface, InterfaceFolder, Project, ProjectDataSource, ProjectEnvironment
from .report import TestReport, TestReportDetail
from .requirement import Requirement
from .scenario import TestScenario
from .settings import GlobalConfig, NotificationChannel
from .test_case import TestCase
from .test_case_knowledge import TestCaseKnowledge
from .test_case_template import TestCaseTemplate
from .test_execution import TestExecution
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
