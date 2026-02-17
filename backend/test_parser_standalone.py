"""独立的 Google docstring 解析器测试（不依赖 FastAPI）"""
import re
import ast


class GoogleDocstringParser:
    """Google 风格 docstring 解析器"""

    # 正则表达式模式
    CLASS_PATTERN = r"^class\s+(\w+)\s*[:\(]"
    METHOD_PATTERN = r"^\s*def\s+(\w+)\s*\((.*?)\)\s*->"
    PARAM_PATTERN = r":param\s+(\w+):\s*(.*)"
    TYPE_PATTERN = r":type\s+(\w+):\s*(.*)"
    RETURN_PATTERN = r":return:\s*(.*)"
    RTYPE_PATTERN = r":rtype:\s*(.*)"

    @staticmethod
    def parse_code(code: str):
        """解析 Python 代码，提取类名、方法名和 docstring"""
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            raise ValueError(f"代码语法错误: {e}")

        class_name = None
        method_name = None
        docstring = None

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                class_name = node.name
                if ast.get_docstring(node):
                    docstring = ast.get_docstring(node)

                for item in node.body:
                    if isinstance(item, ast.FunctionDef):
                        method_name = item.name
                        if ast.get_docstring(item):
                            docstring = ast.get_docstring(item)
                        break
                break

        if not class_name:
            raise ValueError("未找到类定义")
        if not method_name:
            raise ValueError("未找到方法定义")

        parsed = GoogleDocstringParser.parse_docstring(docstring or "")

        return {
            "class_name": class_name,
            "method_name": method_name,
            "description": parsed.get("description"),
            "parameters": parsed.get("parameters", []),
            "return_value": parsed.get("return_value"),
        }

    @staticmethod
    def parse_docstring(docstring: str):
        """解析 Google 风格 docstring"""
        result = {
            "description": None,
            "parameters": [],
            "return_value": None,
        }

        lines = docstring.split("\n")
        description_lines = []
        current_param = None

        i = 0
        while i < len(lines):
            line = lines[i].strip()

            param_match = re.match(GoogleDocstringParser.PARAM_PATTERN, line)
            if param_match:
                if current_param:
                    result["parameters"].append(current_param)
                current_param = {
                    "name": param_match.group(1),
                    "description": param_match.group(2),
                    "type": None,
                    "required": True,
                    "default": None,
                }
                i += 1
                continue

            type_match = re.match(GoogleDocstringParser.TYPE_PATTERN, line)
            if type_match and current_param:
                current_param["type"] = type_match.group(2)
                i += 1
                continue

            return_match = re.match(GoogleDocstringParser.RETURN_PATTERN, line)
            if return_match:
                result["return_value"] = {
                    "type": None,
                    "description": return_match.group(1),
                }
                i += 1
                continue

            rtype_match = re.match(GoogleDocstringParser.RTYPE_PATTERN, line)
            if rtype_match and result["return_value"]:
                result["return_value"]["type"] = rtype_match.group(1)
                i += 1
                continue

            if not line.startswith(":") and line:
                if not result["description"]:
                    description_lines.append(line)
                elif current_param:
                    current_param["description"] += " " + line

            i += 1

        if current_param:
            result["parameters"].append(current_param)

        if description_lines:
            result["description"] = " ".join(description_lines).strip()

        return result


# 测试代码
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
"""


def main():
    print("=" * 80)
    print("测试 Google docstring 解析器")
    print("=" * 80)

    try:
        result = GoogleDocstringParser.parse_code(TEST_CODE)
        print(f"\n✅ 解析成功！\n")
        print(f"类名: {result['class_name']}")
        print(f"方法名: {result['method_name']}")
        print(f"描述: {result['description']}")
        print(f"\n参数:")
        for param in result['parameters']:
            print(f"  - {param['name']}: {param['type']} - {param['description']}")
        print(f"\n返回值:")
        if result['return_value']:
            print(f"  类型: {result['return_value']['type']}")
            print(f"  描述: {result['return_value']['description']}")
        print("\n" + "=" * 80)
        print("✅ 测试通过")
        print("=" * 80)
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
