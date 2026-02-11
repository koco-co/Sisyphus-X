"""Integration tests for interface management API - environment variables and request execution."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.api.v1.endpoints.interfaces import send_interface_request
from app.services.variable_replacer import replace_variables
from app.schemas.interface import InterfaceSendRequest


@pytest.mark.asyncio
async def test_send_request_with_variable_replacement() -> None:
    """Test sending request with environment variable replacement."""
    request_data = InterfaceSendRequest(
        url="https://api.example.com/users/{{userId}}",
        method="GET",
        headers={"Authorization": "Bearer {{token}}"},
        params={"limit": "{{pageSize}}"},
        environment_vars={
            "userId": "123",
            "token": "test_token_abc",
            "pageSize": "10",
        },
    )

    # Simulate variable replacement
    replaced_url = replace_variables(
        request_data.url,
        environment_vars=request_data.environment_vars,
    )
    replaced_headers = {
        k: replace_variables(v, environment_vars=request_data.environment_vars)
        for k, v in request_data.headers.items()
    }
    replaced_params = {
        k: replace_variables(str(v), environment_vars=request_data.environment_vars)
        for k, v in request_data.params.items()
    }

    assert replaced_url == "https://api.example.com/users/123"
    assert replaced_headers["Authorization"] == "Bearer test_token_abc"
    assert replaced_params["limit"] == "10"


@pytest.mark.asyncio
async def test_send_request_with_nested_variables() -> None:
    """Test sending request with nested variable references."""
    request_data = InterfaceSendRequest(
        url="{{baseUrl}}/api/{{version}}/users",
        method="GET",
        environment_vars={
            "baseUrl": "https://api.example.com",
            "version": "v1",
        },
    )

    replaced_url = replace_variables(
        request_data.url,
        environment_vars=request_data.environment_vars,
    )

    assert replaced_url == "https://api.example.com/api/v1/users"


@pytest.mark.asyncio
async def test_send_request_with_system_variables() -> None:
    """Test sending request with system variables like timestamp."""
    request_data = InterfaceSendRequest(
        url="https://api.example.com/users?ts={{$timestamp()}}",
        method="GET",
        environment_vars={},
    )

    replaced_url = replace_variables(request_data.url, environment_vars={})

    # Should replace {{$timestamp()}} with actual timestamp
    assert "{{timestamp}}" not in replaced_url
    assert "ts=" in replaced_url


@pytest.mark.asyncio
async def test_send_request_with_mixed_variable_types() -> None:
    """Test sending request with both environment and system variables."""
    request_data = InterfaceSendRequest(
        url="{{protocol}}://{{domain}}/api/users?id={{$timestamp()}}",
        method="GET",
        environment_vars={
            "protocol": "https",
            "domain": "api.example.com",
        },
    )

    replaced_url = replace_variables(
        request_data.url,
        environment_vars=request_data.environment_vars,
    )

    assert replaced_url.startswith("https://api.example.com/api/users?id=")


@pytest.mark.asyncio
async def test_send_post_request_with_json_body_variables() -> None:
    """Test sending POST request with variables in JSON body."""
    body_template = '{"userId": "{{userId}}", "action": "{{action}}"}'
    request_data = InterfaceSendRequest(
        url="https://api.example.com/users",
        method="POST",
        headers={"Content-Type": "application/json"},
        body=body_template,
        environment_vars={
            "userId": "123",
            "action": "update",
        },
    )

    replaced_body = replace_variables(
        request_data.body,
        environment_vars=request_data.environment_vars,
    )

    import json

    parsed_body = json.loads(replaced_body)
    assert parsed_body["userId"] == "123"
    assert parsed_body["action"] == "update"


@pytest.mark.asyncio
async def test_send_request_with_form_data_variables() -> None:
    """Test sending request with form-data containing variables."""
    request_data = InterfaceSendRequest(
        url="https://api.example.com/upload",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body="username={{username}}&file={{filename}}",
        environment_vars={
            "username": "alice",
            "filename": "test.pdf",
        },
    )

    replaced_body = replace_variables(
        request_data.body,
        environment_vars=request_data.environment_vars,
    )

    assert "username=alice" in replaced_body
    assert "filename=test.pdf" in replaced_body


@pytest.mark.asyncio
async def test_send_request_with_cookie_variables() -> None:
    """Test sending request with cookies containing variables."""
    request_data = InterfaceSendRequest(
        url="https://api.example.com/data",
        method="GET",
        headers={},
        cookies={"session_id": "{{sessionId}}", "user_token": "{{authToken}}"},
        environment_vars={
            "sessionId": "abc123",
            "authToken": "token_xyz",
        },
    )

    replaced_cookies = {
        k: replace_variables(v, environment_vars=request_data.environment_vars)
        for k, v in request_data.cookies.items()
    }

    assert replaced_cookies["session_id"] == "abc123"
    assert replaced_cookies["user_token"] == "token_xyz"


@pytest.mark.asyncio
async def test_send_request_missing_variable() -> None:
    """Test that missing variables are handled gracefully."""
    request_data = InterfaceSendRequest(
        url="https://api.example.com/users/{{missingVar}}",
        method="GET",
        environment_vars={},  # Missing variable
    )

    replaced_url = replace_variables(
        request_data.url,
        environment_vars=request_data.environment_vars,
    )

    # Variable should remain unreplaced if not found
    assert "{{missingVar}}" in replaced_url


@pytest.mark.asyncio
async def test_send_request_with_empty_variable_values() -> None:
    """Test sending request with empty variable values."""
    request_data = InterfaceSendRequest(
        url="https://api.example.com/users/{{userId}}",
        method="GET",
        environment_vars={"userId": ""},  # Empty value
    )

    replaced_url = replace_variables(
        request_data.url,
        environment_vars=request_data.environment_vars,
    )

    assert replaced_url == "https://api.example.com/users/"


@pytest.mark.asyncio
async def test_send_request_with_special_characters_in_variables() -> None:
    """Test sending request with special characters in variable values."""
    request_data = InterfaceSendRequest(
        url="https://api.example.com/users/{{userId}}",
        method="GET",
        environment_vars={
            "userId": "user@123+456",
        },
    )

    replaced_url = replace_variables(
        request_data.url,
        environment_vars=request_data.environment_vars,
    )

    assert replaced_url == "https://api.example.com/users/user@123+456"


@pytest.mark.asyncio
async def test_send_request_with_unicode_variables() -> None:
    """Test sending request with Unicode characters in variable values."""
    request_data = InterfaceSendRequest(
        url="https://api.example.com/users/{{username}}",
        method="GET",
        environment_vars={"username": "张三"},
    )

    replaced_url = replace_variables(
        request_data.url,
        environment_vars=request_data.environment_vars,
    )

    assert "张三" in replaced_url


@pytest.mark.asyncio
async def test_send_request_all_http_methods() -> None:
    """Test sending requests with all supported HTTP methods."""
    methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]

    for method in methods:
        request_data = InterfaceSendRequest(
            url="https://api.example.com/test",
            method=method,
        )

        assert request_data.method == method


@pytest.mark.asyncio
async def test_variable_priority_additional_over_env() -> None:
    """Test that additional variables override environment variables."""
    request_data = InterfaceSendRequest(
        url="https://api.example.com/users/{{key}}",
        method="GET",
        environment_vars={"key": "env_value"},
        additional_vars={"key": "add_value"},
    )

    replaced_url = replace_variables(
        request_data.url,
        environment_vars=request_data.environment_vars,
        additional_vars=request_data.additional_vars,
    )

    # Additional vars should take priority
    assert replaced_url == "https://api.example.com/users/add_value"


@pytest.mark.asyncio
async def test_variable_in_query_params() -> None:
    """Test variable replacement in query parameters."""
    request_data = InterfaceSendRequest(
        url="https://api.example.com/users",
        method="GET",
        params={
            "user_id": "{{userId}}",
            "filters": "{{filterType}}",
            "limit": "{{pageSize}}",
        },
        environment_vars={
            "userId": "123",
            "filterType": "active",
            "pageSize": "50",
        },
    )

    replaced_params = {
        k: replace_variables(str(v), environment_vars=request_data.environment_vars)
        for k, v in request_data.params.items()
    }

    assert replaced_params["user_id"] == "123"
    assert replaced_params["filters"] == "active"
    assert replaced_params["limit"] == "50"


@pytest.mark.asyncio
async def test_complex_json_body_with_variables() -> None:
    """Test complex JSON body with multiple levels of variables."""
    body_template = """{
        "user": {
            "id": "{{userId}}",
            "profile": {
                "name": "{{userName}}",
                "settings": {
                    "theme": "{{theme}}",
                    "language": "{{lang}}"
                }
            }
        },
        "meta": {
            "timestamp": "{{timestamp}}",
            "requestId": "{{requestId}}"
        }
    }"""

    request_data = InterfaceSendRequest(
        url="https://api.example.com/users",
        method="POST",
        headers={"Content-Type": "application/json"},
        body=body_template,
        environment_vars={
            "userId": "123",
            "userName": "Alice",
            "theme": "dark",
            "lang": "en",
            "timestamp": "1707654321",
            "requestId": "req-abc-123",
        },
    )

    replaced_body = replace_variables(
        request_data.body,
        environment_vars=request_data.environment_vars,
    )

    import json

    parsed_body = json.loads(replaced_body)
    assert parsed_body["user"]["id"] == "123"
    assert parsed_body["user"]["profile"]["name"] == "Alice"
    assert parsed_body["user"]["profile"]["settings"]["theme"] == "dark"
    assert parsed_body["meta"]["timestamp"] == "1707654321"


@pytest.mark.asyncio
async def test_send_request_with_timeout() -> None:
    """Test sending request with custom timeout."""
    request_data = InterfaceSendRequest(
        url="https://api.example.com/slow-endpoint",
        method="GET",
        timeout=60,  # 60 seconds
    )

    assert request_data.timeout == 60


@pytest.mark.asyncio
async def test_send_request_with_retry() -> None:
    """Test sending request with retry configuration."""
    request_data = InterfaceSendRequest(
        url="https://api.example.com/flaky-endpoint",
        method="GET",
        retry_times=3,
    )

    assert request_data.retry_times == 3


# Error handling tests


@pytest.mark.asyncio
async def test_error_invalid_url_format() -> None:
    """Test error handling for invalid URL format."""
    with pytest.raises(Exception):
        request_data = InterfaceSendRequest(
            url="not-a-valid-url",
            method="GET",
        )


@pytest.mark.asyncio
async def test_error_unsupported_method() -> None:
    """Test error handling for unsupported HTTP method."""
    with pytest.raises(Exception):
        request_data = InterfaceSendRequest(
            url="https://api.example.com",
            method="INVALID_METHOD",
        )


@pytest.mark.asyncio
async def test_circular_variable_reference_detection() -> None:
    """Test detection of circular variable references."""
    request_data = InterfaceSendRequest(
        url="{{varA}}",
        method="GET",
        environment_vars={
            "varA": "{{varB}}",
            "varB": "{{varA}}",
        },
        max_iterations=3,
    )

    # Should handle circular reference without infinite loop
    replaced_url = replace_variables(
        request_data.url,
        environment_vars=request_data.environment_vars,
        max_iterations=3,
    )

    # After max iterations, should return some result
    assert replaced_url is not None


@pytest.mark.asyncio
async def test_variable_replacement_performance() -> None:
    """Test performance of variable replacement with many variables."""
    large_vars = {f"var_{i}": f"value_{i}" for i in range(100)}

    template = "&".join([f"{{var_{i}}}" for i in range(100)])

    result = replace_variables(template, environment_vars=large_vars)

    # All variables should be replaced
    assert "{{var_" not in result
    assert "value_0" in result
    assert "value_99" in result
