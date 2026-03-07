import asyncio
import logging
from datetime import timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.db import engine
from app.core.network import test_tcp_connection
from app.models.project import ProjectDataSource
from app.models.test_report import TestReport
from app.utils.datetime import utcnow

logger = logging.getLogger(__name__)

# Allure 报告保留天数 (RPT-004)
ALLURE_REPORT_RETENTION_DAYS = 30


async def check_datasources():
    """
    Background task to check database connections
    """
    logger.info("Starting background datasource check...")

    async_session = async_sessionmaker(engine, expire_on_commit=False)

    try:
        async with async_session() as session:
            # Get all enabled datasources
            statement = select(ProjectDataSource).where(
                ProjectDataSource.is_enabled.is_(True)
            )
            result = await session.execute(statement)
            datasources = result.scalars().all()

            for ds in datasources:
                logger.info(f"Checking datasource {ds.name} ({ds.host}:{ds.port})...")
                success, message = test_tcp_connection(ds.host, ds.port)

                ds.last_test_at = utcnow()
                if success:
                    ds.status = "connected"
                    ds.error_msg = None
                else:
                    ds.status = "error"
                    ds.error_msg = message

                session.add(ds)

            if datasources:
                await session.commit()
                logger.info(f"Updated status for {len(datasources)} datasources.")

    except Exception as e:
        logger.error(f"Error in datasource check task: {e}")


async def cleanup_expired_allure_reports():
    """
    BE-057 / RPT-004: 清理超过 30 天的 Allure 报告路径。
    仅将 allure_report_path 置空，报告记录保留；若实际文件存储于固定目录可在此扩展删除文件。
    """
    logger.info("Starting Allure report retention cleanup...")
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with async_session() as session:
            cutoff = utcnow() - timedelta(days=ALLURE_REPORT_RETENTION_DAYS)
            stmt = (
                update(TestReport)
                .where(
                    TestReport.created_at < cutoff,
                    TestReport.allure_report_path.isnot(None),
                )
                .values(allure_report_path=None)
            )
            result = await session.execute(stmt)
            await session.commit()
            rowcount = result.rowcount if hasattr(result, "rowcount") else 0
            if rowcount and rowcount > 0:
                logger.info(
                    f"Cleared allure_report_path for {rowcount} expired report(s)."
                )
    except Exception as e:
        logger.error(f"Error in Allure cleanup task: {e}")


async def start_scheduler():
    """
    Start the scheduler loop.
    - 每 10 分钟: 刷新数据库连接状态 (BE-013)
    - 每 24 小时: 清理过期 Allure 报告 (BE-057)
    """
    last_allure_cleanup = utcnow()
    while True:
        await check_datasources()
        # 每 24 小时执行一次 Allure 清理
        if (utcnow() - last_allure_cleanup).total_seconds() >= 86400:
            await cleanup_expired_allure_reports()
            last_allure_cleanup = utcnow()
        # Wait for 10 minutes
        await asyncio.sleep(600)
