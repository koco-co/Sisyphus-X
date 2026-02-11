"""
执行调度器 - 统一管理测试执行
"""

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.test_case import TestCase
from app.models.test_execution import TestExecution

from . import ExecutionResult
from .executor_adapter import ExecutorAdapter
from .parameter_parser import ParameterParser


class ExecutionScheduler:
    """测试执行调度器"""

    def __init__(self):
        self.executor = ExecutorAdapter()
        self.parser = ParameterParser()

    async def execute_test_case(
        self, session: AsyncSession, test_case_id: int, environment_id: int | None = None
    ) -> ExecutionResult:
        """
        执行单个测试用例（同步）

        Args:
            session: 数据库会话
            test_case_id: 测试用例ID
            environment_id: 环境ID

        Returns:
            执行结果

        Raises:
            ValueError: 测试用例不存在
        """
        # 1. 加载测试用例
        test_case = await session.get(TestCase, test_case_id)
        if not test_case:
            raise ValueError(f"TestCase not found: {test_case_id}")

        # 2. 创建执行记录
        execution = TestExecution(
            test_case_id=test_case_id,
            environment_id=environment_id,
            status="running",
            started_at=datetime.utcnow(),
        )
        session.add(execution)
        await session.commit()
        await session.refresh(execution)

        # 3. 解析参数
        request = await self.parser.parse_execution_request(session, test_case, environment_id)

        # 4. 执行
        try:
            result = await self.executor.execute(request)

            # 5. 更新执行记录
            execution.status = "success" if result.success else "failed"
            execution.result_data = result.dict()
            execution.duration = result.duration
            execution.completed_at = datetime.utcnow()

            await session.commit()

            return result

        except Exception as e:
            # 错误处理
            execution.status = "error"
            execution.result_data = {"error": str(e)}
            execution.completed_at = datetime.utcnow()
            await session.commit()
            raise
