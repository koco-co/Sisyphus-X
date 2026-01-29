"""
参数解析器 - 组装完整的执行参数
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.test_case import TestCase
from app.models.project import Environment
from . import ExecutionRequest, TestCaseForm
from .yaml_generator import YAMLGenerator
from .keyword_injector import KeywordInjector


class ParameterParser:
    """参数解析器"""

    def __init__(self):
        self.yaml_generator = YAMLGenerator()
        self.keyword_injector = KeywordInjector()

    async def parse_execution_request(
        self,
        session: AsyncSession,
        test_case: TestCase,
        environment_id: Optional[int] = None
    ) -> ExecutionRequest:
        """
        解析执行请求，组装完整的执行参数

        Args:
            session: 数据库会话
            test_case: 测试用例实例
            environment_id: 环境ID（可选）

        Returns:
            ExecutionRequest
        """
        # 1. 加载环境配置
        environment = None
        base_url = None
        env_variables = {}

        if environment_id:
            environment = await session.get(Environment, environment_id)
            if environment:
                base_url = environment.domain
                env_variables = environment.variables or {}

        # 2. 生成YAML（注意：这里假设 TestCase 有 form_data 字段）
        # 如果实际模型不同，需要调整
        if hasattr(test_case, 'form_data') and test_case.form_data:
            form_data_dict = test_case.form_data if isinstance(test_case.form_data, dict) else {}
            form_data = TestCaseForm(**form_data_dict)
        else:
            # 如果没有 form_data，使用基本信息创建
            form_data = TestCaseForm(
                name=test_case.name or "Test Case",
                project_id=test_case.project_id,
                steps=[],
                variables={}
            )

        yaml_content = self.yaml_generator.generate_from_form(form_data)

        # 3. 合并变量
        variables = {**env_variables}
        if form_data.variables:
            variables.update(form_data.variables)

        # 4. 收集关键字
        dynamic_keywords = await self.keyword_injector.prepare_keywords_for_execution(
            session, test_case.project_id
        )

        # 5. 构建请求
        return ExecutionRequest(
            yaml_content=yaml_content,
            base_url=base_url,
            variables=variables,
            dynamic_keywords=dynamic_keywords,
            timeout=300,
            environment=environment.name if environment else None
        )
