"""内置关键字种子数据

在应用启动时, 自动创建内置关键字数据.
内置关键字不可编辑和删除, 代码会回显在前端页面作为参考.
"""

import uuid
import json
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.keyword import Keyword


# 内置关键字定义
BUILTIN_KEYWORDS = [
    {
        "id": "builtin-send-request",
        "name": "发送请求",
        "class_name": "request",
        "method_name": "send_http_request",
        "description": "支持requests库中所有支持的请求方式(GET、POST、PUT、DELETE、PATCH、HEAD、OPTIONS等)",
        "code": '''import requests
from typing import Any, Optional


def send_http_request(
    method: str,
    url: str,
    headers: Optional[dict] = None,
    params: Optional[dict] = None,
    body: Optional[Any] = None,
    body_type: str = "json",
    timeout: int = 30,
    verify_ssl: bool = True,
    cookies: Optional[dict] = None,
    allow_redirects: bool = True,
) -> requests.Response:
    """发送HTTP请求

    支持所有requests库中的请求方式:
    GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS

    Args:
        method: 请求方法 (GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS)
        url: 请求URL, 支持{{变量名}}引用环境变量
        headers: 请求头字典
        params: URL查询参数
        body: 请求体
        body_type: 请求体类型 (json/form/text/xml)
        timeout: 超时时间(秒)
        verify_ssl: 是否验证SSL证书
        cookies: Cookie字典
        allow_redirects: 是否允许重定向

    Returns:
        requests.Response: 响应对象
    """
    request_kwargs = {
        "method": method.upper(),
        "url": url,
        "headers": headers or {},
        "params": params,
        "timeout": timeout,
        "verify": verify_ssl,
        "cookies": cookies,
        "allow_redirects": allow_redirects,
    }

    # 根据body_type处理请求体
    if body is not None:
        if body_type == "json":
            request_kwargs["json"] = body
        elif body_type == "form":
            request_kwargs["data"] = body
        elif body_type == "text":
            request_kwargs["data"] = str(body)
        elif body_type == "xml":
            request_kwargs["data"] = str(body)
            request_kwargs["headers"]["Content-Type"] = "application/xml"

    response = requests.request(**request_kwargs)
    return response
''',
        "parameters": json.dumps([
            {"name": "method", "type": "string", "description": "请求方法(GET/POST/PUT/DELETE/PATCH等)", "required": True},
            {"name": "url", "type": "string", "description": "请求URL, 支持{{变量名}}引用", "required": True},
            {"name": "headers", "type": "dict", "description": "请求头字典", "required": False},
            {"name": "params", "type": "dict", "description": "URL查询参数", "required": False},
            {"name": "body", "type": "any", "description": "请求体内容", "required": False},
            {"name": "body_type", "type": "string", "description": "请求体类型(json/form/text/xml)", "required": False},
            {"name": "timeout", "type": "int", "description": "超时时间, 单位: 秒, 默认30", "required": False},
            {"name": "cookies", "type": "dict", "description": "Cookie字典", "required": False},
        ]),
    },
    {
        "id": "builtin-assertion",
        "name": "断言类型",
        "class_name": "assertion",
        "method_name": "assert_response",
        "description": "断言对象支持JSON、Header、Cookie、环境变量、HTTP Code、耗时等多种断言方式",
        "code": '''import json
import jsonpath_ng
from typing import Any, Optional


def assert_response(
    assert_target: str,
    expression: str,
    operator: str,
    expected_value: Any,
    response: Optional[dict] = None,
) -> dict:
    """响应断言

    支持多种断言对象:
    - json: 对JSON响应体进行JSONPath断言
    - header: 对响应头进行断言
    - cookie: 对Cookie进行断言
    - env_variable: 对环境变量进行断言
    - status_code: 对HTTP状态码进行断言
    - response_time: 对响应耗时进行断言(毫秒)
    - body: 对响应体文本进行断言

    Args:
        assert_target: 断言对象 (json/header/cookie/env_variable/status_code/response_time/body)
        expression: 表达式
            - json: JSONPath表达式, 如 $.data.id
            - header: 响应头名称, 如 Content-Type
            - cookie: Cookie名称
            - env_variable: 环境变量名称
            - status_code: 留空
            - response_time: 留空
        operator: 判断符号
            - eq: 等于
            - neq: 不等于
            - gt: 大于
            - gte: 大于等于
            - lt: 小于
            - lte: 小于等于
            - contains: 包含
            - not_contains: 不包含
            - starts_with: 以...开头
            - ends_with: 以...结尾
            - regex: 正则匹配
            - is_null: 为空
            - is_not_null: 不为空
            - in_list: 在列表中
            - type_is: 类型为
        expected_value: 预期结果
        response: 响应对象(内部传入)

    Returns:
        dict: {"success": bool, "actual": Any, "message": str}
    """
    actual_value = None

    # 根据断言对象获取实际值
    if assert_target == "json":
        json_expr = jsonpath_ng.parse(expression)
        matches = json_expr.find(response.get("body", {}))
        actual_value = matches[0].value if matches else None
    elif assert_target == "header":
        actual_value = response.get("headers", {}).get(expression)
    elif assert_target == "cookie":
        actual_value = response.get("cookies", {}).get(expression)
    elif assert_target == "status_code":
        actual_value = response.get("status_code")
    elif assert_target == "response_time":
        actual_value = response.get("elapsed_ms")

    # 执行断言比较
    result = _compare(actual_value, operator, expected_value)

    return {
        "success": result,
        "actual": actual_value,
        "expected": expected_value,
        "operator": operator,
        "message": f"断言{'通过' if result else '失败'}: "
                   f"实际值={actual_value}, 预期值={expected_value}",
    }


def _compare(actual: Any, operator: str, expected: Any) -> bool:
    """执行比较操作"""
    if operator == "eq":
        return str(actual) == str(expected)
    elif operator == "neq":
        return str(actual) != str(expected)
    elif operator == "gt":
        return float(actual) > float(expected)
    elif operator == "gte":
        return float(actual) >= float(expected)
    elif operator == "lt":
        return float(actual) < float(expected)
    elif operator == "lte":
        return float(actual) <= float(expected)
    elif operator == "contains":
        return str(expected) in str(actual)
    elif operator == "not_contains":
        return str(expected) not in str(actual)
    elif operator == "is_null":
        return actual is None
    elif operator == "is_not_null":
        return actual is not None
    return False
''',
        "parameters": json.dumps([
            {"name": "assert_target", "type": "string", "description": "断言对象(json/header/cookie/status_code/response_time等)", "required": True},
            {"name": "expression", "type": "string", "description": "表达式(JSONPath/Header名称/Cookie名称等)", "required": True},
            {"name": "operator", "type": "string", "description": "判断符号(eq/neq/gt/gte/lt/lte/contains等)", "required": True},
            {"name": "expected_value", "type": "any", "description": "预期结果", "required": True},
        ]),
    },
    {
        "id": "builtin-extract-variable",
        "name": "提取变量",
        "class_name": "extract",
        "method_name": "extract_variable",
        "description": "提取对象支持JSON、Header、Cookie, 支持JSONPath提取, 提取后可在后续步骤中通过{{变量名}}引用",
        "code": '''import jsonpath_ng
from typing import Any, Optional


def extract_variable(
    extract_target: str,
    expression: str,
    variable_name: str,
    variable_scope: str = "environment",
    default_value: Any = None,
    response: Optional[dict] = None,
) -> dict:
    """提取变量

    从响应中提取值并存储为变量, 在后续步骤中通过{{变量名}}引用.

    支持提取对象:
    - json: 使用JSONPath表达式从JSON响应体中提取
    - header: 从响应头中提取
    - cookie: 从Cookie中提取

    Args:
        extract_target: 提取对象 (json/header/cookie)
        expression: 提取表达式
            - json: JSONPath表达式, 如 $.data.token
            - header: 响应头名称, 如 Authorization
            - cookie: Cookie名称, 如 session_id
        variable_name: 变量名称, 后续通过{{variable_name}}引用
        variable_scope: 变量作用域
            - global: 全局变量(所有环境可用)
            - environment: 环境变量(当前环境可用)
        default_value: 默认值, 提取失败时使用
        response: 响应对象(内部传入)

    Returns:
        dict: {"variable_name": str, "value": Any, "scope": str}
    """
    extracted_value = None

    if extract_target == "json":
        json_expr = jsonpath_ng.parse(expression)
        body = response.get("body", {})
        matches = json_expr.find(body)
        if matches:
            extracted_value = matches[0].value
    elif extract_target == "header":
        extracted_value = response.get("headers", {}).get(expression)
    elif extract_target == "cookie":
        extracted_value = response.get("cookies", {}).get(expression)

    # 使用默认值
    if extracted_value is None:
        extracted_value = default_value

    return {
        "variable_name": variable_name,
        "value": extracted_value,
        "scope": variable_scope,
        "success": extracted_value is not None,
        "message": f"变量 {variable_name} = {extracted_value}",
    }
''',
        "parameters": json.dumps([
            {"name": "extract_target", "type": "string", "description": "提取对象(json/header/cookie)", "required": True},
            {"name": "expression", "type": "string", "description": "提取表达式(JSONPath/Header名称/Cookie名称)", "required": True},
            {"name": "variable_name", "type": "string", "description": "变量名称, 后续通过{{变量名}}引用", "required": True},
            {"name": "variable_scope", "type": "string", "description": "变量作用域(global/environment)", "required": False},
            {"name": "default_value", "type": "any", "description": "默认值, 提取失败时使用", "required": False},
        ]),
    },
    {
        "id": "builtin-db-operation",
        "name": "数据库操作",
        "class_name": "database",
        "method_name": "execute_sql",
        "description": "支持选择对应项目下的数据源, 输入SQL命令, 支持数据库断言和提取变量",
        "code": '''from typing import Any, Optional


def execute_sql(
    datasource_id: str,
    sql: str,
    action: str = "query",
    assert_field: Optional[str] = None,
    assert_operator: Optional[str] = None,
    assert_value: Optional[Any] = None,
    extract_variable_name: Optional[str] = None,
    extract_field: Optional[str] = None,
    extract_scope: str = "environment",
) -> dict:
    """数据库操作

    支持选择项目下的数据源, 执行SQL命令.
    可选: 对查询结果进行断言, 或提取变量.

    操作类型:
    - query: 查询(SELECT)
    - execute: 执行(INSERT/UPDATE/DELETE)
    - assert: 查询并断言
    - extract: 查询并提取变量

    Args:
        datasource_id: 数据源ID(项目配置中的数据库连接)
        sql: SQL命令, 支持{{变量名}}引用
            - 示例: SELECT * FROM users WHERE id = {{user_id}}
        action: 操作类型 (query/execute/assert/extract)
        assert_field: 断言字段名(action=assert时使用)
        assert_operator: 断言操作符(eq/neq/gt/lt/contains等)
        assert_value: 断言预期值
        extract_variable_name: 提取的变量名称(action=extract时使用)
        extract_field: 提取的字段名
        extract_scope: 变量作用域(global/environment)

    Returns:
        dict: {
            "rows": list,       # 查询结果
            "affected": int,    # 影响行数
            "assert_result": dict,  # 断言结果(可选)
            "extract_result": dict, # 提取结果(可选)
        }
    """
    # 注意: 实际执行由引擎层处理, 此处仅定义接口规范
    result = {
        "rows": [],
        "affected": 0,
        "success": True,
        "message": "",
    }

    # 执行SQL(由引擎内部处理数据库连接)
    # connection = get_datasource_connection(datasource_id)
    # cursor = connection.execute(sql)

    if action == "query":
        # result["rows"] = cursor.fetchall()
        result["message"] = "查询执行成功"
    elif action == "execute":
        # result["affected"] = cursor.rowcount
        result["message"] = "SQL执行成功"
    elif action == "assert":
        # 查询并断言
        result["assert_result"] = {
            "field": assert_field,
            "operator": assert_operator,
            "expected": assert_value,
            "actual": None,
            "success": False,
        }
    elif action == "extract":
        # 查询并提取变量
        result["extract_result"] = {
            "variable_name": extract_variable_name,
            "field": extract_field,
            "value": None,
            "scope": extract_scope,
        }

    return result
''',
        "parameters": json.dumps([
            {"name": "datasource_id", "type": "string", "description": "数据源ID(项目配置中的数据库连接)", "required": True},
            {"name": "sql", "type": "string", "description": "SQL命令, 支持{{变量名}}引用", "required": True},
            {"name": "action", "type": "string", "description": "操作类型(query/execute/assert/extract)", "required": False},
            {"name": "assert_field", "type": "string", "description": "断言字段名(action=assert时)", "required": False},
            {"name": "assert_operator", "type": "string", "description": "断言操作符", "required": False},
            {"name": "assert_value", "type": "any", "description": "断言预期值", "required": False},
            {"name": "extract_variable_name", "type": "string", "description": "提取的变量名称", "required": False},
            {"name": "extract_field", "type": "string", "description": "提取的字段名", "required": False},
        ]),
    },
    {
        "id": "builtin-custom-operation",
        "name": "自定义操作",
        "class_name": "custom",
        "method_name": "custom_placeholder",
        "description": "占位符, 用于自定义扩展操作逻辑, 可在此基础上创建自定义关键字",
        "code": '''from typing import Any, Optional


def custom_placeholder(
    name: str = "自定义操作",
    description: str = "",
    **kwargs: Any,
) -> dict:
    """自定义操作(占位符)

    此关键字作为模版, 用户可在此基础上创建自己的自定义关键字.
    自定义关键字支持:
    - 自定义入参
    - 自定义逻辑
    - 返回自定义结果

    使用方式:
    1. 在关键字配置页面点击「新建关键字」
    2. 选择关键字类型为「自定义」
    3. 编写自定义代码逻辑
    4. 定义入参释义
    5. 保存后即可在场景编排中使用

    Args:
        name: 操作名称
        description: 操作描述
        **kwargs: 自定义参数

    Returns:
        dict: {"success": bool, "message": str, "data": Any}
    """
    return {
        "success": True,
        "message": f"自定义操作 [{name}] 执行完成",
        "data": kwargs,
    }
''',
        "parameters": json.dumps([
            {"name": "name", "type": "string", "description": "操作名称", "required": False},
            {"name": "description", "type": "string", "description": "操作描述", "required": False},
        ]),
    },
]


async def seed_builtin_keywords(session: AsyncSession) -> None:
    """初始化内置关键字种子数据

    检查是否已存在内置关键字, 如果不存在则创建.
    已存在的内置关键字会更新代码内容(保持最新).

    Args:
        session: 异步数据库会话
    """
    for kw_data in BUILTIN_KEYWORDS:
        # 检查是否已存在
        result = await session.execute(
            select(Keyword).where(Keyword.id == kw_data["id"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            # 更新现有内置关键字的代码和参数(保持最新)
            existing.code = kw_data["code"]
            existing.parameters = kw_data["parameters"]
            existing.description = kw_data["description"]
            existing.updated_at = datetime.utcnow()
            session.add(existing)
        else:
            # 创建新的内置关键字
            keyword = Keyword(
                id=kw_data["id"],
                project_id=None,
                name=kw_data["name"],
                class_name=kw_data["class_name"],
                method_name=kw_data["method_name"],
                description=kw_data["description"],
                code=kw_data["code"],
                parameters=kw_data["parameters"],
                is_built_in=True,
                is_enabled=True,
            )
            session.add(keyword)

    await session.commit()
