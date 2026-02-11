"""
结果解析器 - 解析执行器返回的原始结果

功能：
- 解析 JSON 输出
- 提取失败信息
- 计算统计数据
- 保存到数据库
"""

import json
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from . import ExecutionResult, PerformanceMetrics, Statistics, StepResult, TestCaseInfo
from .exceptions import ResultParseException


class ResultParser:
    """结果解析器"""

    def parse(self, raw_output: str) -> ExecutionResult:
        """
        解析原始输出为结构化数据

        Args:
            raw_output: JSON格式的执行器输出

        Returns:
            ExecutionResult
        """
        try:
            data = json.loads(raw_output)
            return self._parse_execution_result(data)
        except json.JSONDecodeError as e:
            raise ResultParseException(f"Invalid JSON format: {e}")

    def _parse_execution_result(self, data: dict[str, Any]) -> ExecutionResult:
        """解析执行结果"""
        # 提取测试用例信息
        tc_data = data.get("test_case", {})
        test_case_info = TestCaseInfo(
            name=tc_data.get("name", "Unknown"),
            status=tc_data.get("status", "error"),
            start_time=tc_data.get("start_time", ""),
            end_time=tc_data.get("end_time", ""),
            duration=tc_data.get("duration", 0),
        )

        # 提取步骤结果
        steps_data = data.get("steps", [])
        steps = []
        for step_data in steps_data:
            # 提取性能指标
            perf_data = step_data.get("performance", {})
            performance = None
            if perf_data:
                performance = PerformanceMetrics(
                    total_time=perf_data.get("total_time", 0),
                    dns_time=perf_data.get("dns_time"),
                    tcp_time=perf_data.get("tcp_time"),
                    tls_time=perf_data.get("tls_time"),
                    server_time=perf_data.get("server_time"),
                    download_time=perf_data.get("download_time"),
                    size=perf_data.get("size"),
                )

            step = StepResult(
                name=step_data.get("name", "Unknown"),
                status=step_data.get("status", "error"),
                start_time=step_data.get("start_time", ""),
                end_time=step_data.get("end_time", ""),
                duration=step_data.get("duration", 0) / 1000 if step_data.get("duration") else 0,
                error=step_data.get("error") or step_data.get("message"),
                performance=performance,
                response=step_data.get("response"),
            )
            steps.append(step)

        # 提取统计信息
        stats_data = data.get("statistics", {})
        statistics = Statistics(
            total_steps=stats_data.get("total_steps", 0),
            passed_steps=stats_data.get("passed_steps", 0),
            failed_steps=stats_data.get("failed_steps", 0),
            skipped_steps=stats_data.get("skipped_steps", 0),
            pass_rate=stats_data.get("pass_rate", 0.0),
        )

        # 判断是否成功
        success = test_case_info.status == "passed"

        return ExecutionResult(
            success=success,
            test_case=test_case_info,
            steps=steps,
            statistics=statistics,
            final_variables=data.get("final_variables", {}),
            performance_metrics=data.get("performance_metrics"),
            error=None if success else self._extract_error(steps),
            duration=test_case_info.duration,
        )

    def extract_failures(self, result: ExecutionResult) -> list[dict[str, Any]]:
        """提取失败信息"""
        failures = []

        for step in result.steps:
            if step.status == "failed" or step.status == "error":
                failures.append(
                    {"step_name": step.name, "error": step.error, "status": step.status}
                )

        return failures

    def calculate_statistics(self, result: ExecutionResult) -> dict[str, Any]:
        """计算统计数据"""
        return {
            "total_duration": result.duration,
            "total_steps": result.statistics.total_steps,
            "passed_steps": result.statistics.passed_steps,
            "failed_steps": result.statistics.failed_steps,
            "pass_rate": result.statistics.pass_rate,
            "avg_step_duration": sum(s.duration for s in result.steps) / len(result.steps)
            if result.steps
            else 0,
        }

    async def save_to_database(
        self, result: ExecutionResult, test_case_id: int, environment_id: int, session: AsyncSession
    ) -> int:
        """
        保存结果到数据库

        Args:
            result: 执行结果
            test_case_id: 测试用例ID
            environment_id: 环境ID
            session: 数据库会话

        Returns:
            执行记录ID
        """
        from app.models.test_execution import TestExecution

        execution = TestExecution(
            test_case_id=test_case_id,
            environment_id=environment_id,
            status="success" if result.success else "failed",
            result_data=result.dict(),
            duration=result.duration,
            started_at=datetime.fromisoformat(result.test_case.start_time)
            if result.test_case.start_time
            else None,
            completed_at=datetime.fromisoformat(result.test_case.end_time)
            if result.test_case.end_time
            else None,
        )

        session.add(execution)
        await session.commit()
        await session.refresh(execution)

        return execution.id

    def _extract_error(self, steps: list[StepResult]) -> str:
        """从步骤中提取错误信息"""
        for step in steps:
            if step.status == "failed" or step.status == "error":
                return step.error or f"Step '{step.name}' failed"
        return "Unknown error"
