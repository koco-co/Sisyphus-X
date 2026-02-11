"""Unit tests for variable replacement service."""

from __future__ import annotations

import time

import pytest

from app.services.variable_replacer import VariableReplacer, replace_variables


class TestVariableReplacer:
    """Test suite for VariableReplacer class."""

    def test_replace_single_env_variable(self) -> None:
        """Test replacing single environment variable."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace(
            "/api/users/{{userId}}",
            environment_vars={"userId": "12345"},
        )

        assert result == "/api/users/12345"
        assert used_vars == ["userId"]

    def test_replace_multiple_env_variables(self) -> None:
        """Test replacing multiple environment variables."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace(
            "/api/users/{{userId}}?token={{token}}",
            environment_vars={"userId": "12345", "token": "abc123"},
        )

        assert result == "/api/users/12345?token=abc123"
        assert set(used_vars) == {"userId", "token"}

    def test_replace_system_timestamp_variable(self) -> None:
        """Test replacing {{$timestamp}} system variable."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace("Timestamp: {{$timestamp}}")

        timestamp = int(result.split(": ")[1])
        current_ts = int(time.time())

        # Allow 5 second difference
        assert abs(current_ts - timestamp) <= 5
        assert used_vars == ["timestamp"]

    def test_replace_system_random_int_variable(self) -> None:
        """Test replacing {{$randomInt()}} system variable."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace("Random: {{$randomInt()}}")

        random_value = int(result.split(": ")[1])
        assert 0 <= random_value < 100  # Default range
        assert used_vars == ["randomInt"]

    def test_replace_system_random_int_with_range(self) -> None:
        """Test replacing {{$randomInt(min, max)}} with custom range."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace("Random: {{$randomInt(10, 20)}}")

        random_value = int(result.split(": ")[1])
        assert 10 <= random_value < 20
        assert used_vars == ["randomInt"]

    def test_replace_system_guid_variable(self) -> None:
        """Test replacing {{$guid}} system variable."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace("GUID: {{$guid}}")

        guid = result.split(": ")[1]
        # GUID should be in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        assert len(guid) == 36
        assert guid.count("-") == 4
        assert used_vars == ["guid"]

    def test_replace_system_date_variable_default_format(self) -> None:
        """Test replacing {{$date()}} with default format."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace("Date: {{$date()}}")

        date_str = result.split(": ")[1]
        # Default format is YYYY-MM-DD (10 characters)
        assert len(date_str) == 10
        assert "-" in date_str
        assert used_vars == ["date"]

    def test_replace_system_date_custom_format(self) -> None:
        """Test replacing {{$date(format)}} with custom format."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace('Date: {{$date(%Y/%m/%d)}}')

        date_str = result.split(": ")[1]
        # Format should be YYYY/MM/DD
        assert "/" in date_str
        assert len(date_str) == 10
        assert used_vars == ["date"]

    def test_nested_variable_replacement(self) -> None:
        """Test replacing nested variables."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace(
            "{{outer_{{inner}}}}",
            environment_vars={"inner": "key", "outer_key": "value"},
        )

        assert result == "value"
        assert set(used_vars) == {"inner", "outer_key"}

    def test_variable_priority_additional_over_env(self) -> None:
        """Test that additional_vars have higher priority than environment_vars."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace(
            "{{key}}",
            environment_vars={"key": "env_value"},
            additional_vars={"key": "add_value"},
        )

        assert result == "add_value"
        assert used_vars == ["key"]

    def test_missing_variable_leaves_template_unchanged(self) -> None:
        """Test that missing variables leave template unchanged."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace(
            "/api/users/{{missingVar}}",
            environment_vars={},
        )

        assert result == "/api/users/{{missingVar}}"
        assert used_vars == ["missingVar"]

    def test_no_variables_returns_original_string(self) -> None:
        """Test that string without variables is returned unchanged."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace("/api/users")

        assert result == "/api/users"
        assert used_vars == []

    def test_empty_string_returns_empty_string(self) -> None:
        """Test that empty string returns empty."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace("")

        assert result == ""
        assert used_vars == []

    def test_mixed_env_and_system_variables(self) -> None:
        """Test replacing both environment and system variables."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace(
            "/api/users/{{userId}}?ts={{$timestamp()}}",
            environment_vars={"userId": "123"},
        )

        assert result.startswith("/api/users/123?ts=")
        assert set(used_vars) == {"userId", "timestamp"}

    def test_variable_with_underscores(self) -> None:
        """Test replacing variable names with underscores."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace(
            "{{user_id}}_{{api_key}}",
            environment_vars={"user_id": "123", "api_key": "abc"},
        )

        assert result == "123_abc"
        assert set(used_vars) == {"user_id", "api_key"}

    def test_special_characters_in_variable_values(self) -> None:
        """Test replacing variables with special characters."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace(
            "Bearer {{token}}",
            environment_vars={"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"},
        )

        assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test" in result
        assert used_vars == ["token"]

    def test_json_with_variables(self) -> None:
        """Test replacing variables in JSON string."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace(
            '{"user": "{{username}}", "id": {{userId}}}',
            environment_vars={"username": "Alice", "userId": "123"},
        )

        assert result == '{"user": "Alice", "id": 123}'
        assert set(used_vars) == {"username", "userId"}

    def test_url_with_multiple_variables(self) -> None:
        """Test URL with multiple variables in different positions."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace(
            "{{protocol}}://api.{{domain}}/{{version}}/users",
            environment_vars={
                "protocol": "https",
                "domain": "example.com",
                "version": "v1",
            },
        )

        assert result == "https://api.example.com/v1/users"
        assert set(used_vars) == {"protocol", "domain", "version"}

    def test_max_iterations_prevents_infinite_loop(self) -> None:
        """Test that max_iterations prevents infinite loops."""
        replacer = VariableReplacer()
        # This could cause infinite loop if not limited
        result, used_vars = replacer.replace(
            "{{a}}",
            environment_vars={"a": "{{b}}", "b": "{{a}}"},
            max_iterations=3,
        )

        # Should stop after max iterations
        assert used_vars is not None

    def test_replacement_in_headers_string(self) -> None:
        """Test variable replacement in headers string."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace(
            "Authorization: Bearer {{token}}",
            environment_vars={"token": "secret123"},
        )

        assert result == "Authorization: Bearer secret123"
        assert used_vars == ["token"]

    def test_numeric_variable_values(self) -> None:
        """Test that numeric variable values are converted to strings."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace(
            "limit={{limit}}&offset={{offset}}",
            environment_vars={"limit": 10, "offset": 20},
        )

        assert result == "limit=10&offset=20"
        assert set(used_vars) == {"limit", "offset"}

    def test_boolean_variable_values(self) -> None:
        """Test that boolean variable values are converted."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace(
            "active={{active}}",
            environment_vars={"active": True},
        )

        assert result == "active=True"
        assert used_vars == ["active"]

    def test_case_sensitive_variable_names(self) -> None:
        """Test that variable names are case-sensitive."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace(
            "{{Token}} vs {{token}}",
            environment_vars={"Token": "UPPER", "token": "lower"},
        )

        assert result == "UPPER vs lower"
        assert set(used_vars) == {"Token", "token"}

    def test_whitespace_in_variable_template(self) -> None:
        """Test handling of whitespace around variables."""
        replacer = VariableReplacer()
        result, used_vars = replacer.replace(
            " {{var1}} - {{var2}} ",
            environment_vars={"var1": "a", "var2": "b"},
        )

        assert result == " a - b "
        assert set(used_vars) == {"var1", "var2"}


class TestReplaceVariablesFunction:
    """Test suite for replace_variables helper function."""

    def test_function_returns_string_only(self) -> None:
        """Test that helper function returns string without tracking."""
        result = replace_variables(
            "{{userId}}",
            environment_vars={"userId": "123"},
        )

        assert result == "123"

    def test_function_with_no_variables(self) -> None:
        """Test helper with no variables."""
        result = replace_variables("/api/users")

        assert result == "/api/users"

    def test_function_with_system_variables(self) -> None:
        """Test helper with system variables."""
        result = replace_variables("ts={{$timestamp()}}")

        assert "ts=" in result
        assert result != "ts={{$timestamp()}}"

    def test_function_with_none_environment_vars(self) -> None:
        """Test helper with None environment vars."""
        result = replace_variables("test")

        assert result == "test"

    def test_function_with_none_additional_vars(self) -> None:
        """Test helper with None additional vars."""
        result = replace_variables(
            "{{var}}",
            environment_vars={"var": "value"},
            additional_vars=None,
        )

        assert result == "value"
