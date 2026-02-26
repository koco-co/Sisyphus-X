"""HTTP 请求执行器 - 发送请求并返回响应与耗时"""

import time
from typing import Any

import requests

from apirun.core.models import RequestStepParams


def execute_request_step(
    params: RequestStepParams,
    base_url: str = "",
    variables: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    执行单步 HTTP 请求
    :param params: 请求参数
    :param base_url: 环境 base_url，与 params.url 拼接
    :param variables: 变量表，用于替换 {{var}}
    :return: 含 status_code, headers, body, response_time, error 的字典
    """
    variables = variables or {}
    url = params.url
    if base_url and not url.startswith(("http://", "https://")):
        url = (base_url.rstrip("/") + "/" + url.lstrip("/")) if url else base_url
    for k, v in variables.items():
        url = url.replace("{{" + k + "}}", str(v))
    method = (params.method or "GET").upper()
    start = time.perf_counter()
    try:
        resp = requests.request(
            method=method,
            url=url,
            headers=params.headers,
            params=params.params,
            json=params.json_body,
            data=params.data,
            files=params.files,
            cookies=params.cookies,
            timeout=params.timeout,
            allow_redirects=params.allow_redirects,
            verify=params.verify,
        )
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        try:
            body = resp.json()
        except Exception:
            body = resp.text
        return {
            "status_code": resp.status_code,
            "headers": dict(resp.headers),
            "body": body,
            "body_size": len(resp.content),
            "response_time": elapsed_ms,
            "cookies": dict(resp.cookies),
            "error": None,
        }
    except requests.exceptions.Timeout as e:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return {
            "status_code": 0,
            "headers": {},
            "body": None,
            "body_size": 0,
            "response_time": elapsed_ms,
            "cookies": {},
            "error": {"code": "REQUEST_TIMEOUT", "message": str(e), "detail": None},
        }
    except Exception as e:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return {
            "status_code": 0,
            "headers": {},
            "body": None,
            "body_size": 0,
            "response_time": elapsed_ms,
            "cookies": {},
            "error": {"code": "REQUEST_CONNECTION_ERROR", "message": str(e), "detail": None},
        }
