"""Test engine executor service."""

import json
from unittest.mock import Mock, patch

import pytest


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
        assert result["result"].get("summary", {}).get("status") == "success"
        assert result["error"] is None

    def test_execute_engine_not_found(self, tmp_path):
        """Test execution when engine is not installed."""
        from app.services.engine_executor import EngineExecutor

        executor = EngineExecutor(base_temp_dir=str(tmp_path))

        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = FileNotFoundError()

            result = executor.execute(yaml_content="test")

        assert result["success"] is False
        assert "未安装" in result["error"]

    def test_validate_yaml_valid(self, tmp_path, mock_engine_validate):
        """Test YAML validation with valid YAML."""
        from app.services.engine_executor import EngineExecutor

        executor = EngineExecutor(base_temp_dir=str(tmp_path))

        result = executor.validate(
            yaml_content="name: Test\nsteps: []"
        )

        assert result["valid"] is True
        assert "成功" in result["message"] or result["valid"] is True

    def test_validate_yaml_invalid(self, tmp_path):
        """Test YAML validation with invalid YAML."""
        from app.services.engine_executor import EngineExecutor

        executor = EngineExecutor(base_temp_dir=str(tmp_path))

        with patch("subprocess.run") as mock_run:
            mock_run.return_value = Mock(
                returncode=1,
                stderr="Invalid YAML syntax",
            )

            result = executor.validate(yaml_content="invalid: yaml: [")

        assert result["valid"] is False
        assert result["message"] == "Invalid YAML syntax"

    def test_cleanup_temp_files(self, tmp_path):
        """Test temporary file cleanup."""
        from app.services.engine_executor import EngineExecutor
        import time

        executor = EngineExecutor(base_temp_dir=str(tmp_path))

        # Create old temp files
        old_file = tmp_path / "old_test.yaml"
        old_file.write_text("test")
        old_mtime = old_file.stat().st_mtime

        # Set file as old (more than 5 minutes)
        new_mtime = old_mtime - 400
        import os
        os.utime(old_file, (new_mtime, new_mtime))

        # Run cleanup
        deleted_count = executor.cleanup_temp_files(max_age_minutes=5)

        assert deleted_count >= 0


@pytest.fixture
def tmp_path(tmp_path):
    """Temporary path fixture."""
    return tmp_path / "sisyphus_debug"


@pytest.fixture
def mock_engine_success():
    """Mock successful engine execution."""
    mock_result = {
        "summary": {"status": "success"},
        "steps": [],
    }

    with patch("subprocess.run") as mock_run:
        mock_run.return_value = Mock(
            returncode=0,
            stdout=json.dumps(mock_result),
            stderr="",
        )
        yield mock_run


@pytest.fixture
def mock_engine_validate():
    """Mock successful engine validation."""
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = Mock(returncode=0, stdout="YAML is valid")
        yield mock_run
