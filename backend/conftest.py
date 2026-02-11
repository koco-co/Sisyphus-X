"""Backend test configuration."""

from __future__ import annotations

import sys
from pathlib import Path

# Add app directory to Python path
BACKEND_DIR = Path(__file__).resolve()
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
