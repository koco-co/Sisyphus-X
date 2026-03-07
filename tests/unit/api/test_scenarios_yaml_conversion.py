from types import SimpleNamespace

from app.api.v1.endpoints.scenarios import _convert_step_to_yaml


def test_convert_request_step_supports_legacy_ui_payload_shape():
    step = SimpleNamespace(
        description="调用健康检查",
        keyword_type="request",
        keyword_name="发送请求",
        parameters={
            "config": {
                "method": "GET",
                "url": "http://localhost:8000/health",
                "headers": [{"key": "X-Test", "value": "yes"}],
                "body": '{"ping": true}',
            },
            "assertions": [
                {"type": "status_code", "expression": "", "expected": "200", "message": "equals"},
                {"type": "response_json", "expression": "$.status", "expected": "ok", "message": "equals"},
            ],
            "extractions": [
                {"name": "health_status", "source": "response_json", "expression": "$.status", "variableType": "global"}
            ],
        },
    )

    result = _convert_step_to_yaml(step)

    assert result == {
        "name": "调用健康检查",
        "keyword_type": "request",
        "keyword_name": "http_request",
        "request": {
            "method": "GET",
            "url": "http://localhost:8000/health",
            "headers": {"X-Test": "yes"},
            "json": {"ping": True},
        },
        "validate": [
            {"target": "status_code", "comparator": "eq", "expected": 200},
            {"target": "json", "expression": "$.status", "comparator": "eq", "expected": "ok"},
        ],
        "extract": [
            {"name": "health_status", "type": "json", "expression": "$.status", "scope": "global"}
        ],
    }


def test_convert_request_step_keeps_engine_native_shape():
    step = SimpleNamespace(
        description="原生请求步骤",
        keyword_type="request",
        keyword_name="http_request",
        parameters={
            "method": "GET",
            "url": "http://localhost:8000/health",
            "headers": {"X-Test": "yes"},
            "validate": [{"target": "status_code", "comparator": "eq", "expected": 200}],
            "extract": [{"name": "status", "type": "json", "expression": "$.status", "scope": "global"}],
        },
    )

    result = _convert_step_to_yaml(step)

    assert result == {
        "name": "原生请求步骤",
        "keyword_type": "request",
        "keyword_name": "http_request",
        "request": {
            "method": "GET",
            "url": "http://localhost:8000/health",
            "headers": {"X-Test": "yes"},
        },
        "validate": [{"target": "status_code", "comparator": "eq", "expected": 200}],
        "extract": [{"name": "status", "type": "json", "expression": "$.status", "scope": "global"}],
    }


def test_convert_request_step_normalizes_legacy_validate_rules():
    step = SimpleNamespace(
        description="旧格式断言步骤",
        keyword_type="request",
        keyword_name="http_request",
        parameters={
            "method": "GET",
            "url": "http://localhost:8000/health",
            "validate": [{"equals": ["status_code", 200]}],
        },
    )

    result = _convert_step_to_yaml(step)

    assert result == {
        "name": "旧格式断言步骤",
        "keyword_type": "request",
        "keyword_name": "http_request",
        "request": {
            "method": "GET",
            "url": "http://localhost:8000/health",
        },
        "validate": [{"target": "status_code", "comparator": "eq", "expected": 200}],
    }
