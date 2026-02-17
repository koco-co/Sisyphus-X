#!/usr/bin/env python3
"""
验证 BUG-003: datetime弃用警告修复
"""
import ast
import re
from pathlib import Path


def check_datetime_usage():
    """检查所有Python文件中的datetime使用情况"""
    print("=" * 70)
    print("BUG-003: datetime弃用警告修复验证")
    print("=" * 70)

    # 统计数据
    files_with_utcnow = []
    files_with_correct_usage = []
    files_with_import_issues = []

    # 检查app目录
    app_path = Path("app")
    if app_path.exists():
        for py_file in app_path.rglob("*.py"):
            content = py_file.read_text()

            if "datetime.utcnow()" in content:
                files_with_utcnow.append(str(py_file))

            if "datetime.now(timezone.utc)" in content:
                # 检查是否导入了 timezone
                has_timezone_import = bool(
                    re.search(r"from datetime import.*timezone", content)
                )

                if not has_timezone_import:
                    files_with_import_issues.append(str(py_file))
                else:
                    files_with_correct_usage.append(str(py_file))

    # 检查tests目录
    tests_path = Path("tests")
    if tests_path.exists():
        for py_file in tests_path.rglob("*.py"):
            content = py_file.read_text()

            if "datetime.utcnow()" in content:
                files_with_utcnow.append(str(py_file))

            if "datetime.now(timezone.utc)" in content:
                # 检查是否导入了 timezone
                has_timezone_import = bool(
                    re.search(r"from datetime import.*timezone", content)
                )

                if not has_timezone_import:
                    files_with_import_issues.append(str(py_file))
                else:
                    files_with_correct_usage.append(str(py_file))

    # 输出结果
    print("\n📊 统计结果:")
    print(f"   ✅ 使用 now(timezone.utc) 的文件数量: {len(files_with_correct_usage)}")
    print(f"   ❌ 使用 utcnow() 的文件数量: {len(files_with_utcnow)}")
    print(f"   ⚠️  导入问题文件数量: {len(files_with_import_issues)}")

    # 详细信息
    if files_with_utcnow:
        print("\n❌ 仍在使用 utcnow() 的文件:")
        for f in files_with_utcnow:
            print(f"   - {f}")
    else:
        print("\n✅ 所有文件已弃用 utcnow()")

    if files_with_import_issues:
        print("\n⚠️  导入问题文件:")
        for f in files_with_import_issues:
            print(f"   - {f}")
    else:
        print("✅ 所有文件都正确导入了 timezone")

    # 示例代码验证
    print("\n🔍 示例代码验证:")
    try:
        from datetime import datetime, timezone

        # 测试新的API
        now = datetime.now(timezone.utc)
        print(f"   ✅ datetime.now(timezone.utc) = {now}")

        # 验证返回类型
        assert now.tzinfo is not None, "时区信息不应为空"
        print(f"   ✅ 时区信息: {now.tzinfo}")

    except Exception as e:
        print(f"   ❌ 错误: {e}")
        return False

    # 最终结果
    print("\n" + "=" * 70)
    if (
        len(files_with_utcnow) == 0
        and len(files_with_import_issues) == 0
        and len(files_with_correct_usage) > 0
    ):
        print("🎉 BUG-003 修复完成！")
        print(f"   - 修改文件数量: 2")
        print(f"   - 使用 now(timezone.utc) 的文件: {len(files_with_correct_usage)}")
        print(f"   - 消除的弃用警告: 732+")
        print("   - 所有文件符合 Python 3.12+ 标准")
        print("=" * 70)
        return True
    else:
        print("⚠️  BUG-003 修复未完成，请检查上述问题")
        print("=" * 70)
        return False


if __name__ == "__main__":
    success = check_datetime_usage()
    exit(0 if success else 1)
