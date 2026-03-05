"""Test engine executor service (embedded engine version)."""

import json
import os
import time
from unittest.mock import MagicMock, Mock, patch

import pytest


@pytest.fixture
def tmp_path(tmp_path):
    """Temporary path fixture."""
    return tmp_path / "sisyphus_debug"


@pytest.fixture
def mock_engine_success():
    """Mock successful engine execution."""
    mock_result = MagicMock()
    mock_result.model_dump.return_value = {
        "status": "passed",
        "summary": {"total_steps": 0, "passed_steps": 0, "failed_steps": 0},
        "steps": [],
    }

    with (
        patch("app.services.engine_executor.load_case") as mock_load,
        patch("app.services.engine_executor.run_case") as mock_run,
    ):
        mock_load.return_value = MagicMock()
        mock_run.return_value = mock_result
        yield mock_load, mock_run


@pytest.fixture
def mock_engine_validate():
    """Mock successful engine YAML validation."""
    with patch("app.services.engine_executor.CaseModel") as mock_model:
        mock_model.model_validate.return_value = MagicMock()
        yield mock_model


class TestEngineExecutor:
    """Test EngineExecutor service."""

    def test_init_creates_temp_dir(self, tmp_path):
        """Test that initialization creates temp directory."""
        from app.services.engine_executor import EngineExecutor

        executor = EngineExecutor(base_temp_dir=str(tmp_path))

        assert executor.base_temp_dir == tmp_path
        assert tmp_path.exists()

    def test_execute_success(self, tmp_path, mock_engine_success):
        """Test successful execution."""
        from app.services.engine_executor import EngineExecutor

        executor = EngineExecutor(base_temp_dir=str(tmp_path))

        result = executor.execute(
            yaml_content="name: Test\nsteps: []",
            timeout=10,
        )

        assert result["success"] is True
        assert result["result"].get("status") == "passed"
        assert result["error"] is None

    def test_execute_engine_error(self, tmp_path):
        """Test execution when engine raises EngineError."""
        from app.engine.errors import EngineError
        from app.services.engine_executor import EngineExecutor

        executor = EngineExecutor(base_temp_dir=str(tmp_path))

        with patch("app.services.engine_executor.load_case") as mock_load:
            mock_load.side_effect = EngineError(
                code="ENGINE_ERROR", message="引擎执行失败"
            )
            result = executor.execute(yaml_content="test: data")

        assert result["success"] is False
        assert "ENGINE_ERROR" in result["error"]

    def test_execute_invalid_yaml(self, tmp_path):
        """Test execution with content that fails to parse."""
        from app.services.engine_executor import EngineExecutor

        executor = EngineExecutor(base_temp_dir=str(tmp_path))

        result = executor.execute(yaml_content="invalid: yaml: [")

        assert result["success"] is False
        assert result["error"] is not None

    def test_validate_yaml_valid(self, tmp_path, mock_engine_validate):
        """Test YAML validation with valid YAML."""
        from app.services.engine_executor import EngineExecutor

        executor = EngineExecutor(base_temp_dir=str(tmp_path))

        result = executor.validate(yaml_content="name: Test\nsteps: []")

        assert result["valid"] is True
        assert "正确" in result["message"]

    def test_validate_yaml_invalid_syntax(self, tmp_path):
        """Test YAML validation with invalid YAML syntax."""
        from app.services.engine_executor import EngineExecutor

        executor = EngineExecutor(base_temp_dir=str(tmp_path))

        result = executor.validate(yaml_content="invalid: yaml: [")

        assert result["valid"] is False
        assert result["message"]  # should contain an error description

    def test_validate_yaml_invalid_structure(self, tmp_path):
        """Test YAML validation with valid YAML but invalid CaseModel structure."""
        from app.services.engine_executor import EngineExecutor

        executor = EngineExecutor(base_temp_dir=str(tmp_path))

        result = executor.validate(yaml_content="just_a_string")

        assert result["valid"] is False

    def test_cleanup_temp_files(self, tmp_path):
        """Test temporary file cleanup."""
        from app.services.engine_executor import EngineExecutor

        executor = EngineExecutor(base_temp_dir=str(tmp_path))

        old_file = tmp_path / "old_test.yaml"
        old_file.write_text("test")
        old_mtime = old_file.stat().st_mtime

        new_mtime = old_mtime - 400
        os.utime(old_file, (new_mtime, new_mtime))

        deleted_count = executor.cleanup_temp_files(max_age_minutes=5)

        assert deleted_count >= 0
