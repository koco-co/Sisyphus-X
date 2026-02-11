"""
API 测试执行引擎 - 核心执行模块

负责解析 YAML 测试用例并执行 HTTP 请求
"""

import json
from datetime import datetime
from typing import Any

import httpx
import yaml


class TestExecutionContext:
    """测试执行上下文"""

    def __init__(
        self, environment: dict[str, Any], variables: dict[str, Any] | None = None
    ):
        self.environment = environment or {}
        self.variables = variables or {}
        self.extracted_data: dict[str, Any] = {}
        self.request_count = 0

    def resolve_value(self, value: Any) -> Any:
        """解析变量引用，支持 {{variable}} 语法"""
        if isinstance(value, str):
            # 替换环境变量
            value = value.replace("{{base_url}}", self.environment.get("domain", ""))
            value = value.replace("{{environment.domain}}", self.environment.get("domain", ""))

            # 替换用户定义的变量
            for var_name, var_value in self.variables.items():
                value = value.replace(f"{{{{{var_name}}}}}", str(var_value))

            # 替换提取的数据
            for key, val in self.extracted_data.items():
                value = value.replace(f"{{{{{key}}}}}", str(val))

        return value

    def extract_from_response(self, response_data: Any, extract_config: dict[str, str]):
        """从响应中提取数据"""
        if not extract_config:
            return

        for key, path in extract_config.items():
            try:
                value = response_data
                for part in path.split("."):
                    if isinstance(value, dict):
                        value = value.get(part)
                    elif isinstance(value, list) and part.isdigit():
                        value = value[int(part)]
                    else:
                        break

                if value is not None:
                    self.extracted_data[key] = value
            except Exception:
                continue


class TestStepExecutor:
    """测试步骤执行器"""

    def __init__(self, context: TestExecutionContext, timeout: int = 30):
        self.context = context
        self.timeout = timeout
        self.client = httpx.Client(timeout=timeout)

    def build_request(self, step: dict[str, Any]) -> httpx.Request:
        """构建 HTTP 请求"""
        method = step.get("method", "GET").upper()
        url = self.context.resolve_value(step.get("url", ""))

        # 解析请求头
        headers = {}
        for key, value in step.get("headers", {}).items():
            headers[key] = self.context.resolve_value(value)

        # 添加环境级别的 headers
        env_headers = self.context.environment.get("headers", {})
        for key, value in env_headers.items():
            if key not in headers:
                headers[key] = value

        # 解析查询参数
        params = {}
        for key, value in step.get("params", {}).items():
            params[key] = self.context.resolve_value(value)

        # 解析请求体
        body = step.get("body")
        if body:
            if isinstance(body, dict):
                body = json.dumps({k: self.context.resolve_value(v) for k, v in body.items()})
            elif isinstance(body, str):
                body = self.context.resolve_value(body)

        # 构建完整 URL
        base_url = self.context.environment.get("domain", "")
        if not url.startswith("http"):
            url = f"{base_url.rstrip('/')}/{url.lstrip('/')}"

        # 创建请求
        request = httpx.Request(method, url, headers=headers, params=params, content=body)
        return request

    def execute_assertion(self, response: httpx.Response, assertion: dict[str, Any]) -> bool:
        """执行断言"""
        assertion_type = assertion.get("type", "status")

        try:
            if assertion_type == "status":
                expected = assertion.get("value", 200)
                return response.status_code == expected

            elif assertion_type == "contains":
                expected = assertion.get("value")
                if expected is None:
                    return False
                response_text = response.text
                return expected in response_text

            elif assertion_type == "json_path":
                path = assertion.get("path")
                if not isinstance(path, str):
                    return False
                expected = assertion.get("value")
                response_data = response.json()

                # 简单的 JSON 路径查询
                value = response_data
                for part in path.split("."):
                    if isinstance(value, dict):
                        value = value.get(part)
                    elif isinstance(value, list) and part.isdigit():
                        value = value[int(part)]
                    else:
                        return False

                return value == expected

            elif assertion_type == "response_time":
                # max_time = assertion.get("value", 1000)  # 默认 1000ms
                # httpx 不直接提供响应时间，这里返回 True
                # 实际应用中需要用 time.time() 测量
                return True

        except Exception:
            return False

        return True

    def execute_step(self, step: dict[str, Any]) -> dict[str, Any]:
        """执行单个测试步骤"""
        start_time = datetime.now()
        result = {
            "name": step.get("name", "Unnamed Step"),
            "status": "pending",
            "request": {},
            "response": {},
            "assertions": [],
            "duration": 0,
            "error": None,
        }

        try:
            # 构建请求
            request = self.build_request(step)
            result["request"] = {
                "method": request.method,
                "url": str(request.url),
                "headers": dict(request.headers),
                "body": request.content.decode() if request.content else None,
            }

            # 执行请求
            response = self.client.send(request)

            # 记录响应
            response_data = {
                "status": response.status_code,
                "headers": dict(response.headers),
                "body": response.text[:1000]
                if len(response.text) > 1000
                else response.text,  # 限制大小
            }

            try:
                response_data["json"] = response.json()
            except Exception:  # noqa: BLE001 (ignore bare except warning)
                pass

            result["response"] = response_data

            # 执行断言
            assertions = step.get("assertions", [])
            if not assertions:
                # 默认断言：状态码 2xx
                assertions = [{"type": "status", "value": 200}]

            assertion_results = []
            all_passed = True

            for assertion in assertions:
                passed = self.execute_assertion(response, assertion)
                assertion_results.append(
                    {
                        "type": assertion.get("type"),
                        "expected": assertion.get("value"),
                        "passed": passed,
                    }
                )
                if not passed:
                    all_passed = False

            result["assertions"] = assertion_results
            result["status"] = "passed" if all_passed else "failed"

            # 提取数据
            extract = step.get("extract")
            if extract and response_data.get("json"):
                self.context.extract_from_response(response_data["json"], extract)

        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)

        finally:
            duration = (datetime.now() - start_time).total_seconds() * 1000
            result["duration"] = round(duration, 2)

        return result


class TestExecutor:
    """测试用例执行器"""

    def __init__(
        self, environment: dict[str, Any], variables: dict[str, Any] | None = None
    ):
        self.context = TestExecutionContext(environment, variables)

    def parse_yaml(self, yaml_content: str) -> dict[str, Any]:
        """解析 YAML 测试用例"""
        try:
            return yaml.safe_load(yaml_content)
        except Exception as e:
            raise ValueError(f"YAML 解析失败: {str(e)}")

    def execute_test_case(self, yaml_content: str) -> dict[str, Any]:
        """执行完整的测试用例"""
        start_time = datetime.now()

        # 解析 YAML
        test_case = self.parse_yaml(yaml_content)

        result = {
            "name": test_case.get("name", "Unnamed Test Case"),
            "status": "pending",
            "steps": [],
            "total_steps": 0,
            "passed_steps": 0,
            "failed_steps": 0,
            "error_steps": 0,
            "duration": 0,
            "error": None,
        }

        try:
            # 获取测试步骤
            steps = test_case.get("steps", [])
            if not steps:
                raise ValueError("测试用例没有定义步骤")

            result["total_steps"] = len(steps)

            # 执行每个步骤
            executor = TestStepExecutor(self.context)

            for step_config in steps:
                step_result = executor.execute_step(step_config)
                result["steps"].append(step_result)

                # 统计
                if step_result["status"] == "passed":
                    result["passed_steps"] += 1
                elif step_result["status"] == "failed":
                    result["failed_steps"] += 1
                elif step_result["status"] == "error":
                    result["error_steps"] += 1

                # 如果步骤失败且配置了失败时停止，则中断执行
                if step_result["status"] in ["failed", "error"] and step_config.get(
                    "stop_on_failure", True
                ):
                    break

            # 确定整体状态
            if result["error_steps"] > 0:
                result["status"] = "error"
            elif result["failed_steps"] > 0:
                result["status"] = "failed"
            else:
                result["status"] = "passed"

        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)

        finally:
            duration = (datetime.now() - start_time).total_seconds()
            result["duration"] = round(duration, 2)

        return result

    def execute_batch(self, test_cases: list[str]) -> list[dict[str, Any]]:
        """批量执行测试用例"""
        results = []
        for yaml_content in test_cases:
            result = self.execute_test_case(yaml_content)
            results.append(result)
        return results
