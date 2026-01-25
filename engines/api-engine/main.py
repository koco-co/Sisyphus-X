#!/usr/bin/env python3
"""
api-engine - Sisyphus X 核心 API 测试执行器

使用方法:
    python main.py run --file case.yaml [--output result.json]
    python main.py validate --file case.yaml
"""

import argparse
import sys
import json
from pathlib import Path
from executor import TestExecutor


def main():
    parser = argparse.ArgumentParser(
        description='SisyphusX API Engine - 核心测试执行器',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # run 命令
    run_parser = subparsers.add_parser('run', help='执行测试用例')
    run_parser.add_argument(
        '-f', '--file',
        required=True,
        help='YAML 测试用例文件路径'
    )
    run_parser.add_argument(
        '-o', '--output',
        default=None,
        help='JSON 结果输出路径 (默认输出到 stdout)'
    )
    run_parser.add_argument(
        '--base-url',
        default=None,
        help='覆盖 YAML 中的 base_url'
    )
    run_parser.add_argument(
        '--timeout',
        type=int,
        default=None,
        help='覆盖全局超时时间 (秒)'
    )
    run_parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='详细输出模式'
    )
    
    # validate 命令
    validate_parser = subparsers.add_parser('validate', help='验证 YAML 格式')
    validate_parser.add_argument(
        '-f', '--file',
        required=True,
        help='YAML 测试用例文件路径'
    )
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    if args.command == 'run':
        run_tests(args)
    elif args.command == 'validate':
        validate_yaml(args)


def run_tests(args):
    """执行测试用例"""
    yaml_path = Path(args.file)
    
    if not yaml_path.exists():
        print(f"错误: 文件不存在 - {yaml_path}", file=sys.stderr)
        sys.exit(1)
    
    try:
        executor = TestExecutor(
            yaml_path=yaml_path,
            base_url_override=args.base_url,
            timeout_override=args.timeout,
            verbose=args.verbose
        )
        
        result = executor.run()
        
        # 输出结果
        result_json = json.dumps(result, ensure_ascii=False, indent=2)
        
        if args.output:
            output_path = Path(args.output)
            output_path.write_text(result_json, encoding='utf-8')
            if args.verbose:
                print(f"结果已保存到: {output_path}")
        else:
            print(result_json)
        
        # 根据执行状态返回退出码
        sys.exit(0 if result['summary']['status'] == 'success' else 1)
        
    except Exception as e:
        print(f"执行错误: {e}", file=sys.stderr)
        sys.exit(2)


def validate_yaml(args):
    """验证 YAML 格式"""
    yaml_path = Path(args.file)
    
    if not yaml_path.exists():
        print(f"错误: 文件不存在 - {yaml_path}", file=sys.stderr)
        sys.exit(1)
    
    try:
        executor = TestExecutor(yaml_path=yaml_path)
        errors = executor.validate()
        
        if errors:
            print("验证失败:")
            for error in errors:
                print(f"  - {error}")
            sys.exit(1)
        else:
            print("✓ YAML 格式验证通过")
            sys.exit(0)
            
    except Exception as e:
        print(f"验证错误: {e}", file=sys.stderr)
        sys.exit(2)


if __name__ == '__main__':
    main()
