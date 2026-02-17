"""API 测试配置文件"""
import pytest


def pytest_configure(config):
    """Pytest 配置钩子"""
    config.addinivalue_line("markers", "asyncio: 标记异步测试")
    config.addinivalue_line("markers", "unit: 单元测试")
    config.addinivalue_line("markers", "integration: 集成测试")
    config.addinivalue_line("markers", "api: API 测试")
    config.addinivalue_line("markers", "slow: 慢速测试")


@pytest.fixture(scope="session")
def test_config():
    """测试配置 fixture"""
    return {
        "base_url": "http://test",
        "timeout": 5,
        "test_user": {
            "email": "test@example.com",
            "password": "password123",
            "username": "testuser",
        },
    }
