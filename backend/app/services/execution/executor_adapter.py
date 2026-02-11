"""
执行器适配器 - 封装对 Sisyphus-api-engine 的调用

负责调用 Sisyphus-api-engine CLI，传递参数，解析返回结果
"""

import asyncio
import json
import os
import subprocess
import tempfile

from . import (
    ExecutionRequest,
    ExecutionResult,
    PerformanceMetrics,
    Statistics,
    StepResult,
    TestCaseInfo,
)
from .exceptions import ExecutionTimeoutException, ExecutorException


class ExecutorAdapter:
    """Sisyphus-api-engine 适配器"""

    EXECUTOR_CMD = "sisyphus-api-engine"

    def __init__(self, timeout: int = 300):
        """
        初始化适配器

        Args:
            timeout: 默认超时时间（秒）
        """
        self.timeout = timeout

    async def execute(self, request: ExecutionRequest) -> ExecutionResult:
        """
        执行测试用例

        Args:
            request: 执行请求

        Returns:
            执行结果

        Raises:
            ExecutorException: 执行失败
            ExecutionTimeoutException: 执行超时
        """
        # 1. 创建临时YAML文件
        yaml_path = self._create_temp_file(request.yaml_content)

        try:
            # 2. 构建命令
            cmd = self._build_command(yaml_path, request)

            # 3. 执行
            result = await self._run_executor(cmd, request.timeout or self.timeout)

            # 4. 解析结果
            return self._parse_result(result.stdout, result.stderr)

        finally:
            # 5. 清理临时文件
            if os.path.exists(yaml_path):
                os.unlink(yaml_path)

    def _create_temp_file(self, content: str) -> str:
        """创建临时YAML文件"""
        fd, path = tempfile.mkstemp(suffix=".yaml", text=True)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(content)
        return path

    def _build_command(self, yaml_path: str, request: ExecutionRequest) -> list[str]:
        """构建执行命令"""
        cmd = [
            self.EXECUTOR_CMD,
            "--cases",
            yaml_path,
            "--format",
            request.output_format,  # json
        ]

        # 添加基础URL
        if request.base_url:
            cmd.extend(["--override", f"base_url={request.base_url}"])

        # 添加环境变量
        if request.variables:
            cmd.extend(["--override", f"variables={json.dumps(request.variables)}"])

        # 添加动态关键字
        if request.dynamic_keywords:
            # 注意：这里假设执行器支持 --dynamic-keywords 参数
            # 如果不支持，需要通过其他方式传递（如临时文件）
            cmd.extend(["--dynamic-keywords", json.dumps(request.dynamic_keywords)])

        return cmd

    async def _run_executor(self, cmd: list[str], timeout: int) -> subprocess.CompletedProcess:
        """
        运行执行器

        Args:
            cmd: 命令列表
            timeout: 超时时间

        Returns:
            进程结果

        Raises:
            ExecutionTimeoutException: 执行超时
        """
        try:
            # 使用 asyncio 运行子进程
            proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)

            return subprocess.CompletedProcess(
                args=cmd,
                returncode=proc.returncode,
                stdout=stdout.decode("utf-8"),
                stderr=stderr.decode("utf-8"),
            )

        except TimeoutError:
            # 超时则杀死进程
            if "proc" in locals():
                proc.kill()
                await proc.wait()
            raise ExecutionTimeoutException(f"Execution timeout after {timeout} seconds")

    def _parse_result(self, stdout: str, stderr: str) -> ExecutionResult:
        """
        解析执行器输出

        Args:
            stdout: 标准输出
            stderr: 标准错误

        Returns:
            执行结果

        Raises:
            ExecutorException: 解析失败
        """
        if not stdout:
            return ExecutionResult(
                success=False,
                test_case=TestCaseInfo(
                    name="Unknown", status="error", start_time="", end_time="", duration=0
                ),
                steps=[],
                statistics=Statistics(
                    total_steps=0, passed_steps=0, failed_steps=0, skipped_steps=0, pass_rate=0.0
                ),
                final_variables={},
                error=stderr or "No output from executor",
            )

        try:
            # 解析JSON
            data = json.loads(stdout)

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
                    duration=step_data.get("duration", 0) / 1000
                    if step_data.get("duration")
                    else 0,  # ms -> s
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

        except json.JSONDecodeError as e:
            raise ExecutorException(f"Failed to parse executor output: {e}\nOutput: {stdout[:500]}")

    def _extract_error(self, steps: list[StepResult]) -> str | None:
        """从步骤中提取错误信息"""
        for step in steps:
            if step.status == "failed" or step.status == "error":
                return step.error or f"Step '{step.name}' failed"
        return None
