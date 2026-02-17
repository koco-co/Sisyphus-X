"""
参数解析器 - 组装完整的执行参数
"""

from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Environment
from app.models.test_case import TestCase

from . import ExecutionRequest, TestCaseForm
from .keyword_injector import KeywordInjector
from .yaml_generator import YAMLGenerator


class ParameterParser:
    """参数解析器"""

    def __init__(self):
        self.yaml_generator = YAMLGenerator()
        self.keyword_injector = KeywordInjector()

    async def parse_execution_request(
        self, session: AsyncSession, test_case: TestCase, environment_id: Optional[int] = None
    ) -> ExecutionRequest:
        """
        解析执行请求，组装完整的执行参数
        """
        base_url: Optional[str] = None
        env_variables: dict[str, Any] = {}

        if environment_id:
            environment = await session.get(Environment, environment_id)
            if environment:
                base_url = environment.domain
                env_variables = environment.variables or {}

        # 优先使用模型中已有的 YAML 内容
        yaml_content = getattr(test_case, "yaml_content", "") or ""

        # 如果没有 YAML，则尝试从 form_data 动态生成
        if not yaml_content:
            form_data = self._build_form_data(test_case)
            yaml_content = self.yaml_generator.generate_from_form(form_data)

        project_id = getattr(test_case, "project_id", None)
        dynamic_keywords = (
            await self.keyword_injector.prepare_keywords_for_execution(session, project_id)
            if project_id
            else []
        )

        return ExecutionRequest(
            yaml_content=yaml_content,
            base_url=base_url,
            variables=env_variables,
            dynamic_keywords=dynamic_keywords,
            timeout=300,
        )

    def _build_form_data(self, test_case: TestCase) -> TestCaseForm:
        """从测试用例对象构造 YAML 生成所需表单。"""
        raw_form_data = getattr(test_case, "form_data", None)
        if isinstance(raw_form_data, dict):
            return TestCaseForm(**raw_form_data)

        steps_data = getattr(test_case, "steps_data", None)
        steps = self._normalize_steps(steps_data)

        return TestCaseForm(
            id=getattr(test_case, "id", None),
            name=getattr(test_case, "title", None) or getattr(test_case, "name", None) or "Test Case",
            project_id=getattr(test_case, "project_id", None),
            steps=steps,
        )

    def _normalize_steps(self, steps_data: Any) -> list[dict[str, Any]]:
        """
        规整历史 steps_data，保证 YAML 生成器至少能消费。
        """
        if not isinstance(steps_data, list):
            return []

        normalized: list[dict[str, Any]] = []
        for index, step in enumerate(steps_data, start=1):
            if not isinstance(step, dict):
                continue

            name = step.get("name") or step.get("step") or f"step_{index}"
            step_type = step.get("type", "wait")
            if step_type == "wait":
                params = step.get("params")
                if not isinstance(params, dict):
                    params = {"wait_type": "fixed", "seconds": 1}
                normalized.append({"name": str(name), "type": "wait", "params": params})
                continue

            params = step.get("params")
            if not isinstance(params, dict):
                params = {}

            normalized.append({"name": str(name), "type": str(step_type), "params": params})

        return normalized
