"""
白盒测试套件说明文档

本目录包含 Sisyphus-X 项目的白盒测试（单元测试和集成测试）
"""

# 测试框架

- **测试框架**: pytest 7.4+
- **异步支持**: pytest-asyncio
- **覆盖率工具**: pytest-cov
- **并行执行**: pytest-xdist

# 目录结构

```
test_white/
├── conftest.py              # pytest 配置和全局 fixture
├── pytest.ini              # pytest 配置文件
├── utils/                  # 测试工具包
│   ├── __init__.py
│   └── test_base.py        # 测试基类
├── unit/                   # 单元测试
│   ├── test_auth.py        # 认证模块测试
│   ├── test_projects.py    # 项目管理测试
│   └── ...
└── integration/            # 集成测试
    └── ...
```

# 运行测试

## 运行所有测试

```bash
cd test_white
pytest -v
```

## 运行单元测试

```bash
pytest -v -m unit
```

## 运行集成测试

```bash
pytest -v -m integration
```

## 运行特定测试文件

```bash
pytest -v unit/test_auth.py
```

## 运行特定测试类或函数

```bash
pytest -v unit/test_auth.py::TestAuthAPI::test_register_success
```

## 生成覆盖率报告

```bash
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

# 编写测试

## 单元测试示例

```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

@pytest.mark.unit
class TestUserModel:
    """用户模型测试"""

    async def test_create_user(self, db_session: AsyncSession):
        """测试创建用户"""
        from app.models.user import User

        user = User(
            email="test@example.com",
            hashed_password="hashed",
        )
        db_session.add(user)
        await db_session.commit()

        assert user.id is not None
```

## API 测试示例

```python
@pytest.mark.api
class TestAuthAPI:
    """认证 API 测试"""

    async def test_register_success(self, async_client: AsyncClient):
        """测试注册成功"""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
            },
        )

        assert response.status_code == 201
```

# 使用测试基类

```python
from utils import APITestCase

class TestProjectAPI(APITestCase):
    """项目 API 测试"""

    async def test_crud_workflow(self, async_client: AsyncClient):
        """测试完整 CRUD 流程"""
        await self.assert_crud_workflow(
            client=async_client,
            list_endpoint="/api/v1/projects",
            create_endpoint="/api/v1/projects",
            create_data={"name": "Test"},
            update_data={"name": "Updated"},
        )
```

# Fixture 说明

## db_session

创建内存数据库会话，每个测试函数独立：

```python
async def test_something(db_session: AsyncSession):
    # 数据库操作
    pass
```

## async_client

创建未认证的 HTTP 客户端：

```python
async def test_public_api(async_client: AsyncClient):
    response = await async_client.get("/api/v1/public")
    assert response.status_code == 200
```

## authenticated_async_client

创建已认证的 HTTP 客户端：

```python
async def test_protected_api(authenticated_async_client: AsyncClient):
    response = await authenticated_async_client.get("/api/v1/users/me")
    assert response.status_code == 200
```

# 测试标记

- `unit`: 单元测试（测试单个函数或类）
- `integration`: 集成测试（测试多个模块协作）
- `api`: API 测试（测试 HTTP 端点）
- `slow`: 慢速测试（运行时间 > 1s）

# 覆盖率目标

- **最低覆盖率**: 80%
- **核心模块（认证、项目、场景）**: 90%+
- **工具函数**: 95%+

# 最佳实践

1. **测试隔离**: 每个测试应该独立，不依赖其他测试
2. **使用 Fixture**: 优先使用 fixture 而不是手动创建数据
3. **清晰命名**: 测试函数名应该清晰描述测试内容
4. **一个断言**: 每个测试只验证一个功能点
5. **测试边界**: 不仅测试正常路径，也要测试异常情况
6. **Mock 外部依赖**: 对于外部服务（如 OAuth），使用 mock
