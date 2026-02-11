from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.v1.endpoints.projects import create_datasource
from app.models.project import Project, ProjectDataSource
from app.schemas.environment import DataSourceCreate


@pytest.mark.asyncio
async def test_create_datasource_hashes_password_without_passlib_crash(monkeypatch) -> None:
    async def fake_test_mysql_connection(**kwargs):  # noqa: ANN003, ANN202
        return False, "mocked connection failed"

    monkeypatch.setattr("app.core.network.test_mysql_connection", fake_test_mysql_connection)

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    session_maker = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Project.__table__.create)
        await conn.run_sync(ProjectDataSource.__table__.create)

    async with session_maker() as session:
        project = Project(name="proj", key="PRJ_1", owner="tester")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        payload = DataSourceCreate(
            name="mysql",
            db_type="mysql",
            host="localhost",
            port=3306,
            db_name="platform_auto",
            username="root",
            password="123456",
            variable_name="ddd",
        )

        created = await create_datasource(project.id, payload, session)  # type: ignore[arg-type]

        assert created.id is not None
        assert created.password_hash
        assert created.password_hash != payload.password
        assert created.status == "error"
        assert created.error_msg == "mocked connection failed"

    await engine.dispose()
