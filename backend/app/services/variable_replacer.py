"""Variable replacement service for template strings."""

import random
import re
import time
import uuid
from datetime import datetime
from typing import Any


class VariableReplacer:
    """Replace variables in template strings."""

    # Pattern for environment variables: {{variable_name}}
    ENV_VAR_PATTERN = re.compile(r"\{\{(\w+)\}\}")

    # Pattern for system variables: {{$function_name(args)}}
    SYSTEM_VAR_PATTERN = re.compile(r"\{\{\$(\w+)(?:\(([^)]*)\))?\}\}")

    def __init__(self) -> None:
        """Initialize the replacer."""
        self._system_functions: dict[str, Any] = {
            "timestamp": self._timestamp,
            "randomInt": self._random_int,
            "randomint": self._random_int,
            "guid": self._guid,
            "uuid": self._guid,
            "date": self._date,
        }

    def replace(
        self,
        text: str,
        environment_vars: dict[str, Any] | None = None,
        additional_vars: dict[str, Any] | None = None,
        max_iterations: int = 10,
    ) -> tuple[str, list[str]]:
        """Replace all variables in the template string.

        Args:
            text: Template string with variables
            environment_vars: Environment variables
            additional_vars: Additional variables (higher priority than env vars)
            max_iterations: Maximum iterations for recursive replacement

        Returns:
            Tuple of (replaced_string, list_of_used_variable_names)
        """
        if not text:
            return text, []

        # Merge variables (additional vars have higher priority)
        all_vars: dict[str, Any] = {}
        if environment_vars:
            all_vars.update(environment_vars)
        if additional_vars:
            all_vars.update(additional_vars)

        # Track used variables
        used_vars: set[str] = set()

        # Iteratively replace variables (handle nested variables)
        current_text = text
        for _ in range(max_iterations):
            prev_text = current_text

            # Replace system variables
            current_text, used_system_vars = self._replace_system_variables(current_text)
            used_vars.update(used_system_vars)

            # Replace environment variables
            current_text, used_env_vars = self._replace_env_variables(current_text, all_vars)
            used_vars.update(used_env_vars)

            # Stop if no more replacements
            if current_text == prev_text:
                break

        return current_text, sorted(used_vars)

    def _replace_env_variables(
        self, text: str, variables: dict[str, Any]
    ) -> tuple[str, set[str]]:
        """Replace environment variables.

        Args:
            text: Template string
            variables: Variable values

        Returns:
            Tuple of (replaced_string, set_of_used_variable_names)
        """
        used_vars: set[str] = set()

        def replace_var(match: re.Match[str]) -> str:
            var_name = match.group(1)
            used_vars.add(var_name)
            return str(variables.get(var_name, match.group(0)))

        result = self.ENV_VAR_PATTERN.sub(replace_var, text)
        return result, used_vars

    def _replace_system_variables(self, text: str) -> tuple[str, set[str]]:
        """Replace system variables.

        Args:
            text: Template string

        Returns:
            Tuple of (replaced_string, set_of_used_function_names)
        """
        used_vars: set[str] = set()

        def replace_var(match: re.Match[str]) -> str:
            func_name = match.group(1)
            args_str = match.group(2) or ""

            used_vars.add(func_name)

            if func_name in self._system_functions:
                func = self._system_functions[func_name]
                args = self._parse_args(args_str)
                try:
                    return str(func(*args))
                except Exception:
                    return match.group(0)

            return match.group(0)

        result = self.SYSTEM_VAR_PATTERN.sub(replace_var, text)
        return result, used_vars

    def _parse_args(self, args_str: str) -> list[Any]:
        """Parse function arguments.

        Args:
            args_str: Arguments string

        Returns:
            List of argument values
        """
        if not args_str:
            return []

        # Try to parse as comma-separated values
        args = [arg.strip() for arg in args_str.split(",")]

        # Convert numeric strings to numbers (including negative numbers)
        parsed_args: list[Any] = []
        for arg in args:
            # Check for integer (including negative)
            if arg.lstrip('-').isdigit():
                parsed_args.append(int(arg))
            else:
                # Try to parse as float
                try:
                    parsed_args.append(float(arg))
                except ValueError:
                    parsed_args.append(arg)

        return parsed_args

    def _timestamp(self) -> int:
        """Get current Unix timestamp.

        Returns:
            Current timestamp in seconds
        """
        return int(time.time())

    def _random_int(self, min_val: int = 0, max_val: int = 100) -> int:
        """Generate random integer.

        Args:
            min_val: Minimum value (default: 0)
            max_val: Maximum value (default: 100)

        Returns:
            Random integer in range [min_val, max_val)
        """
        return random.randint(min_val, max_val)

    def _guid(self) -> str:
        """Generate random GUID/UUID.

        Returns:
            Random UUID string
        """
        return str(uuid.uuid4())

    def _date(self, format_str: str = "%Y-%m-%d") -> str:
        """Get formatted date string.

        Args:
            format_str: Date format string (default: "%Y-%m-%d")

        Returns:
            Formatted date string
        """
        return datetime.now().strftime(format_str)


def replace_variables(
    text: str,
    environment_vars: dict[str, Any] | None = None,
    additional_vars: dict[str, Any] | None = None,
) -> str:
    """Replace variables in template string.

    Args:
        text: Template string with variables (e.g., "/api/users/{{userId}}")
        environment_vars: Environment variables
        additional_vars: Additional variables (higher priority)

    Returns:
        String with variables replaced

    Examples:
        >>> replace_variables("/api/users/{{userId}}", {"userId": 123})
        "/api/users/123"

        >>> replace_variables("Token: {{$timestamp()}}")
        "Token: 1707654321"
    """
    replacer = VariableReplacer()
    result, _ = replacer.replace(text, environment_vars, additional_vars)
    return result
