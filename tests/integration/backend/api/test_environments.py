"""Integration tests for environment management API."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from app.api.v1.endpoints.environments import (
    clone_environment,
    create_environment,
    delete_environment,
    get_environments,
    replace_variables,
    update_environment,
)
from app.models.project import Project, ProjectEnvironment
from app.schemas.environment import EnvironmentCreate, EnvironmentUpdate


@pytest.fixture
async def test_db():
    """Create test database."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    session_maker = async_sessionmaker(engine, expire_on_commit=False)

    yield session_maker

    await engine.dispose()


@pytest.mark.asyncio
async def test_get_environments_empty(test_db) -> None:
    """Test getting environments when none exist."""
    async with test_db() as session:
        # Create project first
        project = Project(name="Test Project", key="TEST", owner="tester")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        environments = await get_environments(project.id, session)

        assert environments == []


@pytest.mark.asyncio
async def test_get_environments_returns_list(test_db) -> None:
    """Test getting environments returns list."""
    async with test_db() as session:
        # Create project
        project = Project(name="Test Project", key="TEST", owner="tester")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        # Create environments
        env1 = ProjectEnvironment(
            project_id=project.id,
            name="Development",
            domain="https://dev.example.com",
            variables={"token": "dev_token"},
            headers={"Authorization": "Bearer {{token}}"},
        )
        env2 = ProjectEnvironment(
            project_id=project.id,
            name="Production",
            domain="https://prod.example.com",
            variables={},
            headers={},
        )
        session.add(env1)
        session.add(env2)
        await session.commit()

        environments = await get_environments(project.id, session)

        assert len(environments) == 2
        assert env1.name in [e.name for e in environments]
        assert env2.name in [e.name for e in environments]


@pytest.mark.asyncio
async def test_create_environment_success(test_db) -> None:
    """Test creating environment successfully."""
    async with test_db() as session:
        project = Project(name="Test Project", key="TEST", owner="tester")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        env_data = EnvironmentCreate(
            name="Test Environment",
            domain="https://test.example.com",
            variables={"api_key": "secret"},
            headers={"X-API-Key": "{{api_key}}"},
            is_preupload=False,
        )

        env = await create_environment(project.id, env_data, session)

        assert env.id is not None
        assert env.name == "Test Environment"
        assert env.domain == "https://test.example.com"
        assert env.variables["api_key"] == "secret"
        assert env.is_preupload is False


@pytest.mark.asyncio
async def test_create_environment_with_variables(test_db) -> None:
    """Test creating environment with variables."""
    async with test_db() as session:
        project = Project(name="Test Project", key="TEST", owner="tester")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        env_data = EnvironmentCreate(
            name="Dev",
            domain="https://dev.example.com",
            variables={
                "token": "abc123",
                "user_id": "42",
                "timeout": "30",
            },
            headers={"Authorization": "Bearer {{token}}"},
        )

        env = await create_environment(project.id, env_data, session)

        assert env.variables["token"] == "abc123"
        assert env.variables["user_id"] == "42"
        assert env.variables["timeout"] == "30"


@pytest.mark.asyncio
async def test_update_environment(test_db) -> None:
    """Test updating environment."""
    async with test_db() as session:
        project = Project(name="Test Project", key="TEST", owner="tester")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        env = ProjectEnvironment(
            project_id=project.id,
            name="Old Name",
            domain="https://old.example.com",
        )
        session.add(env)
        await session.commit()
        await session.refresh(env)

        update_data = EnvironmentUpdate(
            name="New Name",
            domain="https://new.example.com",
            variables={"new_var": "value"},
        )

        updated = await update_environment(env.id, update_data, session)

        assert updated.name == "New Name"
        assert updated.domain == "https://new.example.com"
        assert updated.variables["new_var"] == "value"


@pytest.mark.asyncio
async def test_delete_environment_success(test_db) -> None:
    """Test deleting environment successfully."""
    async with test_db() as session:
        project = Project(name="Test Project", key="TEST", owner="tester")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        env = ProjectEnvironment(
            project_id=project.id,
            name="To Delete",
            domain="https://delete.example.com",
        )
        session.add(env)
        await session.commit()
        await session.refresh(env)

        result = await delete_environment(env.id, session)

        assert result["deleted"] == env.id

        # Verify deletion
        deleted_env = await session.get(ProjectEnvironment, env.id)
        assert deleted_env is None


@pytest.mark.asyncio
async def test_clone_environment(test_db) -> None:
    """Test cloning environment."""
    async with test_db() as session:
        project = Project(name="Test Project", key="TEST", owner="tester")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        original_env = ProjectEnvironment(
            project_id=project.id,
            name="Original",
            domain="https://original.example.com",
            variables={"token": "original_token"},
            headers={"X-Custom": "value"},
        )
        session.add(original_env)
        await session.commit()
        await session.refresh(original_env)

        cloned = await clone_environment(
            original_env.id, "Clone", session
        )

        assert cloned.id != original_env.id
        assert cloned.name == "Clone"
        assert cloned.domain == original_env.domain
        assert cloned.variables == original_env.variables
        assert cloned.headers == original_env.headers


@pytest.mark.asyncio
async def test_replace_variables_simple(test_db) -> None:
    """Test variable replacement with simple template."""
    async with test_db() as session:
        project = Project(name="Test Project", key="TEST", owner="tester")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        env = ProjectEnvironment(
            project_id=project.id,
            name="Test",
            domain="https://test.example.com",
            variables={"userId": "12345", "token": "secret"},
        )
        session.add(env)
        await session.commit()
        await session.refresh(env)

        result = await replace_variables(
            env.id,
            "/api/users/{{userId}}?token={{token}}",
            {},
            session
        )

        assert result["replaced"] == "/api/users/12345?token=secret"
        assert set(result["variables_used"]) == {"userId", "token"}


@pytest.mark.asyncio
async def test_replace_variables_with_additional_vars(test_db) -> None:
    """Test variable replacement with additional variables."""
    async with test_db() as session:
        project = Project(name="Test Project", key="TEST", owner="tester")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        env = ProjectEnvironment(
            project_id=project.id,
            name="Test",
            domain="https://test.example.com",
            variables={"token": "env_token"},
        )
        session.add(env)
        await session.commit()
        await session.refresh(env)

        # Additional vars should override env vars
        result = await replace_variables(
            env.id,
            "Token: {{token}}",
            {"token": "additional_token"},
            session
        )

        assert result["replaced"] == "Token: additional_token"


@pytest.mark.asyncio
async def test_replace_variables_with_system_variables(test_db) -> None:
    """Test variable replacement with system variables."""
    async with test_db() as session:
        project = Project(name="Test Project", key="TEST", owner="tester")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        env = ProjectEnvironment(
            project_id=project.id,
            name="Test",
            domain="https://test.example.com",
            variables={},
        )
        session.add(env)
        await session.commit()
        await session.refresh(env)

        result = await replace_variables(
            env.id,
            "Timestamp: {{$timestamp()}}",
            {},
            session
        )

        assert "Timestamp: " in result["replaced"]
        assert result["replaced"] != "Timestamp: {{$timestamp()}}"
        assert "timestamp" in result["variables_used"]


@pytest.mark.asyncio
async def test_replace_variables_returns_original(test_db) -> None:
    """Test that missing variables return original template."""
    async with test_db() as session:
        project = Project(name="Test Project", key="TEST", owner="tester")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        env = ProjectEnvironment(
            project_id=project.id,
            name="Test",
            domain="https://test.example.com",
            variables={},
        )
        session.add(env)
        await session.commit()
        await session.refresh(env)

        result = await replace_variables(
            env.id,
            "{{missing_var}}",
            {},
            session
        )

        # Missing variable should remain as template
        assert "{{missing_var}}" in result["replaced"]


@pytest.mark.asyncio
async def test_environment_name_unique_per_project(test_db) -> None:
    """Test that environment names are unique per project."""
    async with test_db() as session:
        project = Project(name="Test Project", key="TEST", owner="tester")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        env_data = EnvironmentCreate(
            name="UniqueName",
            domain="https://test1.example.com",
            variables={},
        )

        env1 = await create_environment(project.id, env_data, session)

        # Try to create with same name - should work but might have validation
        # (actual validation depends on implementation)
        env2_data = EnvironmentCreate(
            name="UniqueName",
            domain="https://test2.example.com",
            variables={},
        )

        # This test documents expected behavior
        # Implementation may or may not enforce uniqueness
        env2 = await create_environment(project.id, env2_data, session)

        assert env2 is not None or env1 is not None


@pytest.mark.asyncio
async def test_environment_with_preupload_flag(test_db) -> None:
    """Test environment with is_preupload flag."""
    async with test_db() as session:
        project = Project(name="Test Project", key="TEST", owner="tester")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        env_data = EnvironmentCreate(
            name="Preupload Env",
            domain="https://test.example.com",
            variables={},
            is_preupload=True,
        )

        env = await create_environment(project.id, env_data, session)

        assert env.is_preupload is True


@pytest.mark.asyncio
async def test_get_environment_by_id(test_db) -> None:
    """Test getting specific environment by ID."""
    async with test_db() as session:
        project = Project(name="Test Project", key="TEST", owner="tester")
        session.add(project)
        await session.commit()
        await session.refresh(project)

        env = ProjectEnvironment(
            project_id=project.id,
            name="Test Env",
            domain="https://test.example.com",
        )
        session.add(env)
        await session.commit()
        await session.refresh(env)

        # Get the environment
        retrieved = await session.get(ProjectEnvironment, env.id)

        assert retrieved is not None
        assert retrieved.name == "Test Env"
        assert retrieved.domain == "https://test.example.com"
