"""
执行器适配器 - 通过内嵌引擎执行测试用例
"""

import asyncio
import os
import tempfile

from app.engine.core.runner import load_case, run_case
from app.engine.errors import EngineError

from . import (
    ExecutionRequest,
    ExecutionResult,
    Statistics,
    StepResult,
    TestCaseInfo,
)
from .exceptions import ExecutorException


class ExecutorAdapter:
    """内嵌 sisyphus-api-engine 适配器"""

    def __init__(self, timeout: int = 300):
        self.timeout = timeout

    async def execute(self, request: ExecutionRequest) -> ExecutionResult:
        """执行测试用例"""
        yaml_path = self._create_temp_file(request.yaml_content)

        try:
            result = await asyncio.to_thread(self._run_engine, yaml_path)
            return self._parse_result(result)
        except EngineError as e:
            raise ExecutorException(f"[{e.code}] {e.message}") from e
        finally:
            if os.path.exists(yaml_path):
                os.unlink(yaml_path)

    def _create_temp_file(self, content: str) -> str:
        fd, path = tempfile.mkstemp(suffix=".yaml", text=True)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(content)
        return path

    def _run_engine(self, yaml_path: str) -> dict:
        case = load_case(yaml_path)
        result = run_case(case, verbose=False)
        return result.model_dump(mode="json")

    def _parse_result(self, data: dict) -> ExecutionResult:
        status = data.get("status", "error")
        summary = data.get("summary", {})
        steps_data = data.get("steps", [])

        test_case_info = TestCaseInfo(
            name=data.get("scenario_name", "Unknown"),
            status=status,
            start_time=data.get("start_time", ""),
            end_time=data.get("end_time", ""),
            duration=data.get("duration", 0),
        )

        steps = []
        for step_data in steps_data:
            step = StepResult(
                name=step_data.get("name", "Unknown"),
                status=step_data.get("status", "error"),
                start_time=step_data.get("start_time", ""),
                end_time=step_data.get("end_time", ""),
                duration=step_data.get("duration", 0),
                error=step_data.get("error"),
                response=step_data.get("response_detail"),
            )
            steps.append(step)

        statistics = Statistics(
            total_steps=summary.get("total_steps", 0),
            passed_steps=summary.get("passed", 0),
            failed_steps=summary.get("failed", 0),
            skipped_steps=summary.get("skipped", 0),
            pass_rate=summary.get("pass_rate", 0.0),
        )

        return ExecutionResult(
            success=status == "passed",
            test_case=test_case_info,
            steps=steps,
            statistics=statistics,
            final_variables=data.get("variables", {}),
            error=None if status == "passed" else self._extract_error(steps),
            duration=data.get("duration", 0),
        )

    def _extract_error(self, steps: list[StepResult]) -> str | None:
        for step in steps:
            if step.status in ("failed", "error"):
                return step.error or f"Step '{step.name}' failed"
        return None
