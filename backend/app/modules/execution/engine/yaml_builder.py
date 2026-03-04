"""
YAML 构建器 - yaml_builder.py

将场景转换为 sisyphus-api-engine 兼容的 YAML 格式
"""
from typing import Any


def build_yaml_from_scenario(
    scenario: Any,
    environment: Any,
    variables: dict[str, Any] | None = None,
    dataset_row: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """将场景转换为 YAML 配置

    Args:
        scenario: 场景模型对象
        environment: 环境模型对象
        variables: 变量覆盖
        dataset_row: 数据集行数据

    Returns:
        YAML 配置字典
    """
    # 合并变量
    all_variables = {}
    if environment.variables:
        for var in environment.variables:
            all_variables[var.key] = var.value
    if scenario.variables:
        all_variables.update(scenario.variables)
    if variables:
        all_variables.update(variables)
    if dataset_row:
        all_variables.update(dataset_row)

    # 构建配置
    config = {
        "config": {
            "name": scenario.name,
            "base_url": environment.base_url or "",
            "variables": all_variables,
        },
        "teststeps": []
    }

    # 构建步骤
    for step in scenario.steps:
        teststep = build_step_from_keyword(
            step=step,
            variables=all_variables,
        )
        config["teststeps"].append(teststep)

    return config


def build_step_from_keyword(
    step: Any,
    variables: dict[str, Any],
) -> dict[str, Any]:
    """从关键字步骤构建 teststep

    Args:
        step: 场景步骤模型对象
        variables: 当前变量上下文

    Returns:
        teststep 字典
    """
    keyword_type = step.keyword_type
    keyword_method = step.keyword_method
    config = step.config or {}

    # 根据关键字类型构建不同的步骤
    if keyword_type == "request":
        return {
            "name": step.name,
            "request": {
                "method": config.get("method", "GET"),
                "url": config.get("url", ""),
                "params": config.get("params"),
                "headers": config.get("headers"),
                "json": config.get("json"),
                "data": config.get("data"),
            },
            "validate": config.get("validate", []),
            "extract": config.get("extract", {}),
        }

    elif keyword_type == "wait":
        return {
            "name": step.name,
            "wait": config.get("seconds", 1),
        }

    elif keyword_type == "assertion":
        return {
            "name": step.name,
            "validate": config.get("assertions", []),
        }

    elif keyword_type == "extract":
        return {
            "name": step.name,
            "extract": config.get("extractions", {}),
        }

    elif keyword_type == "sql":
        return {
            "name": step.name,
            "db": config.get("db_config"),
            "sql": config.get("sql"),
            "extract": config.get("extract", {}),
        }

    elif keyword_type == "custom":
        # 自定义关键字
        return {
            "name": step.name,
            "call": keyword_method,
            "args": config.get("args", []),
            "kwargs": config.get("kwargs", {}),
        }

    else:
        # 默认处理
        return {
            "name": step.name,
            keyword_type: config,
        }


def yaml_to_string(yaml_config: dict[str, Any]) -> str:
    """将 YAML 配置转换为字符串

    Args:
        yaml_config: YAML 配置字典

    Returns:
        YAML 字符串
    """
    import yaml
    return yaml.dump(yaml_config, allow_unicode=True, default_flow_style=False)
