# Sisyphus-X 后端测试文档

## 测试结构

```
tests/
├── conftest.py              # 全局测试配置和 fixtures
├── conftest_e2e.py          # API 测试配置
├── models/                  # 模型层单元测试
│   ├── __init__.py
│   ├── test_user.py         # 用户模型测试
│   ├── test_project.py      # 项目模型测试
│   ├── test_keyword.py      # 关键字模型测试
│   └── test_scenario.py     # 场景模型测试
├── api/                     # API 层测试
│   ├── __init__.py
│   ├── test_auth.py         # 认证 API 测试
│   └── test_projects.py     # 项目 API 测试
└── services/                # 服务层测试
    └── test_engine_executor.py
```

## 运行测试

### 运行所有测试
```bash
cd backend
uv run pytest tests/ -v
```

### 运行特定测试文件
```bash
# 运行模型测试
uv run pytest tests/models/ -v

# 运行 API 测试
uv run pytest tests/api/ -v
```

### 运行特定测试类或方法
```bash
# 运行特定测试类
uv run pytest tests/models/test_user.py::TestUserModel -v

# 运行特定测试方法
uv run pytest tests/models/test_user.py::TestUserModel::test_create_user_with_password -v
```

### 运行带标记的测试
```bash
# 只运行单元测试
uv run pytest tests/ -m unit -v

# 只运行 API 测试
uv run pytest tests/ -m api -v

# 排除慢速测试
uv run pytest tests/ -m "not slow" -v
```

### 生成覆盖率报告
```bash
# 生成终端覆盖率报告
uv run pytest tests/ --cov=app --cov-report=term-missing

# 生成 HTML 覆盖率报告
uv run pytest tests/ --cov=app --cov-report=html

# 查看报告
open htmlcov/index.html
```

### 并行运行测试 (安装 pytest-xdist 后)
```bash
# 使用 4 个进程并行运行
uv run pytest tests/ -n 4

# 在每个 CPU 核心上运行一个测试进程
uv run pytest tests/ -n auto
```

### 只运行失败的测试
```bash
# 第一次运行
uv run pytest tests/ --lf

# 修复后重新运行
uv run pytest tests/ --ff
```

## 测试覆盖率目标

- **最低覆盖率**: 80%
- **推荐覆盖率**: 90%+

### 查看当前覆盖率
```bash
uv run pytest tests/ --cov=app --cov-report=term-missing --cov-report=html
```

## 编写测试指南

### 测试命名规范

1. **文件命名**: `test_<module_name>.py`
2. **类命名**: `Test<ClassName>`
3. **方法命名**: `test_<specific_behavior>`

### 测试结构

```python
"""模块描述

测试目的和范围
"""
import pytest
from sqlalchemy import select

from app.models import YourModel


@pytest.mark.asyncio
class TestYourModel:
    """测试类描述"""

    async def test_create_model(self, db_session):
        """测试创建模型"""
        # Arrange (准备)
        data = {"name": "test"}

        # Act (执行)
        model = YourModel(**data)
        db_session.add(model)
        await db_session.commit()

        # Assert (断言)
        assert model.id is not None
        assert model.name == "test"
```

### Fixtures 使用

### 使用内置 fixtures

```python
async def test_with_db(db_session):
    """使用数据库会话"""
    user = User(email="test@example.com")
    db_session.add(user)
    await db_session.commit()

async def test_with_client(async_client):
    """使用 HTTP 客户端"""
    response = await async_client.post("/api/v1/auth/register", json={...})
    assert response.status_code == 200

async def test_with_sample_data(sample_project):
    """使用示例数据"""
    assert sample_project.key == "TEST_PROJECT"
```

### Mock 外部依赖

```python
from unittest.mock import AsyncMock, patch

async def test_with_mock(async_client):
    """测试 Mock 外部服务"""
    with patch("app.services.external_api.call", AsyncMock(return_value={"status": "ok"})):
        response = await async_client.get("/api/v1/external")
        assert response.status_code == 200
```

## 常见断言

### 状态码断言
```python
assert response.status_code == 200
assert response.status_code == 400
assert response.status_code == 401
assert response.status_code == 404
```

### 数据断言
```python
assert "token" in data
assert data["user"]["email"] == "test@example.com"
assert len(data["items"]) == 10
```

### 数据库断言
```python
result = await db_session.execute(select(User).where(User.email == "test@example.com"))
user = result.scalar_one_or_none()
assert user is not None
assert user.is_active is True
```

## 最佳实践

1. **遵循 AAA 模式**: Arrange (准备) → Act (执行) → Assert (断言)
2. **一个测试只测试一件事**: 每个测试方法应该专注于一个特定行为
3. **使用描述性名称**: 测试名称应该清楚描述测试内容
4. **保持测试独立**: 测试之间不应该有依赖关系
5. **使用 fixtures 复用代码**: 避免重复的测试准备代码
6. **Mock 外部依赖**: 不要依赖外部服务(数据库、API 等)
7. **测试边界条件**: 测试正常情况和异常情况
8. **保持测试快速**: 避免慢速操作(文件 I/O、网络请求等)

## 故障排查

### 测试超时
```bash
# 增加超时时间
uv run pytest tests/ --timeout=10
```

### 数据库连接错误
```bash
# 检查数据库是否运行
docker-compose ps

# 重启数据库
docker-compose restart db
```

### 导入错误
```bash
# 确保 Python 路径正确
export PYTHONPATH=/Users/poco/Documents/Projects/Sisyphus-X/backend:$PYTHONPATH

# 或使用 -m pytest
cd backend && python -m pytest tests/
```

### 异步测试失败
```bash
# 确保安装了 pytest-asyncio
uv add --dev pytest-asyncio

# 检查 conftest.py 中的 asyncio_mode 配置
# 应该设置为 "auto"
```

## 持续集成

### GitHub Actions 示例

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: |
          cd backend
          pip install uv
          uv sync
      - name: Run tests
        run: |
          cd backend
          uv run pytest tests/ --cov=app --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml
```

## 资源链接

- [Pytest 文档](https://docs.pytest.org/)
- [SQLAlchemy 2.0 文档](https://docs.sqlalchemy.org/en/20/)
- [FastAPI 测试文档](https://fastapi.tiangolo.com/tutorial/testing/)
- [Pydantic 文档](https://docs.pydantic.dev/)
