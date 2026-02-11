from __future__ import annotations

from app.core.config import Settings


def test_settings_can_load_required_database_url(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

    settings = Settings()

    assert settings.DATABASE_URL == "sqlite+aiosqlite:///./test.db"
    assert settings.API_V1_STR == "/api/v1"
