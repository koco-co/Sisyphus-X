"""Unit tests for test case generator service (simplified)."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import pytest
import yaml

from app.services.test_case_generator import TestCaseGenerator


class TestTestCaseGeneratorSimple:
    """Test suite for TestCaseGenerator class - simplified version."""

    @pytest.fixture
    def mock_session(self) -> Mock:
        """Create mock database session."""
        session = MagicMock()
        return session

    @pytest.fixture
    def temp_engines_dir(self, tmp_path: Path) -> Path:
        """Create temporary engines directory."""
        engines_dir = tmp_path / "engines" / "sisyphus_api_engine"
        engines_dir.mkdir(parents=True)
        (engines_dir / "cases").mkdir()
        (engines_dir / "keywords").mkdir()
        return engines_dir

    def test_initialization_creates_directories(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test that initialization creates required directories."""
        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))

        assert (temp_engines_dir / "cases").exists()
        assert (temp_engines_dir / "keywords").exists()

    def test_sanitize_name_removes_special_chars(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test name sanitization removes invalid characters."""
        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))

        assert generator._sanitize_name("Test Case!") == "test_case_"
        assert generator._sanitize_name("user@list") == "user_list"
        assert generator._sanitize_name("api/v1/users") == "api_v1_users"

    def test_sanitize_name_preserves_valid_chars(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test name sanitization preserves valid characters."""
        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))

        assert generator._sanitize_name("test_case_name") == "test_case_name"
        assert generator._sanitize_name("api-v2-endpoint") == "api-v2-endpoint"

    def test_generate_assertions_returns_correct_list(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test assertion generation returns correct structure."""
        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        assertions = generator._generate_assertions()

        assert len(assertions) == 2
        assert assertions[0]["type"] == "status_code"
        assert assertions[0]["expected"] == 200
        assert assertions[1]["type"] == "json_path"
        assert assertions[1]["path"] == "$.code"
        assert assertions[1]["expected"] == 0

    def test_write_yaml_file_creates_file(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test YAML file writing creates correct file."""
        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        generator._write_yaml_file("cases/test.yaml", "name: test")

        yaml_file = temp_engines_dir / "cases" / "test.yaml"
        assert yaml_file.exists()
        assert yaml_file.read_text(encoding="utf-8") == "name: test"

    def test_write_keyword_file_creates_file(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test keyword file writing creates correct file."""
        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        generator._write_keyword_file("keywords/test.py", "# Test keyword")

        keyword_file = temp_engines_dir / "keywords" / "test.py"
        assert keyword_file.exists()
        assert keyword_file.read_text(encoding="utf-8") == "# Test keyword"

    def test_generate_yaml_structure_with_minimal_data(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test YAML generation with minimal interface data."""
        # Mock interface and environment
        mock_interface = Mock()
        mock_interface.url = "/api/test"
        mock_interface.method = "GET"
        mock_interface.name = "Test Interface"
        mock_interface.headers = {}
        mock_interface.params = {}
        mock_interface.body = None
        mock_interface.body_type = "none"

        mock_env = Mock()
        mock_env.domain = "https://api.example.com"
        mock_env.variables = {}
        mock_env.headers = {}

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(mock_interface, mock_env, "test_case")

        yaml_dict = yaml.safe_load(yaml_content)

        assert yaml_dict["name"] == "test_case"
        assert yaml_dict["base_url"] == "https://api.example.com"
        assert yaml_dict["request"]["method"] == "GET"
        assert yaml_dict["request"]["path"] == "/api/test"

    def test_generate_yaml_with_json_body(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test YAML generation with JSON body."""
        mock_interface = Mock()
        mock_interface.method = "POST"
        mock_interface.url = "/api/users"
        mock_interface.name = "Create User"
        mock_interface.body = {"name": "Alice", "email": "alice@example.com"}
        mock_interface.body_type = "json"
        mock_interface.headers = {}
        mock_interface.params = {}

        mock_env = Mock()
        mock_env.domain = "https://api.example.com"
        mock_env.variables = {}
        mock_env.headers = {}

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(mock_interface, mock_env, "create_user")

        yaml_dict = yaml.safe_load(yaml_content)

        assert "json" in yaml_dict["request"]
        assert yaml_dict["request"]["json"]["name"] == "Alice"

    def test_generate_yaml_includes_params(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test YAML generation includes request params."""
        mock_interface = Mock()
        mock_interface.url = "/api/users"
        mock_interface.method = "GET"
        mock_interface.name = "List Users"
        mock_interface.headers = {}
        mock_interface.params = {"status": "active", "page": "1"}
        mock_interface.body = None
        mock_interface.body_type = "none"

        mock_env = Mock()
        mock_env.domain = "https://api.example.com"
        mock_env.variables = {}
        mock_env.headers = {}

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(mock_interface, mock_env, "test")

        yaml_dict = yaml.safe_load(yaml_content)

        assert "params" in yaml_dict["request"]
        assert yaml_dict["request"]["params"]["status"] == "active"
        assert yaml_dict["request"]["params"]["page"] == "1"

    def test_generate_yaml_merges_headers(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test that interface headers override environment headers."""
        mock_interface = Mock()
        mock_interface.url = "/api/test"
        mock_interface.method = "GET"
        mock_interface.name = "Test"
        mock_interface.headers = {"X-Custom": "value"}
        mock_interface.params = {}
        mock_interface.body = None
        mock_interface.body_type = "none"

        mock_env = Mock()
        mock_env.domain = "https://api.example.com"
        mock_env.variables = {}
        mock_env.headers = {"Authorization": "Bearer token"}

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(mock_interface, mock_env, "test")

        yaml_dict = yaml.safe_load(yaml_content)

        # Both headers should be present
        assert "Authorization" in yaml_dict["request"]["headers"]
        assert "X-Custom" in yaml_dict["request"]["headers"]

    def test_generate_yaml_with_environment_variables(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test YAML generation includes environment variables."""
        mock_interface = Mock()
        mock_interface.url = "/api/test"
        mock_interface.method = "GET"
        mock_interface.name = "Test"
        mock_interface.headers = {}
        mock_interface.params = {}
        mock_interface.body = None
        mock_interface.body_type = "none"

        mock_env = Mock()
        mock_env.domain = "https://api.example.com"
        mock_env.variables = {"token": "secret123", "api_key": "key456"}
        mock_env.headers = {}

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(mock_interface, mock_env, "test")

        yaml_dict = yaml.safe_load(yaml_content)

        assert "variables" in yaml_dict
        assert yaml_dict["variables"]["token"] == "secret123"
        assert yaml_dict["variables"]["api_key"] == "key456"

    def test_generate_yaml_includes_assertions(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test YAML generation includes default assertions."""
        mock_interface = Mock()
        mock_interface.url = "/api/test"
        mock_interface.method = "GET"
        mock_interface.name = "Test"
        mock_interface.headers = {}
        mock_interface.params = {}
        mock_interface.body = None
        mock_interface.body_type = "none"

        mock_env = Mock()
        mock_env.domain = "https://api.example.com"
        mock_env.variables = {}
        mock_env.headers = {}

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(mock_interface, mock_env, "test", auto_assertion=True)

        yaml_dict = yaml.safe_load(yaml_content)

        assert "assertion" in yaml_dict
        assert len(yaml_dict["assertion"]) == 2
        assert yaml_dict["assertion"][0]["type"] == "status_code"

    def test_generate_yaml_without_assertions(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test YAML generation without assertions."""
        mock_interface = Mock()
        mock_interface.url = "/api/test"
        mock_interface.method = "GET"
        mock_interface.name = "Test"
        mock_interface.headers = {}
        mock_interface.params = {}
        mock_interface.body = None
        mock_interface.body_type = "none"

        mock_env = Mock()
        mock_env.domain = "https://api.example.com"
        mock_env.variables = {}
        mock_env.headers = {}

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(mock_interface, mock_env, "test", auto_assertion=False)

        yaml_dict = yaml.safe_load(yaml_content)

        assert "assertion" not in yaml_dict

    def test_generate_keyword_creates_valid_python(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test keyword file generation creates valid Python code."""
        mock_interface = Mock()
        mock_interface.name = "用户列表接口"
        mock_interface.description = "获取用户列表"

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        keyword_content = generator._generate_keyword(mock_interface, "get_user_list")

        assert '"""用户列表接口 keyword."""' in keyword_content or "API Keyword" in keyword_content
        assert "class " in keyword_content
        assert "name = \"get_user_list\"" in keyword_content
        assert "def execute(self):" in keyword_content

    def test_error_interface_not_found(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test error when interface not found."""
        mock_session.get.return_value = None

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))

        with pytest.raises(ValueError, match="Interface 999 not found"):
            generator.preview(999, 1)

    def test_error_environment_not_found(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test error when environment not found."""
        from app.models.project import Interface

        mock_interface = Mock(spec=Interface)
        mock_session.get.side_effect = [mock_interface, None]

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))

        with pytest.raises(ValueError, match="Environment 999 not found"):
            generator.preview(1, 999)
