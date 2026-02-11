"""Test case generator service."""

from pathlib import Path
from typing import Any

import yaml
from sqlmodel import Session

from app.models.project import Interface, ProjectEnvironment
from app.models.interface_test_case import InterfaceTestCase


class TestCaseGenerator:
    """Generate test cases from interfaces."""

    def __init__(
        self,
        session: Session,
        engines_base_path: str = "engines/sisyphus_api_engine",
    ) -> None:
        """Initialize the generator.

        Args:
            session: Database session
            engines_base_path: Base path to engine files
        """
        self.session = session
        self.engines_base_path = Path(engines_base_path)
        self.cases_dir = self.engines_base_path / "cases"
        self.keywords_dir = self.engines_base_path / "keywords"

        # Ensure directories exist
        self.cases_dir.mkdir(parents=True, exist_ok=True)
        self.keywords_dir.mkdir(parents=True, exist_ok=True)

    def generate(
        self,
        interface_id: int,
        case_name: str,
        keyword_name: str,
        environment_id: int,
        scenario_id: int | None = None,
        auto_assertion: bool = True,
    ) -> dict[str, Any]:
        """Generate test case from interface.

        Args:
            interface_id: Interface ID
            case_name: Test case name
            keyword_name: Keyword function name
            environment_id: Environment ID
            scenario_id: Optional scenario ID
            auto_assertion: Whether to auto-generate assertions

        Returns:
            Dictionary with test_case, yaml_content, assertions
        """
        # Fetch interface and environment
        interface = self.session.get(Interface, interface_id)
        if not interface:
            raise ValueError(f"Interface {interface_id} not found")

        environment = self.session.get(ProjectEnvironment, environment_id)
        if not environment:
            raise ValueError(f"Environment {environment_id} not found")

        # Generate file paths
        yaml_path = f"cases/{self._sanitize_name(case_name)}.yaml"
        keyword_path = f"keywords/{self._sanitize_name(keyword_name)}.py"

        # Generate YAML content
        yaml_content = self._generate_yaml(interface, environment, case_name)

        # Generate keyword file
        keyword_content = self._generate_keyword(interface, keyword_name)

        # Generate assertions
        assertions = []
        if auto_assertion:
            assertions = self._generate_assertions()

        # Create test case record
        test_case = InterfaceTestCase(
            interface_id=interface_id,
            project_id=interface.project_id,
            name=case_name,
            keyword_name=keyword_name,
            yaml_path=yaml_path,
            scenario_id=scenario_id,
            assertions={"assertions": assertions},
        )
        self.session.add(test_case)
        self.session.commit()
        self.session.refresh(test_case)

        # Write files
        self._write_yaml_file(yaml_path, yaml_content)
        self._write_keyword_file(keyword_path, keyword_content)

        return {
            "test_case": test_case,
            "yaml_content": yaml_content,
            "assertions": assertions,
        }

    def preview(
        self,
        interface_id: int,
        environment_id: int,
        auto_assertion: bool = True,
    ) -> str:
        """Preview generated YAML without saving.

        Args:
            interface_id: Interface ID
            environment_id: Environment ID
            auto_assertion: Whether to include assertions

        Returns:
            YAML content string
        """
        interface = self.session.get(Interface, interface_id)
        if not interface:
            raise ValueError(f"Interface {interface_id} not found")

        environment = self.session.get(ProjectEnvironment, environment_id)
        if not environment:
            raise ValueError(f"Environment {environment_id} not found")

        case_name = interface.name or "test_case"
        return self._generate_yaml(interface, environment, case_name, auto_assertion)

    def _generate_yaml(
        self,
        interface: Interface,
        environment: ProjectEnvironment,
        case_name: str,
        auto_assertion: bool = True,
    ) -> str:
        """Generate YAML test case content.

        Args:
            interface: Interface model
            environment: Environment model
            case_name: Test case name
            auto_assertion: Include assertions

        Returns:
            YAML content string
        """
        # Build YAML structure
        yaml_dict: dict[str, Any] = {
            "name": case_name,
            "base_url": environment.domain,
        }

        # Add variables
        if environment.variables:
            yaml_dict["variables"] = environment.variables

        # Build request
        request_dict: dict[str, Any] = {
            "method": interface.method,
            "path": interface.url,
        }

        # Add headers with environment headers merged
        headers = dict(environment.headers or {})
        headers.update(interface.headers or {})
        if headers:
            request_dict["headers"] = headers

        # Add params
        if interface.params:
            request_dict["params"] = interface.params

        # Add body
        if interface.body and interface.body_type != "none":
            if interface.body_type == "json":
                request_dict["json"] = interface.body
            elif interface.body_type == "x-www-form-urlencoded":
                request_dict["data"] = interface.body
            else:
                request_dict["body"] = interface.body

        yaml_dict["request"] = request_dict

        # Add assertions
        if auto_assertion:
            yaml_dict["assertion"] = self._generate_assertions()

        # Convert to YAML
        return yaml.dump(yaml_dict, default_flow_style=False, allow_unicode=True)

    def _generate_keyword(self, interface: Interface, keyword_name: str) -> str:
        """Generate keyword Python file content.

        Args:
            interface: Interface model
            keyword_name: Keyword function name

        Returns:
            Python file content
        """
        # Sanitize function name
        func_name = self._sanitize_name(keyword_name)

        content = f'''"""{interface.name or 'API'} keyword."""

from sisyphus_api_engine import Keyword


class {func_name.title().replace("_", "")}(Keyword):
    """{interface.description or interface.name or 'API Keyword'}."""

    name = "{keyword_name}"

    def execute(self):
        """Execute the API request."""
        # This method is called when the keyword is executed
        # You can add custom logic here if needed
        pass
'''
        return content

    def _generate_assertions(self) -> list[dict[str, Any]]:
        """Generate default assertions.

        Returns:
            List of assertion configurations
        """
        return [
            {"type": "status_code", "expected": 200},
            {"type": "json_path", "path": "$.code", "expected": 0},
        ]

    def _write_yaml_file(self, yaml_path: str, content: str) -> None:
        """Write YAML file to disk.

        Args:
            yaml_path: Relative path to YAML file
            content: YAML content
        """
        full_path = self.engines_base_path / yaml_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding="utf-8")

    def _write_keyword_file(self, keyword_path: str, content: str) -> None:
        """Write keyword Python file to disk.

        Args:
            keyword_path: Relative path to Python file
            content: Python file content
        """
        full_path = self.engines_base_path / keyword_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding="utf-8")

    def _sanitize_name(self, name: str) -> str:
        """Sanitize name for file system.

        Args:
            name: Original name

        Returns:
            Sanitized name
        """
        # Replace invalid characters with underscores
        sanitized = name.lower()
        sanitized = "".join(c if c.isalnum() or c in ("_", "-") else "_" for c in sanitized)
        return sanitized


def generate_test_case(
    session: Session,
    interface_id: int,
    case_name: str,
    keyword_name: str,
    environment_id: int,
    scenario_id: int | None = None,
    auto_assertion: bool = True,
) -> dict[str, Any]:
    """Generate test case from interface.

    Args:
        session: Database session
        interface_id: Interface ID
        case_name: Test case name
        keyword_name: Keyword function name
        environment_id: Environment ID
        scenario_id: Optional scenario ID
        auto_assertion: Whether to auto-generate assertions

    Returns:
        Dictionary with test_case, yaml_content, assertions
    """
    generator = TestCaseGenerator(session)
    return generator.generate(
        interface_id=interface_id,
        case_name=case_name,
        keyword_name=keyword_name,
        environment_id=environment_id,
        scenario_id=scenario_id,
        auto_assertion=auto_assertion,
    )
