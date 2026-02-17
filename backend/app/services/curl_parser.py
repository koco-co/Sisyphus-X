"""cURL command parser service."""

import json
import re
import shlex
from typing import Any, Optional


class CurlParser:
    """Parse cURL commands into structured request data."""

    def __init__(self) -> None:
        """Initialize the parser."""
        self.method: str = "GET"
        self.url: str = ""
        self.headers: dict[str, str] = {}
        self.params: dict[str, str] = {}
        self.body: dict[str, Any] | Optional[str] = None
        self.body_type: str = "none"
        self.auth: dict[str, Any] = {"type": "none"}

    def parse(self, curl_command: str) -> dict[str, Any]:
        """Parse cURL command.

        Args:
            curl_command: cURL command string

        Returns:
            Parsed request data dictionary

        Raises:
            ValueError: If cURL command is invalid
        """
        # Clean up the command
        cleaned_command = self._clean_command(curl_command)

        try:
            # Split the command into tokens
            tokens = shlex.split(cleaned_command)
        except ValueError as e:
            raise ValueError(f"Invalid cURL command: {e}") from e

        if not tokens or not tokens[0].lower() == "curl":
            raise ValueError("Command must start with 'curl'")

        # Parse tokens
        i = 1
        while i < len(tokens):
            token = tokens[i]

            if token.lower().startswith("-x") or token.lower() == "--request":
                # Method
                if token.lower() in ("-x", "--request"):
                    i += 1
                    if i >= len(tokens):
                        raise ValueError("Missing value for -X/--request")
                    self.method = tokens[i].upper()
                else:
                    self.method = token[2:].upper()

            elif token.lower().startswith("-h") or token.lower() == "--header":
                # Header
                if token.lower() in ("-h", "--header"):
                    i += 1
                    if i >= len(tokens):
                        raise ValueError("Missing value for -H/--header")
                    header_value = tokens[i]
                else:
                    header_value = token[2:]

                if ":" in header_value:
                    key, value = header_value.split(":", 1)
                    self.headers[key.strip()] = value.strip()

            elif token.lower().startswith("-d") or token.lower() in ("--data", "--data-raw", "--data-urlencode", "--data-binary"):
                # Body data
                if token.lower() in ("-d", "--data", "--data-raw", "--data-urlencode", "--data-binary"):
                    i += 1
                    if i >= len(tokens):
                        raise ValueError("Missing value for data option")
                    data_value = tokens[i]
                else:
                    data_value = token[2:]

                self._parse_body(data_value)

            elif token.lower().startswith("-u") or token.lower() == "--user":
                # Basic auth
                if token.lower() in ("-u", "--user"):
                    i += 1
                    if i >= len(tokens):
                        raise ValueError("Missing value for -u/--user")
                    auth_value = tokens[i]
                else:
                    auth_value = token[2:]

                if ":" in auth_value:
                    username, password = auth_value.split(":", 1)
                    self.auth = {
                        "type": "basic",
                        "username": username,
                        "password": password,
                    }

            elif token.lower().startswith("-G") or token.lower() == "--get":
                # Force GET with params
                self.method = "GET"

            elif token.lower().startswith("-"):
                # Skip other options
                if token.lower() in ("-f", "--fail"):
                    i += 1
                elif token.lower() in ("-k", "--insecure"):
                    pass
                elif token.lower() in ("-L", "--location"):
                    pass
                elif token.lower() in ("-s", "--silent"):
                    pass
                elif token.lower() in ("-v", "--verbose"):
                    pass
                elif token.lower() == "--compressed":
                    pass
                else:
                    # Options with values
                    if token[1] != "-":
                        i += 1
            elif not self.url:
                # First non-option token is the URL
                self.url = token
                # Extract params from URL
                self._extract_params_from_url()

            i += 1

        # Detect auth from headers
        self._detect_auth_from_headers()

        return self._build_result()

    def _clean_command(self, command: str) -> str:
        """Clean up the cURL command.

        Args:
            command: Raw cURL command

        Returns:
            Cleaned command string
        """
        # Remove line continuation backslashes
        cleaned = re.sub(r"\\\s*\n", " ", command)
        # Remove extra whitespace
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    def _parse_body(self, data: str) -> None:
        """Parse request body.

        Args:
            data: Body data string
        """
        self.body_type = "raw"

        # Try to parse as JSON
        if data.startswith("{") or data.startswith("["):
            try:
                self.body = json.loads(data)
                self.body_type = "json"
                return
            except json.JSONDecodeError:
                pass

        # Try to parse as form data
        if "=" in data and "&" in data:
            self.body = {}
            for pair in data.split("&"):
                if "=" in pair:
                    key, value = pair.split("=", 1)
                    self.body[key] = value
            self.body_type = "x-www-form-urlencoded"
            return

        # Raw data
        self.body = data

    def _extract_params_from_url(self) -> None:
        """Extract query parameters from URL."""
        if "?" in self.url:
            url_base, query_string = self.url.split("?", 1)
            self.url = url_base

            for param in query_string.split("&"):
                if "=" in param:
                    key, value = param.split("=", 1)
                    self.params[key] = value

    def _detect_auth_from_headers(self) -> None:
        """Detect authentication type from headers.

        Checks for Bearer token and API key in headers.
        """
        auth_header = self.headers.get("Authorization", "")
        if auth_header:
            if auth_header.lower().startswith("bearer "):
                self.auth = {
                    "type": "bearer",
                    "token": auth_header[7:].strip(),
                }

        # Check for API key in headers
        for key, value in self.headers.items():
            if key.lower() in ("x-api-key", "x-apikey", "api-key"):
                self.auth = {
                    "type": "api_key",
                    "key": key,
                    "value": value,
                    "add_to": "header",
                }

    def _build_result(self) -> dict[str, Any]:
        """Build the result dictionary.

        Returns:
            Parsed request data
        """
        return {
            "method": self.method,
            "url": self.url,
            "headers": self.headers,
            "params": self.params,
            "body": self.body if self.body_type != "none" else {},
            "body_type": self.body_type,
            "auth": self.auth,
        }


def parse_curl_command(curl_command: str) -> dict[str, Any]:
    """Parse a cURL command into structured request data.

    Args:
        curl_command: cURL command string

    Returns:
        Dictionary with keys: method, url, headers, params, body, body_type, auth

    Raises:
        ValueError: If cURL command is invalid
    """
    parser = CurlParser()
    return parser.parse(curl_command)
