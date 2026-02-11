import asyncio
import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import select

from app.core.db import engine
from app.core.network import test_tcp_connection
from app.models.project import ProjectDataSource

logger = logging.getLogger(__name__)


async def check_datasources():
    """
    Background task to check database connections
    """
    logger.info("Starting background datasource check...")

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with async_session() as session:
            # Get all enabled datasources
            statement = select(ProjectDataSource).where(ProjectDataSource.is_enabled)
            result = await session.execute(statement)
            datasources = result.scalars().all()

            for ds in datasources:
                logger.info(f"Checking datasource {ds.name} ({ds.host}:{ds.port})...")
                success, message = test_tcp_connection(ds.host, ds.port)

                ds.last_test_at = datetime.utcnow()
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


async def start_scheduler():
    """
    Start the scheduler loop
    """
    while True:
        await check_datasources()
        # Wait for 10 minutes
        await asyncio.sleep(600)
