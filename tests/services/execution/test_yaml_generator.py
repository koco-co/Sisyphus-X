"""
YAML生成器单元测试
"""

import pytest
import sys
import os

# 添加 backend 目录到 Python 路径
# 从当前文件位置找到项目根目录，然后添加 backend
current_file = os.path.abspath(__file__)
# tests/services/execution/test_yaml_generator.py
# 向上3级到达项目根目录: ../../..
project_root = os.path.abspath(os.path.join(os.path.dirname(current_file), "../../.."))
backend_path = os.path.join(project_root, "backend")

if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# 现在导入
from app.services.execution.yaml_generator import YAMLGenerator
from app.services.execution import TestCaseForm


class TestYAMLGenerator:
    """YAML生成器测试类"""

    def test_generate_simple_request(self):
        """测试生成简单HTTP请求"""
        form = TestCaseForm(
            name="测试用例",
            project_id=1,
            steps=[{
                "id": "1",
                "type": "request",
                "name": "GET请求",
                "params": {
                    "url": "/api/users",
                    "method": "GET"
                },
                "validations": [
                    {"type": "eq", "path": "status_code", "value": 200}
                ]
            }]
        )

        generator = YAMLGenerator()
        yaml_content = generator.generate_from_form(form)

        # 验证生成的内容不为空
        assert yaml_content is not None
        assert len(yaml_content) > 0

        # 验证包含关键字段
        assert "name: 测试用例" in yaml_content
        assert "GET请求:" in yaml_content
        assert "url: /api/users" in yaml_content
        assert "method: GET" in yaml_content

        print("✅ 测试通过: test_generate_simple_request")
        print(f"生成的YAML:\n{yaml_content}")

    def test_generate_request_with_body(self):
        """测试生成带请求体的POST请求"""
        form = TestCaseForm(
            name="POST请求测试",
            project_id=1,
            steps=[{
                "id": "1",
                "type": "request",
                "name": "创建用户",
                "params": {
                    "url": "/api/users",
                    "method": "POST",
                    "headers": {
                        "Content-Type": "application/json"
                    },
                    "body": {
                        "username": "test",
                        "password": "123456"
                    }
                }
            }]
        )

        generator = YAMLGenerator()
        yaml_content = generator.generate_from_form(form)

        assert "POST请求测试" in yaml_content
        assert "method: POST" in yaml_content
        assert "username: test" in yaml_content

        print("✅ 测试通过: test_generate_request_with_body")

    def test_generate_database_step(self):
        """测试生成数据库操作步骤"""
        form = TestCaseForm(
            name="数据库验证",
            project_id=1,
            steps=[{
                "id": "1",
                "type": "database",
                "name": "查询用户数",
                "params": {
                    "operation_type": "query",
                    "sql": "SELECT COUNT(*) FROM users",
                    "db_type": "mysql"
                },
                "validations": [
                    {"type": "gt", "path": "rows[0][0]", "value": 0}
                ]
            }]
        )

        generator = YAMLGenerator()
        yaml_content = generator.generate_from_form(form)

        assert "数据库验证" in yaml_content
        assert "type: database" in yaml_content
        assert "SELECT COUNT(*) FROM users" in yaml_content

        print("✅ 测试通过: test_generate_database_step")

    def test_generate_wait_step(self):
        """测试生成等待步骤"""
        form = TestCaseForm(
            name="等待测试",
            project_id=1,
            steps=[{
                "id": "1",
                "type": "wait",
                "name": "等待1秒",
                "params": {
                    "wait_type": "fixed",
                    "seconds": 1
                }
            }]
        )

        generator = YAMLGenerator()
        yaml_content = generator.generate_from_form(form)

        assert "等待测试" in yaml_content
        assert "type: wait" in yaml_content
        assert "seconds: 1" in yaml_content

        print("✅ 测试通过: test_generate_wait_step")

    def test_generate_with_variables(self):
        """测试生成带变量的测试用例"""
        form = TestCaseForm(
            name="变量测试",
            project_id=1,
            variables={
                "base_url": "https://api.example.com",
                "token": "test_token_123"
            },
            steps=[]
        )

        generator = YAMLGenerator()
        yaml_content = generator.generate_from_form(form)

        assert "变量测试" in yaml_content
        assert "base_url: https://api.example.com" in yaml_content
        assert "token: test_token_123" in yaml_content

        print("✅ 测试通过: test_generate_with_variables")


if __name__ == "__main__":
    # 运行测试
    test = TestYAMLGenerator()

    print("开始运行 YAML 生成器测试...")
    print("=" * 60)

    try:
        test.test_generate_simple_request()
        test.test_generate_request_with_body()
        test.test_generate_database_step()
        test.test_generate_wait_step()
        test.test_generate_with_variables()

        print("=" * 60)
        print("🎉 所有测试通过！")

    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
