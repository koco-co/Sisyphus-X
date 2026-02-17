"""测试 Google docstring 解析器"""
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.api.v1.endpoints.global_params import GoogleDocstringParser


# 测试代码示例
TEST_CODE = """
class StringUtils:
    \"\"\"字符串工具类\"\"\"

    @staticmethod
    def generate_random_string(length: int) -> str:
        \"\"\"生成随机字符串

        :param length: 生成字符串的长度
        :type length: int
        :return: 随机字符串
        :rtype: str
        \"\"\"
        import random
        import string

        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


class DateTimeUtils:
    \"\"\"日期时间工具类\"\"\"

    @staticmethod
    def format_timestamp(timestamp: int, format: str = "%Y-%m-%d %H:%M:%S") -> str:
        \"\"\"格式化时间戳

        Args:
            timestamp: Unix 时间戳（秒）
            format: 目标格式，默认为 "%Y-%m-%d %H:%M:%S"

        Returns:
            格式化后的日期时间字符串

        Examples:
            >>> format_timestamp(1672531200)
            '2023-01-01 00:00:00'
        \"\"\"
        from datetime import datetime

        return datetime.fromtimestamp(timestamp).strftime(format)
"""


def test_parse_code():
    """测试代码解析"""
    print("=" * 80)
    print("测试 1: 解析 StringUtils.generate_random_string")
    print("=" * 80)

    code1 = TEST_CODE[TEST_CODE.find("class StringUtils"):TEST_CODE.find("class DateTimeUtils")].strip()

    try:
        result = GoogleDocstringParser.parse_code(code1)
        print(f"✅ 类名: {result['class_name']}")
        print(f"✅ 方法名: {result['method_name']}")
        print(f"✅ 描述: {result['description']}")
        print(f"✅ 参数: {result['parameters']}")
        print(f"✅ 返回值: {result['return_value']}")
    except Exception as e:
        print(f"❌ 解析失败: {e}")

    print("\n" + "=" * 80)
    print("测试 2: 解析 DateTimeUtils.format_timestamp")
    print("=" * 80)

    code2 = TEST_CODE[TEST_CODE.find("class DateTimeUtils"):].strip()

    try:
        result = GoogleDocstringParser.parse_code(code2)
        print(f"✅ 类名: {result['class_name']}")
        print(f"✅ 方法名: {result['method_name']}")
        print(f"✅ 描述: {result['description']}")
        print(f"✅ 参数: {result['parameters']}")
        print(f"✅ 返回值: {result['return_value']}")
    except Exception as e:
        print(f"❌ 解析失败: {e}")


def test_parse_docstring():
    """测试 docstring 解析"""
    print("\n" + "=" * 80)
    print("测试 3: 解析 docstring")
    print("=" * 80)

    docstring = """生成随机字符串

    :param length: 生成字符串的长度
    :type length: int
    :return: 随机字符串
    :rtype: str
    """

    try:
        result = GoogleDocstringParser.parse_docstring(docstring)
        print(f"✅ 描述: {result['description']}")
        print(f"✅ 参数: {result['parameters']}")
        print(f"✅ 返回值: {result['return_value']}")
    except Exception as e:
        print(f"❌ 解析失败: {e}")


def test_invalid_code():
    """测试无效代码"""
    print("\n" + "=" * 80)
    print("测试 4: 无效代码")
    print("=" * 80)

    invalid_code = "def foo():\n    return bar"  # 缺少类定义

    try:
        result = GoogleDocstringParser.parse_code(invalid_code)
        print(f"❌ 应该抛出异常，但返回了: {result}")
    except ValueError as e:
        print(f"✅ 正确抛出异常: {e}")
    except Exception as e:
        print(f"❌ 抛出了意外的异常: {e}")


if __name__ == "__main__":
    test_parse_code()
    test_parse_docstring()
    test_invalid_code()
    print("\n" + "=" * 80)
    print("✅ 所有测试完成")
    print("=" * 80)
