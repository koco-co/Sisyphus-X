"""
Sisyphus-api-engine execution adapter (embedded version).
Wraps the embedded engine for backward-compatible API usage.
"""

import os
import tempfile
from typing import Any

import yaml

from app.engine.core.models import CaseModel
from app.engine.core.runner import load_case, run_case
from app.engine.errors import EngineError


class APIEngineAdapter:
    """Embedded sisyphus-api-engine adapter."""

    def __init__(self, temp_dir: str | None = None):
        self.temp_dir = temp_dir or tempfile.gettempdir()
        os.makedirs(self.temp_dir, exist_ok=True)

    def execute_test_case(
        self,
        yaml_content: str,
        environment: str | None = None,
        verbose: bool = True,
        output_format: str = "json",
    ) -> dict[str, Any]:
        """Execute test case via embedded engine.

        Args:
            yaml_content: YAML test case content
            environment: Environment name (unused in embedded mode, kept for API compat)
            verbose: Verbose output flag
            output_format: Output format (only 'json' supported in embedded mode)

        Returns:
            Execution result dictionary
        """
        temp_yaml_file = None
        try:
            fd, temp_yaml_file = tempfile.mkstemp(suffix=".yaml", dir=self.temp_dir)
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(yaml_content)

            case = load_case(temp_yaml_file)
            result = run_case(case, verbose=verbose)
            return result.model_dump(mode="json")

        except EngineError as e:
            raise RuntimeError(f"[{e.code}] {e.message}") from e
        finally:
            if temp_yaml_file and os.path.exists(temp_yaml_file):
                try:
                    os.remove(temp_yaml_file)
                except Exception:
                    pass

    def validate_yaml(self, yaml_content: str) -> bool:
        """Validate YAML format."""
        try:
            data = yaml.safe_load(yaml_content)
            CaseModel.model_validate(data)
            return True
        except Exception:
            return False

    def get_engine_version(self) -> str | None:
        """Get embedded engine version."""
        try:
            from app.engine import __version__
            return __version__
        except Exception:
            return None


def execute_test_case(
    yaml_content: str, environment: str | None = None, verbose: bool = True
) -> dict[str, Any]:
    """Execute test case (convenience function)."""
    adapter = APIEngineAdapter()
    return adapter.execute_test_case(yaml_content, environment, verbose)
