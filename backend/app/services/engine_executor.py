"""Engine executor service - Execute sisyphus-api-engine and parse results."""

import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Optional


class EngineExecutor:
    """Execute sisyphus-api-engine CLI and parse results."""

    # Default engine command
    ENGINE_CMD = "sisyphus-api-engine"

    def __init__(self, base_temp_dir: str = "/tmp/sisyphus_debug") -> None:
        """Initialize executor.

        Args:
            base_temp_dir: Base directory for temporary files
        """
        self.base_temp_dir = Path(base_temp_dir)
        self.base_temp_dir.mkdir(parents=True, exist_ok=True)

    def execute(
        self,
        yaml_content: str,
        base_url: Optional[str] = None,
        timeout: int = 300,
    ) -> dict[str, Any]:
        """Execute YAML test case using sisyphus-api-engine.

        Args:
            yaml_content: YAML test case content
            base_url: Optional base URL override
            timeout: Execution timeout in seconds (default: 300)

        Returns:
            Dictionary with success, result, and error

        Raises:
            FileNotFoundError: If sisyphus-api-engine is not installed
            TimeoutError: If execution times out
        """
        # Create temporary YAML file
        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".yaml",
            delete=False,
            dir=self.base_temp_dir,
            encoding="utf-8",
        ) as f:
            f.write(yaml_content)
            yaml_path = f.name

        try:
            # Build command
            cmd = [self.ENGINE_CMD, "run", "-f", yaml_path]

            if base_url:
                cmd.extend(["--base-url", base_url])

            # Execute
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
            )

            # Parse output
            if result.stdout:
                try:
                    output = json.loads(result.stdout)
                    success = output.get("summary", {}).get("status") == "success"
                    return {
                        "success": success,
                        "result": output,
                        "error": None,
                    }
                except json.JSONDecodeError:
                    return {
                        "success": False,
                        "result": {},
                        "error": f"输出解析失败: {result.stdout[:500]}",
                    }
            else:
                return {
                    "success": False,
                    "result": {},
                    "error": result.stderr or "执行无输出",
                }

        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "result": {},
                "error": f"执行超时 (>{timeout}秒)",
            }
        except FileNotFoundError:
            return {
                "success": False,
                "result": {},
                "error": "sisyphus-api-engine 未安装，请先安装: pip install sisyphus-api-engine",
            }
        except Exception as e:
            return {
                "success": False,
                "result": {},
                "error": str(e),
            }
        finally:
            # Clean up temporary file
            try:
                os.unlink(yaml_path)
            except Exception:
                pass

    def validate(self, yaml_content: str) -> dict[str, Any]:
        """Validate YAML format using sisyphus-api-engine.

        Args:
            yaml_content: YAML content to validate

        Returns:
            Dictionary with valid flag and message
        """
        # Create temporary YAML file
        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".yaml",
            delete=False,
            dir=self.base_temp_dir,
            encoding="utf-8",
        ) as f:
            f.write(yaml_content)
            yaml_path = f.name

        try:
            cmd = [self.ENGINE_CMD, "validate", "-f", yaml_path]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

            return {
                "valid": result.returncode == 0,
                "message": result.stdout.strip()
                if result.returncode == 0
                else result.stderr.strip(),
            }

        except FileNotFoundError:
            return {
                "valid": False,
                "message": "sisyphus-api-engine 未安装",
            }
        except subprocess.TimeoutExpired:
            return {"valid": False, "message": "验证超时"}
        except Exception as e:
            return {"valid": False, "message": str(e)}
        finally:
            # Clean up
            try:
                os.unlink(yaml_path)
            except Exception:
                pass

    def cleanup_temp_files(self, max_age_minutes: int = 5) -> int:
        """Clean up old temporary files.

        Args:
            max_age_minutes: Delete files older than this (default: 5 minutes)

        Returns:
            Number of files deleted
        """
        import time

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
    base_url: Optional[str] = None,
    timeout: int = 300,
) -> dict[str, Any]:
    """Execute YAML using sisyphus-api-engine (convenience function).

    Args:
        yaml_content: YAML test case content
        base_url: Optional base URL override
        timeout: Execution timeout in seconds

    Returns:
        Dictionary with success, result, and error
    """
    executor = EngineExecutor()
    return executor.execute(yaml_content, base_url, timeout)


def validate_yaml(yaml_content: str) -> dict[str, Any]:
    """Validate YAML format (convenience function).

    Args:
        yaml_content: YAML content to validate

    Returns:
        Dictionary with valid flag and message
    """
    executor = EngineExecutor()
    return executor.validate(yaml_content)
