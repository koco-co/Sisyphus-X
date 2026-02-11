"""Unit tests for cURL parser service."""

from __future__ import annotations

import pytest

from app.services.curl_parser import CurlParser, parse_curl_command


class TestCurlParser:
    """Test suite for CurlParser class."""

    def test_parse_simple_get_request(self) -> None:
        """Test parsing simple GET request."""
        curl_cmd = "curl https://api.example.com/users"
        result = parse_curl_command(curl_cmd)

        assert result["method"] == "GET"
        assert result["url"] == "https://api.example.com/users"
        assert result["headers"] == {}
        assert result["params"] == {}
        assert result["body"] == {}
        assert result["body_type"] == "none"
        assert result["auth"]["type"] == "none"

    def test_parse_post_request_with_headers(self) -> None:
        """Test parsing POST request with headers."""
        curl_cmd = (
            "curl -X POST https://api.example.com/users "
            '-H "Content-Type: application/json" '
            '-H "Authorization: Bearer token123"'
        )
        result = parse_curl_command(curl_cmd)

        assert result["method"] == "POST"
        assert result["url"] == "https://api.example.com/users"
        assert result["headers"]["Content-Type"] == "application/json"
        assert result["headers"]["Authorization"] == "Bearer token123"

    def test_parse_post_with_json_body(self) -> None:
        """Test parsing POST request with JSON body."""
        curl_cmd = (
            'curl -X POST https://api.example.com/users '
            '-H "Content-Type: application/json" '
            '-d \'{"name":"Alice","email":"alice@example.com"}\''
        )
        result = parse_curl_command(curl_cmd)

        assert result["method"] == "POST"
        assert result["body_type"] == "json"
        assert result["body"]["name"] == "Alice"
        assert result["body"]["email"] == "alice@example.com"

    def test_parse_post_with_form_data(self) -> None:
        """Test parsing POST request with form data."""
        curl_cmd = (
            "curl -X POST https://api.example.com/form "
            '-d "name=John&age=30&city=NYC"'
        )
        result = parse_curl_command(curl_cmd)

        assert result["method"] == "POST"
        assert result["body_type"] == "x-www-form-urlencoded"
        assert result["body"]["name"] == "John"
        assert result["body"]["age"] == "30"
        assert result["body"]["city"] == "NYC"

    def test_parse_url_with_query_params(self) -> None:
        """Test parsing URL with query parameters."""
        curl_cmd = "curl 'https://api.example.com/users?page=1&limit=10'"
        result = parse_curl_command(curl_cmd)

        assert result["url"] == "https://api.example.com/users"
        assert result["params"]["page"] == "1"
        assert result["params"]["limit"] == "10"

    def test_parse_bearer_token_auth(self) -> None:
        """Test detecting Bearer token authentication."""
        curl_cmd = (
            "curl https://api.example.com/users "
            '-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"'
        )
        result = parse_curl_command(curl_cmd)

        assert result["auth"]["type"] == "bearer"
        assert result["auth"]["token"].startswith("eyJ")

    def test_parse_basic_auth(self) -> None:
        """Test parsing Basic authentication."""
        curl_cmd = "curl -u admin:password123 https://api.example.com/users"
        result = parse_curl_command(curl_cmd)

        assert result["auth"]["type"] == "basic"
        assert result["auth"]["username"] == "admin"
        assert result["auth"]["password"] == "password123"

    def test_parse_api_key_in_header(self) -> None:
        """Test detecting API key in headers."""
        curl_cmd = (
            'curl https://api.example.com/users '
            '-H "X-API-Key: sk-test-1234567890"'
        )
        result = parse_curl_command(curl_cmd)

        assert result["auth"]["type"] == "api_key"
        assert result["auth"]["key"] == "X-API-Key"
        assert result["auth"]["value"] == "sk-test-1234567890"
        assert result["auth"]["add_to"] == "header"

    def test_parse_with_line_continuation(self) -> None:
        """Test parsing cURL with line continuation."""
        curl_cmd = """curl -X POST https://api.example.com/users \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Test"}'"""
        result = parse_curl_command(curl_cmd)

        assert result["method"] == "POST"
        assert result["url"] == "https://api.example.com/users"
        assert result["headers"]["Content-Type"] == "application/json"

    def test_parse_with_data_raw_flag(self) -> None:
        """Test parsing --data-raw flag."""
        curl_cmd = (
            'curl -X POST https://api.example.com/data '
            '--data-raw \'{"raw":"data"}\''
        )
        result = parse_curl_command(curl_cmd)

        assert result["method"] == "POST"
        assert result["body"]["raw"] == "data"

    def test_parse_with_uppercase_method(self) -> None:
        """Test parsing uppercase method specification."""
        curl_cmd = "curl -X GET https://api.example.com/users"
        result = parse_curl_command(curl_cmd)

        assert result["method"] == "GET"

    def test_parse_with_lowercase_method(self) -> None:
        """Test parsing lowercase method specification."""
        curl_cmd = "curl -x post https://api.example.com/users"
        result = parse_curl_command(curl_cmd)

        assert result["method"] == "POST"

    def test_parse_with_multiple_headers(self) -> None:
        """Test parsing multiple headers."""
        curl_cmd = (
            "curl https://api.example.com/users "
            '-H "Accept: application/json" '
            '-H "User-Agent: MyClient/1.0" '
            '-H "X-Custom-Header: custom-value"'
        )
        result = parse_curl_command(curl_cmd)

        assert result["headers"]["Accept"] == "application/json"
        assert result["headers"]["User-Agent"] == "MyClient/1.0"
        assert result["headers"]["X-Custom-Header"] == "custom-value"

    def test_error_invalid_command_not_starting_with_curl(self) -> None:
        """Test error handling for command not starting with curl."""
        with pytest.raises(ValueError, match="Command must start with 'curl'"):
            parse_curl_command("wget https://example.com")

    def test_error_malformed_command(self) -> None:
        """Test error handling for malformed command."""
        with pytest.raises(ValueError):
            parse_curl_command("curl '-X")

    def test_parse_with_complex_json_body(self) -> None:
        """Test parsing complex nested JSON body."""
        json_body = '''{
  "user": {
    "name": "Alice",
    "profile": {
      "age": 30,
      "city": "NYC"
    }
  }
}'''
        curl_cmd = f'curl -X POST https://api.example.com/users -H "Content-Type: application/json" -d \'{json_body}\''
        result = parse_curl_command(curl_cmd)

        assert result["body_type"] == "json"
        assert result["body"]["user"]["name"] == "Alice"
        assert result["body"]["user"]["profile"]["city"] == "NYC"

    def test_parse_with_empty_body(self) -> None:
        """Test parsing request with empty body."""
        curl_cmd = 'curl -X POST https://api.example.com/users -d ""'
        result = parse_curl_command(curl_cmd)

        assert result["method"] == "POST"
        assert result["body"] == ""

    def test_parse_get_with_force_get_flag(self) -> None:
        """Test parsing with -G flag (force GET with data)."""
        curl_cmd = "curl -G -d 'param=value' https://api.example.com/users"
        result = parse_curl_command(curl_cmd)

        assert result["method"] == "GET"

    def test_auth_from_headers_overrides_basic_auth(self) -> None:
        """Test that auth from headers is detected and used."""
        curl_cmd = (
            "curl -u user:pass https://api.example.com/users "
            '-H "Authorization: Bearer token123"'
        )
        result = parse_curl_command(curl_cmd)

        # Bearer in headers should be detected
        assert result["auth"]["type"] == "bearer"
        assert result["auth"]["token"] == "token123"

    def test_parse_url_with_fragment(self) -> None:
        """Test parsing URL with fragment."""
        curl_cmd = "curl https://api.example.com/users#section"
        result = parse_curl_command(curl_cmd)

        assert result["url"] == "https://api.example.com/users#section"

    def test_parse_with_special_characters_in_body(self) -> None:
        """Test parsing body with special characters."""
        curl_cmd = r'curl -X POST https://api.example.com/data -d "message=Hello%20World%21"'
        result = parse_curl_command(curl_cmd)

        # Form data becomes dict, raw data stays as string
        if isinstance(result["body"], dict):
            assert result["body"]["message"] == "Hello%20World%21"
        else:
            assert "Hello%20World%21" in result["body"]
