"""Engine executor service - Execute test cases via embedded sisyphus-api-engine."""

import os
import tempfile
import time
from pathlib import Path
from typing import Any

import yaml

from app.engine.core.models import CaseModel
from app.engine.core.runner import load_case, run_case
from app.engine.errors import EngineError


class EngineExecutor:
    """Execute test cases using the embedded sisyphus-api-engine."""

    def __init__(self, base_temp_dir: str = "/tmp/sisyphus_debug") -> None:
        self.base_temp_dir = Path(base_temp_dir)
        self.base_temp_dir.mkdir(parents=True, exist_ok=True)

    def execute(
        self,
        yaml_content: str,
        base_url: str | None = None,
        timeout: int = 300,
    ) -> dict[str, Any]:
        """Execute YAML test case using the embedded engine.

        Args:
            yaml_content: YAML test case content
            base_url: Optional base URL override
            timeout: Execution timeout in seconds (default: 300)

        Returns:
            Dictionary with success, result, and error
        """
        yaml_path = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                suffix=".yaml",
                delete=False,
                dir=self.base_temp_dir,
                encoding="utf-8",
            ) as f:
                f.write(yaml_content)
                yaml_path = f.name

            case = load_case(yaml_path)

            if base_url and case.config:
                if case.config.environment:
                    case.config.environment.base_url = base_url
                else:
                    case.config.base_url = base_url

            result = run_case(case, verbose=False)
            output = result.model_dump(mode="json")
            success = output.get("status") == "passed"

            return {
                "success": success,
                "result": output,
                "error": None,
            }

        except EngineError as e:
            return {
                "success": False,
                "result": {},
                "error": f"[{e.code}] {e.message}",
            }
        except Exception as e:
            return {
                "success": False,
                "result": {},
                "error": str(e),
            }
        finally:
            if yaml_path:
                try:
                    os.unlink(yaml_path)
                except Exception:
                    pass

    def execute_from_dict(
        self,
        case_dict: dict[str, Any],
        publisher: Any = None,
    ) -> dict[str, Any]:
        """Execute a test case from a dictionary (no YAML file needed).

        Args:
            case_dict: Case definition as a dict (matching CaseModel schema)
            publisher: Optional WebSocket publisher for real-time events

        Returns:
            Dictionary with success, result, and error
        """
        try:
            case = CaseModel.model_validate(case_dict)
            result = run_case(case, verbose=False, publisher=publisher)
            output = result.model_dump(mode="json")
            success = output.get("status") == "passed"

            return {
                "success": success,
                "result": output,
                "error": None,
            }
        except EngineError as e:
            return {
                "success": False,
                "result": {},
                "error": f"[{e.code}] {e.message}",
            }
        except Exception as e:
            return {
                "success": False,
                "result": {},
                "error": str(e),
            }

    def validate(self, yaml_content: str) -> dict[str, Any]:
        """Validate YAML format by attempting to parse it as a CaseModel.

        Args:
            yaml_content: YAML content to validate

        Returns:
            Dictionary with valid flag and message
        """
        try:
            data = yaml.safe_load(yaml_content)
            CaseModel.model_validate(data)
            return {"valid": True, "message": "YAML 格式正确"}
        except Exception as e:
            return {"valid": False, "message": str(e)}

    def cleanup_temp_files(self, max_age_minutes: int = 5) -> int:
        """Clean up old temporary files."""
        now = time.time()
        cutoff = now - (max_age_minutes * 60)
        deleted_count = 0
        for file_path in self.base_temp_dir.glob("*.yaml"):
            try:
                if file_path.stat().st_mtime < cutoff:
                    file_path.unlink()
                    deleted_count += 1
            except Exception:
                pass
        return deleted_count


def execute_yaml(
    yaml_content: str,
    base_url: str | None = None,
    timeout: int = 300,
) -> dict[str, Any]:
    """Execute YAML using embedded engine (convenience function)."""
    executor = EngineExecutor()
    return executor.execute(yaml_content, base_url, timeout)


def validate_yaml(yaml_content: str) -> dict[str, Any]:
    """Validate YAML format (convenience function)."""
    executor = EngineExecutor()
    return executor.validate(yaml_content)
