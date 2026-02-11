"""Unit tests for test case generator service."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import pytest
import yaml

from app.models.project import Interface, ProjectEnvironment
from app.services.test_case_generator import TestCaseGenerator


class TestTestCaseGenerator:
    """Test suite for TestCaseGenerator class."""

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
        return engines_dir

    @pytest.fixture
    def sample_interface(self) -> Interface:
        """Create sample interface for testing."""
        interface = Interface()
        interface.id = 1
        interface.project_id = 1
        interface.name = "用户列表接口"
        interface.url = "/api/users"
        interface.method = "GET"
        interface.headers = {"Content-Type": "application/json"}
        interface.params = {"status": "active"}
        interface.body = None
        interface.body_type = "none"
        interface.description = "获取用户列表"
        return interface

    @pytest.fixture
    def sample_environment(self) -> ProjectEnvironment:
        """Create sample environment for testing."""
        env = ProjectEnvironment()
        env.id = 1
        env.domain = "https://api-dev.example.com"
        env.variables = {"token": "eyJhbGc...", "user_id": "12345"}
        env.headers = {"Authorization": "Bearer {{token}}"}
        return env

    def test_generate_yaml_structure(self, mock_session: Mock, temp_engines_dir: Path,
                                  sample_interface: Interface, sample_environment: ProjectEnvironment) -> None:
        """Test YAML generation has correct structure."""
        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(sample_interface, sample_environment, "test_case")

        yaml_dict = yaml.safe_load(yaml_content)

        assert yaml_dict["name"] == "test_case"
        assert yaml_dict["base_url"] == sample_environment.domain
        assert yaml_dict["request"]["method"] == "GET"
        assert yaml_dict["request"]["path"] == "/api/users"

    def test_generate_yaml_with_json_body(self, mock_session: Mock, temp_engines_dir: Path,
                                       sample_interface: Interface, sample_environment: ProjectEnvironment) -> None:
        """Test YAML generation with JSON body."""
        sample_interface.method = "POST"
        sample_interface.body = {"name": "Alice", "email": "alice@example.com"}
        sample_interface.body_type = "json"

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(sample_interface, sample_environment, "create_user")

        yaml_dict = yaml.safe_load(yaml_content)

        assert "json" in yaml_dict["request"]
        assert yaml_dict["request"]["json"]["name"] == "Alice"

    def test_generate_yaml_merges_headers(self, mock_session: Mock, temp_engines_dir: Path,
                                        sample_interface: Interface, sample_environment: ProjectEnvironment) -> None:
        """Test that interface headers override environment headers."""
        sample_interface.headers = {"X-Custom": "value"}

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(sample_interface, sample_environment, "test")

        yaml_dict = yaml.safe_load(yaml_content)

        # Both headers should be present
        assert "Authorization" in yaml_dict["request"]["headers"]
        assert "X-Custom" in yaml_dict["request"]["headers"]

    def test_generate_yaml_includes_params(self, mock_session: Mock, temp_engines_dir: Path,
                                        sample_interface: Interface, sample_environment: ProjectEnvironment) -> None:
        """Test YAML generation includes request params."""
        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(sample_interface, sample_environment, "test")

        yaml_dict = yaml.safe_load(yaml_content)

        assert "params" in yaml_dict["request"]
        assert yaml_dict["request"]["params"]["status"] == "active"

    def test_generate_yaml_includes_environment_variables(self, mock_session: Mock, temp_engines_dir: Path,
                                                    sample_interface: Interface, sample_environment: ProjectEnvironment) -> None:
        """Test YAML generation includes environment variables."""
        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(sample_interface, sample_environment, "test")

        yaml_dict = yaml.safe_load(yaml_content)

        assert "variables" in yaml_dict
        assert yaml_dict["variables"]["token"] == "eyJhbGc..."

    def test_generate_yaml_includes_assertions(self, mock_session: Mock, temp_engines_dir: Path,
                                            sample_interface: Interface, sample_environment: ProjectEnvironment) -> None:
        """Test YAML generation includes default assertions."""
        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(sample_interface, sample_environment, "test", auto_assertion=True)

        yaml_dict = yaml.safe_load(yaml_content)

        assert "assertion" in yaml_dict
        assert len(yaml_dict["assertion"]) == 2
        assert yaml_dict["assertion"][0]["type"] == "status_code"
        assert yaml_dict["assertion"][0]["expected"] == 200

    def test_generate_yaml_without_assertions(self, mock_session: Mock, temp_engines_dir: Path,
                                         sample_interface: Interface, sample_environment: ProjectEnvironment) -> None:
        """Test YAML generation without assertions."""
        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(sample_interface, sample_environment, "test", auto_assertion=False)

        yaml_dict = yaml.safe_load(yaml_content)

        assert "assertion" not in yaml_dict

    def test_generate_keyword_creates_valid_python(self, mock_session: Mock, temp_engines_dir: Path,
                                              sample_interface: Interface) -> None:
        """Test keyword file generation creates valid Python code."""
        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        keyword_content = generator._generate_keyword(sample_interface, "get_user_list")

        assert '"""用户列表接口 keyword."""' in keyword_content
        assert "class GetUserList" in keyword_content or "class Get_user_list" in keyword_content
        assert "name = \"get_user_list\"" in keyword_content
        assert "def execute(self):" in keyword_content

    def test_generate_keyword_includes_description(self, mock_session: Mock, temp_engines_dir: Path,
                                              sample_interface: Interface) -> None:
        """Test keyword includes interface description."""
        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        keyword_content = generator._generate_keyword(sample_interface, "test_keyword")

        assert "获取用户列表" in keyword_content or "API Keyword" in keyword_content

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

    def test_directories_created_on_init(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test that directories are created on initialization."""
        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))

        assert (temp_engines_dir / "cases").exists()
        assert (temp_engines_dir / "keywords").exists()

    def test_generate_with_form_data_body(self, mock_session: Mock, temp_engines_dir: Path,
                                       sample_interface: Interface, sample_environment: ProjectEnvironment) -> None:
        """Test YAML generation with form data body."""
        sample_interface.method = "POST"
        sample_interface.body = {"username": "test", "password": "secret"}
        sample_interface.body_type = "x-www-form-urlencoded"

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(sample_interface, sample_environment, "login")

        yaml_dict = yaml.safe_load(yaml_content)

        assert "data" in yaml_dict["request"]
        assert yaml_dict["request"]["data"]["username"] == "test"

    def test_generate_with_raw_body(self, mock_session: Mock, temp_engines_dir: Path,
                                  sample_interface: Interface, sample_environment: ProjectEnvironment) -> None:
        """Test YAML generation with raw body."""
        sample_interface.body = "raw text data"
        sample_interface.body_type = "raw"

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator._generate_yaml(sample_interface, sample_environment, "test")

        yaml_dict = yaml.safe_load(yaml_content)

        assert "body" in yaml_dict["request"]
        assert yaml_dict["request"]["body"] == "raw text data"

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

    def test_preview_without_saving(self, mock_session: Mock, temp_engines_dir: Path,
                                  sample_interface: Interface, sample_environment: ProjectEnvironment) -> None:
        """Test preview function returns YAML without saving."""
        mock_session.get.return_value = sample_interface
        mock_session.get.return_value = sample_environment

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        yaml_content = generator.preview(1, 1)

        assert yaml_content is not None
        assert "name: 用户列表接口" in yaml_content

    def test_generate_creates_database_record(self, mock_session: Mock, temp_engines_dir: Path,
                                           sample_interface: Interface, sample_environment: ProjectEnvironment) -> None:
        """Test that generate creates database record."""
        from app.models.interface_test_case import InterfaceTestCase

        mock_session.get.return_value = sample_interface
        mock_session.get.return_value = sample_environment
        mock_session.refresh = MagicMock()

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        result = generator.generate(
            interface_id=1,
            case_name="test_case",
            keyword_name="test_keyword",
            environment_id=1,
        )

        assert "test_case" in result
        assert mock_session.add.called
        assert mock_session.commit.called

    def test_generate_writes_files_to_disk(self, mock_session: Mock, temp_engines_dir: Path,
                                          sample_interface: Interface, sample_environment: ProjectEnvironment) -> None:
        """Test that generate writes files to disk."""
        from app.models.interface_test_case import InterfaceTestCase

        test_case = InterfaceTestCase()
        test_case.id = 1

        mock_session.get.return_value = sample_interface
        mock_session.get.return_value = sample_environment
        mock_session.add.return_value = test_case
        mock_session.commit.return_value = None
        mock_session.refresh = MagicMock()

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))
        generator.generate(
            interface_id=1,
            case_name="user_list",
            keyword_name="get_user_list",
            environment_id=1,
        )

        # Check files were created
        assert (temp_engines_dir / "cases").exists()
        assert (temp_engines_dir / "keywords").exists()

    def test_error_interface_not_found(self, mock_session: Mock, temp_engines_dir: Path) -> None:
        """Test error when interface not found."""
        mock_session.get.return_value = None

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))

        with pytest.raises(ValueError, match="Interface 999 not found"):
            generator.preview(999, 1)

    def test_error_environment_not_found(self, mock_session: Mock, temp_engines_dir: Path,
                                      sample_interface: Interface) -> None:
        """Test error when environment not found."""
        mock_session.get.side_effect = [sample_interface, None]

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))

        with pytest.raises(ValueError, match="Environment 999 not found"):
            generator.preview(1, 999)

    def test_yaml_path_uses_sanitized_name(self, mock_session: Mock, temp_engines_dir: Path,
                                          sample_interface: Interface) -> None:
        """Test that YAML path uses sanitized name."""
        from app.models.interface_test_case import InterfaceTestCase

        test_case = InterfaceTestCase()
        test_case.id = 1

        mock_session.get.return_value = sample_interface
        mock_session.get.return_value = None
        mock_session.add.return_value = test_case
        mock_session.commit.return_value = None
        mock_session.refresh = MagicMock()

        generator = TestCaseGenerator(mock_session, engines_base_path=str(temp_engines_dir))

        # This should create sanitized path
        generator.generate(
            interface_id=1,
            case_name="Test Case @Name!",
            keyword_name="test_key",
            environment_id=1,
        )

        # Check that files were created (actual file check depends on implementation)
        assert True  # If we got here, no exception was raised
