"""Unit tests for YAML generator service."""

from __future__ import annotations

import pytest
import yaml

from app.services.yaml_generator import YAMLGenerator, generate_yaml_from_config


class TestYAMLGenerator:
    """Test suite for YAMLGenerator class."""

    def setup_method(self) -> None:
        """Setup test fixtures."""
        self.generator = YAMLGenerator()

    def test_generate_minimal_config(self) -> None:
        """Test generating minimal valid config."""
        config = {
            "name": "Test Case",
            "steps": [
                {
                    "name": "Step 1",
                    "type": "request",
                    "method": "GET",
                    "url": "https://api.example.com/users",
                }
            ],
        }

        result = self.generator.generate_yaml(config)

        # Verify YAML is valid
        parsed = yaml.safe_load(result)
        assert parsed["name"] == "Test Case"
        assert len(parsed["steps"]) == 1
        assert parsed["steps"][0]["method"] == "GET"

    def test_generate_with_description(self) -> None:
        """Test generating config with description."""
        config = {
            "name": "Test",
            "description": "This is a test description",
            "steps": [],
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        assert parsed["description"] == "This is a test description"

    def test_generate_with_tags(self) -> None:
        """Test generating config with tags."""
        config = {
            "name": "Test",
            "steps": [],
            "tags": ["smoke", "critical"],
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        assert parsed["tags"] == ["smoke", "critical"]

    def test_generate_with_enabled_flag(self) -> None:
        """Test generating config with enabled flag."""
        config = {
            "name": "Test",
            "steps": [],
            "enabled": False,
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        assert parsed["enabled"] is False

    def test_generate_request_step_with_all_fields(self) -> None:
        """Test generating request step with all fields."""
        config = {
            "name": "Full Request",
            "steps": [
                {
                    "name": "Create User",
                    "type": "request",
                    "method": "POST",
                    "url": "https://api.example.com/users",
                    "params": {"debug": "true"},
                    "headers": {"Content-Type": "application/json"},
                    "body": {"name": "Alice", "email": "alice@example.com"},
                    "cookies": {"session": "abc123"},
                }
            ],
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        step = parsed["steps"][0]
        assert step["method"] == "POST"
        assert step["params"] == {"debug": "true"}
        assert step["headers"] == {"Content-Type": "application/json"}
        assert step["body"]["name"] == "Alice"
        assert step["cookies"] == {"session": "abc123"}

    def test_generate_database_step(self) -> None:
        """Test generating database operation step."""
        config = {
            "name": "DB Test",
            "steps": [
                {
                    "name": "Query Users",
                    "type": "database",
                    "database": "postgres_db",
                    "operation": "select",
                    "sql": "SELECT * FROM users WHERE id = :user_id",
                    "params": {"user_id": "123"},
                }
            ],
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        step = parsed["steps"][0]
        assert step["type"] == "database"
        assert step["database"] == "postgres_db"
        assert step["operation"] == "select"
        assert "SELECT * FROM users" in step["sql"]

    def test_generate_wait_step_duration(self) -> None:
        """Test generating wait step with duration."""
        config = {
            "name": "Wait Test",
            "steps": [
                {
                    "name": "Wait for loading",
                    "type": "wait",
                    "wait_type": "fixed",
                    "duration": 5,
                }
            ],
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        step = parsed["steps"][0]
        assert step["type"] == "wait"
        assert step["wait_type"] == "fixed"
        assert step["duration"] == 5

    def test_generate_wait_step_condition(self) -> None:
        """Test generating wait step with condition."""
        config = {
            "name": "Wait Test",
            "steps": [
                {
                    "name": "Wait for element",
                    "type": "wait",
                    "wait_type": "condition",
                    "condition": "element.visible('#button')",
                    "interval": 1,
                    "max_wait": 30,
                }
            ],
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        step = parsed["steps"][0]
        assert step["wait_type"] == "condition"
        assert step["interval"] == 1
        assert step["max_wait"] == 30

    def test_generate_script_step(self) -> None:
        """Test generating script execution step."""
        config = {
            "name": "Script Test",
            "steps": [
                {
                    "name": "Custom Script",
                    "type": "script",
                    "script": "print('Hello World')",
                    "script_type": "python",
                    "allow_imports": True,
                }
            ],
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        step = parsed["steps"][0]
        assert step["type"] == "script"
        assert step["script"] == "print('Hello World')"
        assert step["allow_imports"] is True

    def test_generate_loop_step(self) -> None:
        """Test generating loop step."""
        config = {
            "name": "Loop Test",
            "steps": [
                {
                    "name": "Iterate Users",
                    "type": "loop",
                    "loop_type": "for",
                    "loop_count": 10,
                    "loop_variable": "i",
                    "loop_steps": [
                        {
                            "name": "Request",
                            "type": "request",
                            "method": "GET",
                            "url": "https://api.example.com/users/{{i}}",
                        }
                    ],
                }
            ],
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        step = parsed["steps"][0]
        assert step["type"] == "loop"
        assert step["loop_type"] == "for"
        assert step["loop_count"] == 10
        assert step["loop_variable"] == "i"
        assert len(step["loop_steps"]) == 1

    def test_generate_concurrent_step(self) -> None:
        """Test generating concurrent execution step."""
        config = {
            "name": "Concurrent Test",
            "steps": [
                {
                    "name": "Parallel Requests",
                    "type": "concurrent",
                    "concurrency": 5,
                    "concurrent_steps": [
                        {
                            "name": "Request 1",
                            "type": "request",
                            "method": "GET",
                            "url": "https://api.example.com/1",
                        },
                        {
                            "name": "Request 2",
                            "type": "request",
                            "method": "GET",
                            "url": "https://api.example.com/2",
                        },
                    ],
                }
            ],
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        step = parsed["steps"][0]
        assert step["type"] == "concurrent"
        assert step["concurrency"] == 5
        assert len(step["concurrent_steps"]) == 2

    def test_generate_with_validations(self) -> None:
        """Test generating step with validations."""
        config = {
            "name": "Validation Test",
            "steps": [
                {
                    "name": "Validated Request",
                    "type": "request",
                    "method": "GET",
                    "url": "https://api.example.com/users",
                    "validations": [
                        {
                            "type": "eq",
                            "path": "$.status",
                            "expect": 200,
                            "description": "Status should be 200",
                        },
                        {
                            "type": "contains",
                            "path": "$.data.users",
                            "expect": "alice",
                        },
                    ],
                }
            ],
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        step = parsed["steps"][0]
        assert len(step["validations"]) == 2
        assert step["validations"][0]["type"] == "eq"
        assert step["validations"][0]["expect"] == 200

    def test_generate_with_extractors(self) -> None:
        """Test generating step with extractors."""
        config = {
            "name": "Extractor Test",
            "steps": [
                {
                    "name": "Extract Data",
                    "type": "request",
                    "method": "POST",
                    "url": "https://api.example.com/login",
                    "extractors": [
                        {
                            "type": "jsonpath",
                            "name": "token",
                            "path": "$.data.token",
                        },
                        {
                            "type": "jsonpath",
                            "name": "user_id",
                            "path": "$.data.user.id",
                        },
                    ],
                }
            ],
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        step = parsed["steps"][0]
        assert len(step["extractors"]) == 2
        assert step["extractors"][0]["name"] == "token"
        assert step["extractors"][0]["path"] == "$.data.token"

    def test_generate_with_retry_policy(self) -> None:
        """Test generating step with retry policy."""
        config = {
            "name": "Retry Test",
            "steps": [
                {
                    "name": "Retry Request",
                    "type": "request",
                    "method": "GET",
                    "url": "https://api.example.com/flaky",
                    "retry_times": 3,
                }
            ],
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        step = parsed["steps"][0]
        assert step["retry_times"] == 3

    def test_generate_with_step_controls(self) -> None:
        """Test generating step with control flow."""
        config = {
            "name": "Control Test",
            "steps": [
                {
                    "name": "Conditional Step",
                    "type": "request",
                    "method": "GET",
                    "url": "https://api.example.com/data",
                    "skip_if": "{{env}} == 'production'",
                    "only_if": "{{feature_enabled}} == true",
                    "depends_on": ["previous_step"],
                    "timeout": 30,
                }
            ],
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        step = parsed["steps"][0]
        assert step["skip_if"] == "{{env}} == 'production'"
        assert step["only_if"] == "{{feature_enabled}} == true"
        assert step["depends_on"] == ["previous_step"]
        assert step["timeout"] == 30

    def test_generate_config_with_profiles(self) -> None:
        """Test generating config with environment profiles."""
        config = {
            "name": "Multi-Env Test",
            "steps": [],
            "config": {
                "profiles": {
                    "dev": {"base_url": "https://dev.api.example.com"},
                    "prod": {"base_url": "https://api.example.com"},
                },
                "active_profile": "dev",
            },
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        assert parsed["config"]["profiles"]["dev"]["base_url"] == "https://dev.api.example.com"
        assert parsed["config"]["active_profile"] == "dev"

    def test_generate_config_with_variables(self) -> None:
        """Test generating config with global variables."""
        config = {
            "name": "Variables Test",
            "steps": [],
            "config": {
                "variables": {
                    "api_key": "sk-test-123",
                    "user_id": "456",
                }
            },
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        assert parsed["config"]["variables"]["api_key"] == "sk-test-123"
        assert parsed["config"]["variables"]["user_id"] == "456"

    def test_generate_config_with_timeout(self) -> None:
        """Test generating config with global timeout."""
        config = {
            "name": "Timeout Test",
            "steps": [],
            "config": {
                "timeout": 60,
                "retry_times": 3,
            },
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        assert parsed["config"]["timeout"] == 60
        assert parsed["config"]["retry_times"] == 3

    def test_generate_config_with_data_source(self) -> None:
        """Test generating config with data-driven testing."""
        config = {
            "name": "Data Driven Test",
            "steps": [],
            "config": {
                "data_source": "csv_users.csv",
                "data_iterations": 10,
                "variable_prefix": "user",
            },
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        assert parsed["config"]["data_source"] == "csv_users.csv"
        assert parsed["config"]["data_iterations"] == 10
        assert parsed["config"]["variable_prefix"] == "user"

    def test_error_missing_name(self) -> None:
        """Test error when config is missing name."""
        config = {"steps": []}

        with pytest.raises(ValueError, match="缺少必需字段: name"):
            self.generator.generate_yaml(config)

    def test_error_missing_steps(self) -> None:
        """Test error when config is missing steps."""
        config = {"name": "Test"}

        with pytest.raises(ValueError, match="缺少必需字段: steps"):
            self.generator.generate_yaml(config)

    def test_error_invalid_steps_type(self) -> None:
        """Test error when steps is not a list."""
        config = {"name": "Test", "steps": "invalid"}

        with pytest.raises(ValueError, match="steps 必须是列表类型"):
            self.generator.generate_yaml(config)

    def test_error_unsupported_step_type(self) -> None:
        """Test error when step type is not supported."""
        config = {
            "name": "Test",
            "steps": [
                {
                    "name": "Invalid Step",
                    "type": "unsupported_type",
                }
            ],
        }

        with pytest.raises(ValueError, match="不支持的步骤类型"):
            self.generator.generate_yaml(config)

    def test_generate_complex_test_case(self) -> None:
        """Test generating complex real-world test case."""
        config = {
            "name": "User Registration Flow",
            "description": "Test complete user registration flow",
            "tags": ["registration", "smoke"],
            "enabled": True,
            "config": {
                "profiles": {
                    "dev": {"base_url": "https://dev.example.com"},
                    "prod": {"base_url": "https://example.com"},
                },
                "active_profile": "dev",
                "variables": {
                    "test_email": "test@example.com",
                    "test_password": "SecurePass123",
                },
                "timeout": 30,
            },
            "steps": [
                {
                    "name": "Register User",
                    "type": "request",
                    "method": "POST",
                    "url": "{{base_url}}/api/register",
                    "headers": {"Content-Type": "application/json"},
                    "body": {
                        "email": "{{test_email}}",
                        "password": "{{test_password}}",
                    },
                    "validations": [
                        {"type": "eq", "path": "$.status", "expect": 201},
                        {"type": "contains", "path": "$.data.id", "expect": "user_"},
                    ],
                    "extractors": [
                        {"type": "jsonpath", "name": "user_id", "path": "$.data.id"}
                    ],
                },
                {
                    "name": "Wait for Email",
                    "type": "wait",
                    "wait_type": "fixed",
                    "duration": 2,
                },
                {
                    "name": "Verify User",
                    "type": "request",
                    "method": "GET",
                    "url": "{{base_url}}/api/users/{{user_id}}",
                    "validations": [
                        {"type": "eq", "path": "$.status", "expect": 200},
                        {"type": "eq", "path": "$.data.email", "expect": "{{test_email}}"},
                    ],
                },
            ],
        }

        result = self.generator.generate_yaml(config)
        parsed = yaml.safe_load(result)

        assert parsed["name"] == "User Registration Flow"
        assert len(parsed["steps"]) == 3
        assert parsed["config"]["active_profile"] == "dev"
        assert len(parsed["steps"][0]["validations"]) == 2
        assert len(parsed["steps"][0]["extractors"]) == 1

    def test_validate_yaml_valid_content(self) -> None:
        """Test validating valid YAML content."""
        valid_yaml = """
name: Test Case
steps:
  - name: Step 1
    type: request
    method: GET
    url: https://api.example.com
"""
        assert self.generator.validate_yaml(valid_yaml) is True

    def test_validate_yaml_invalid_content(self) -> None:
        """Test validating invalid YAML content."""
        invalid_yaml = """
name: Test Case
steps:
  - name: Step 1
    type: request
    method: GET
    url: https://api.example.com
    invalid_yaml: [
        unclosed bracket
"""
        assert self.generator.validate_yaml(invalid_yaml) is False


class TestGenerateYamlFromConfigHelper:
    """Test suite for generate_yaml_from_config helper function."""

    def test_helper_function_basic(self) -> None:
        """Test helper function with basic config."""
        config = {
            "name": "Helper Test",
            "steps": [{"name": "Step", "type": "request", "method": "GET", "url": "https://api.example.com"}],
        }

        result = generate_yaml_from_config(config)
        parsed = yaml.safe_load(result)

        assert parsed["name"] == "Helper Test"

    def test_helper_function_empty_config(self) -> None:
        """Test helper function with minimal config."""
        config = {"name": "Minimal", "steps": []}

        result = generate_yaml_from_config(config)
        parsed = yaml.safe_load(result)

        assert parsed["name"] == "Minimal"
        assert parsed["steps"] == []
