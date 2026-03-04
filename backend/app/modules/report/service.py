"""报告服务层 - 业务逻辑

提供报告的查询、生成、导出等核心功能。
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models_new.execution import Execution, ExecutionStep, Report
from app.modules.report.schemas import (
    ReportBriefResponse,
    ReportDetailResponse,
    ReportStatistics,
    ScenarioResult,
    StepResult,
)

logger = logging.getLogger(__name__)


class ReportService:
    """报告服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(
        self,
        project_id: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ReportBriefResponse], int]:
        """获取报告列表

        Args:
            project_id: 项目 ID (可选，用于过滤)
            page: 页码
            page_size: 每页数量

        Returns:
            (报告列表, 总数)
        """
        # 构建基础查询
        query = (
            select(Report)
            .options(
                selectinload(Report.execution).selectinload(
                    Execution.plan
                ),
                selectinload(Report.execution).selectinload(
                    Execution.environment
                ),
            )
            .order_by(Report.created_at.desc())
        )

        # 项目过滤
        if project_id:
            # 通过 execution -> plan/scenario 关联过滤项目
            from app.models.plan import TestPlan
            from app.models.scenario import Scenario

            # 这里的逻辑需要调整，因为 Execution 通过 plan_id 或 scenario_id 关联
            # 我们需要通过 Execution 表来过滤
            execution_query = select(Execution.id).where(
                (Execution.plan_id.in_(
                    select(TestPlan.id).where(TestPlan.project_id == project_id)
                ))
                | (Execution.scenario_id.in_(
                    select(Scenario.id).where(Scenario.project_id == project_id)
                ))
            )
            query = query.where(Report.execution_id.in_(execution_query))

        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.session.scalar(count_query) or 0

        # 分页
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.session.execute(query)
        reports = result.scalars().all()

        # 转换为响应格式
        items = []
        for report in reports:
            execution = report.execution
            plan_name = execution.plan.name if execution.plan else None
            environment_name = (
                execution.environment.name if execution.environment else None
            )

            # 获取 scenario_name (需要单独查询)
            scenario_name = None
            if execution.scenario_id:
                scenario = await self.session.get(
                    "Scenario", execution.scenario_id
                )
                scenario_name = scenario.name if scenario else None

            items.append(
                ReportBriefResponse(
                    id=UUID(report.id),
                    execution_id=UUID(report.execution_id),
                    report_type=report.report_type,
                    created_at=report.created_at,
                    expires_at=report.expires_at,
                    execution_status=execution.status,
                    started_at=execution.started_at,
                    finished_at=execution.finished_at,
                    total_scenarios=execution.total_scenarios,
                    passed_scenarios=execution.passed_scenarios,
                    failed_scenarios=execution.failed_scenarios,
                    plan_name=plan_name,
                    scenario_name=scenario_name,
                    environment_name=environment_name,
                )
            )

        return items, total

    async def get(self, report_id: str) -> ReportDetailResponse | None:
        """获取报告详情

        Args:
            report_id: 报告 ID

        Returns:
            报告详情，如果不存在返回 None
        """
        report = await self.session.get(
            Report, report_id, options=[selectinload(Report.execution)]
        )
        if not report:
            return None

        return await self._build_detail_response(report)

    async def get_by_execution(
        self, execution_id: str
    ) -> ReportDetailResponse | None:
        """根据执行 ID 获取报告

        Args:
            execution_id: 执行 ID

        Returns:
            报告详情，如果不存在返回 None
        """
        query = (
            select(Report)
            .where(Report.execution_id == execution_id)
            .options(selectinload(Report.execution))
        )
        result = await self.session.execute(query)
        report = result.scalar_one_or_none()

        if not report:
            return None

        return await self._build_detail_response(report)

    async def _build_detail_response(
        self, report: Report
    ) -> ReportDetailResponse:
        """构建报告详情响应

        Args:
            report: 报告对象

        Returns:
            报告详情响应
        """
        execution = report.execution

        # 获取关联名称
        plan_name = None
        scenario_name = None
        environment_name = None

        if execution.plan_id:
            plan = await self.session.get("TestPlan", execution.plan_id)
            plan_name = plan.name if plan else None

        if execution.scenario_id:
            from app.models.scenario import Scenario

            scenario = await self.session.get(Scenario, execution.scenario_id)
            scenario_name = scenario.name if scenario else None

        if execution.environment_id:
            environment = await self.session.get(
                "Environment", execution.environment_id
            )
            environment_name = environment.name if environment else None

        # 获取执行步骤
        steps_query = (
            select(ExecutionStep)
            .where(ExecutionStep.execution_id == execution.id)
            .order_by(ExecutionStep.started_at)
        )
        steps_result = await self.session.execute(steps_query)
        steps = steps_result.scalars().all()

        # 统计步骤数据
        total_steps = len(steps)
        passed_steps = sum(1 for s in steps if s.status == "passed")
        failed_steps = sum(1 for s in steps if s.status == "failed")

        # 计算执行耗时
        duration_ms = 0
        if execution.started_at and execution.finished_at:
            delta = execution.finished_at - execution.started_at
            duration_ms = int(delta.total_seconds() * 1000)

        # 计算通过率
        pass_rate = 0.0
        if execution.total_scenarios > 0:
            pass_rate = round(
                (execution.passed_scenarios / execution.total_scenarios) * 100,
                2,
            )

        statistics = ReportStatistics(
            total_scenarios=execution.total_scenarios,
            passed_scenarios=execution.passed_scenarios,
            failed_scenarios=execution.failed_scenarios,
            skipped_scenarios=execution.skipped_scenarios,
            total_steps=total_steps,
            passed_steps=passed_steps,
            failed_steps=failed_steps,
            pass_rate=pass_rate,
            duration_ms=duration_ms,
        )

        # 按场景分组步骤
        scenarios = await self._group_steps_by_scenario(steps)

        return ReportDetailResponse(
            id=UUID(report.id),
            execution_id=UUID(report.execution_id),
            report_type=report.report_type,
            storage_path=report.storage_path,
            expires_at=report.expires_at,
            created_at=report.created_at,
            execution_status=execution.status,
            started_at=execution.started_at,
            finished_at=execution.finished_at,
            plan_name=plan_name,
            scenario_name=scenario_name,
            environment_name=environment_name,
            statistics=statistics,
            scenarios=scenarios,
        )

    async def _group_steps_by_scenario(
        self, steps: list[ExecutionStep]
    ) -> list[ScenarioResult]:
        """按场景分组步骤

        Args:
            steps: 步骤列表

        Returns:
            场景结果列表
        """
        # 按 scenario_id 分组
        scenario_map: dict[str, list[ExecutionStep]] = {}
        for step in steps:
            scenario_id = step.scenario_id or "no-scenario"
            if scenario_id not in scenario_map:
                scenario_map[scenario_id] = []
            scenario_map[scenario_id].append(step)

        scenarios = []
        for scenario_id, scenario_steps in scenario_map.items():
            # 获取场景名称
            scenario_name = "未分类步骤"
            if scenario_id != "no-scenario":
                from app.models.scenario import Scenario

                scenario = await self.session.get(Scenario, scenario_id)
                scenario_name = scenario.name if scenario else "未知场景"

            # 计算场景状态和耗时
            status = "passed"
            total_duration = 0
            started_at = None
            finished_at = None

            step_results = []
            for step in scenario_steps:
                # 步骤耗时
                step_duration = 0
                if step.started_at and step.finished_at:
                    step_duration = int(
                        (step.finished_at - step.started_at).total_seconds()
                        * 1000
                    )
                    total_duration += step_duration
                    if started_at is None or step.started_at < started_at:
                        started_at = step.started_at
                    if finished_at is None or step.finished_at > finished_at:
                        finished_at = step.finished_at

                if step.status == "failed":
                    status = "failed"

                step_results.append(
                    StepResult(
                        id=UUID(step.id),
                        step_name=step.step_name,
                        status=step.status,
                        started_at=step.started_at,
                        finished_at=step.finished_at,
                        duration_ms=step_duration if step_duration > 0 else None,
                        request_data=step.request_data,
                        response_data=step.response_data,
                        assertions=step.assertions,
                        error_message=step.error_message,
                    )
                )

            scenarios.append(
                ScenarioResult(
                    scenario_id=(
                        UUID(scenario_id) if scenario_id != "no-scenario" else None
                    ),
                    scenario_name=scenario_name,
                    status=status,
                    started_at=started_at,
                    finished_at=finished_at,
                    duration_ms=total_duration if total_duration > 0 else None,
                    steps=step_results,
                )
            )

        return scenarios

    async def generate_report(
        self, execution_id: str, report_type: str = "platform"
    ) -> Report:
        """生成报告

        Args:
            execution_id: 执行 ID
            report_type: 报告类型 (platform/allure)

        Returns:
            生成的报告
        """
        execution = await self.session.get(Execution, execution_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        # 检查是否已存在报告
        existing_query = select(Report).where(
            Report.execution_id == execution_id
        )
        existing = await self.session.scalar(existing_query)
        if existing:
            return existing

        # 创建新报告
        report = Report(
            execution_id=execution_id,
            report_type=report_type,
            expires_at=datetime.utcnow() + timedelta(days=30),
        )
        self.session.add(report)
        await self.session.commit()
        await self.session.refresh(report)

        logger.info(f"Generated report {report.id} for execution {execution_id}")
        return report

    async def delete(self, report_id: str) -> bool:
        """删除报告

        Args:
            report_id: 报告 ID

        Returns:
            是否删除成功
        """
        report = await self.session.get(Report, report_id)
        if not report:
            return False

        await self.session.delete(report)
        await self.session.commit()
        return True

    async def cleanup_expired(self) -> int:
        """清理过期报告

        Returns:
            清理的报告数量
        """
        query = select(Report).where(
            Report.expires_at < datetime.utcnow()
        )
        result = await self.session.execute(query)
        expired_reports = result.scalars().all()

        count = 0
        for report in expired_reports:
            await self.session.delete(report)
            count += 1

        if count > 0:
            await self.session.commit()
            logger.info(f"Cleaned up {count} expired reports")

        return count
