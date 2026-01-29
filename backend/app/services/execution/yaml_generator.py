"""
YAML生成器 - 将表单数据转换为YAML格式

支持将前端表单数据转换为 Sisyphus-api-engine 可识别的 YAML 格式
"""

import yaml
from typing import Dict, Any, List
from . import TestCaseForm
from .exceptions import YAMLGenerationException


class YAMLGenerator:
    """YAML生成器 - 将表单数据转换为YAML"""

    def generate_from_form(self, form_data: TestCaseForm) -> str:
        """
        从表单数据生成YAML

        Args:
            form_data: 测试用例表单数据

        Returns:
            YAML字符串

        Raises:
            YAMLGenerationException: 生成失败时抛出
        """
        try:
            # 构建基础结构
            yaml_dict = {
                "name": form_data.name,
                "description": form_data.description or "",
            }

            # 添加配置
            if form_data.variables or form_data.config:
                yaml_dict["config"] = {}
                if form_data.variables:
                    yaml_dict["config"]["variables"] = form_data.variables
                if form_data.config:
                    yaml_dict["config"].update(form_data.config)

            # 转换步骤
            yaml_dict["steps"] = []
            for step in form_data.steps:
                yaml_dict["steps"].append(self._convert_step(step))

            # 生成YAML
            return yaml.dump(
                yaml_dict,
                allow_unicode=True,
                sort_keys=False,
                default_flow_style=False
            )

        except Exception as e:
            raise YAMLGenerationException(f"Failed to generate YAML: {str(e)}")

    def _convert_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """
        转换单个步骤

        Args:
            step: 步骤数据

        Returns:
            转换后的步骤字典
        """
        step_type = step.get("type")

        if step_type == "request":
            return self._convert_request_step(step)
        elif step_type == "database":
            return self._convert_database_step(step)
        elif step_type == "wait":
            return self._convert_wait_step(step)
        elif step_type == "keyword":
            return self._convert_keyword_step(step)
        elif step_type == "condition":
            return self._convert_condition_step(step)
        else:
            raise YAMLGenerationException(f"Unknown step type: {step_type}")

    def _convert_request_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """转换HTTP请求步骤"""
        params = step.get("params", {})

        step_dict = {
            step["name"]: {
                "type": "request",
                "url": params.get("url", ""),
                "method": params.get("method", "GET"),
            }
        }

        # 添加可选参数
        if "headers" in params and params["headers"]:
            step_dict[step["name"]]["headers"] = params["headers"]

        if "params" in params and params["params"]:
            step_dict[step["name"]]["params"] = params["params"]

        if "body" in params and params["body"]:
            step_dict[step["name"]]["json"] = params["body"]

        # 添加验证规则
        if "validations" in step and step["validations"]:
            step_dict[step["name"]]["validate"] = self._convert_validations(step["validations"])

        # 添加条件
        if "skip_if" in step and step["skip_if"]:
            step_dict[step["name"]]["skip_if"] = step["skip_if"]

        if "only_if" in step and step["only_if"]:
            step_dict[step["name"]]["only_if"] = step["only_if"]

        return step_dict

    def _convert_database_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """转换数据库操作步骤"""
        params = step.get("params", {})

        step_dict = {
            step["name"]: {
                "type": "database",
                "operation": {
                    "type": params.get("operation_type", "query"),
                    "sql": params.get("sql", ""),
                }
            }
        }

        # 添加数据库配置
        if "db_type" in params:
            step_dict[step["name"]]["operation"]["db_type"] = params["db_type"]

        if "connection" in params:
            step_dict[step["name"]]["operation"]["connection"] = params["connection"]

        # 添加验证规则
        if "validations" in step and step["validations"]:
            step_dict[step["name"]]["validate"] = self._convert_validations(step["validations"])

        return step_dict

    def _convert_wait_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """转换等待步骤"""
        params = step.get("params", {})
        wait_type = params.get("wait_type", "fixed")

        if wait_type == "fixed":
            return {
                step["name"]: {
                    "type": "wait",
                    "wait": {
                        "type": "fixed",
                        "seconds": params.get("seconds", 1)
                    }
                }
            }
        elif wait_type == "condition":
            return {
                step["name"]: {
                    "type": "wait",
                    "wait": {
                        "type": "condition",
                        "condition": params.get("condition", ""),
                        "timeout": params.get("timeout", 30),
                        "interval": params.get("interval", 1)
                    }
                }
            }
        else:
            raise YAMLGenerationException(f"Unknown wait type: {wait_type}")

    def _convert_keyword_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """转换关键字步骤"""
        params = step.get("params", {})

        return {
            step["name"]: {
                "type": "keyword",
                "keyword": params.get("keyword_name", ""),
                "params": params.get("keyword_params", {})
            }
        }

    def _convert_condition_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """转换条件判断步骤"""
        params = step.get("params", {})

        condition_dict = {
            step["name"]: {
                "type": "condition",
                "condition": params.get("condition", ""),
            }
        }

        # 添加 then 分支
        if "then_steps" in params and params["then_steps"]:
            condition_dict[step["name"]]["then"] = [
                self._convert_step(s) for s in params["then_steps"]
            ]

        # 添加 else 分支
        if "else_steps" in params and params["else_steps"]:
            condition_dict[step["name"]]["else"] = [
                self._convert_step(s) for s in params["else_steps"]
            ]

        return condition_dict

    def _convert_validations(self, validations: List[Dict[str, Any]]) -> List[Dict]:
        """转换验证规则"""
        converted = []

        for validation in validations:
            v_type = validation.get("type")
            v_path = validation.get("path")
            v_value = validation.get("value")

            if v_type == "eq":
                converted.append({"eq": [v_path, v_value]})
            elif v_type == "ne":
                converted.append({"ne": [v_path, v_value]})
            elif v_type == "gt":
                converted.append({"gt": [v_path, v_value]})
            elif v_type == "lt":
                converted.append({"lt": [v_path, v_value]})
            elif v_type == "contains":
                converted.append({"contains": [v_path, v_value]})
            elif v_type == "type":
                converted.append({"type": [v_path, v_value]})
            else:
                # 未知类型，保持原样
                converted.append(validation)

        return converted
