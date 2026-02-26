"""CLI 入口点 - sisyphus 命令"""

import json
import sys

import click

from apirun.core.runner import load_case, run_case


@click.command()
@click.option("--case", required=True, help="YAML 测试用例文件路径")
@click.option(
    "-O",
    "--output-format",
    "output_format",
    type=click.Choice(["text", "json", "allure", "html"]),
    default="text",
    help="输出格式: text(默认) / json / allure / html",
)
@click.option("--allure-dir", default=None, help="Allure 报告输出目录")
@click.option("--html-dir", default=None, help="HTML 报告输出目录")
@click.option("-v", "--verbose", is_flag=True, help="详细输出模式")
def main(
    case: str,
    output_format: str,
    allure_dir: str | None,
    html_dir: str | None,
    verbose: bool,
) -> None:
    """sisyphus-api-engine: YAML 驱动的接口自动化测试引擎"""
    try:
        case_model = load_case(case)
    except FileNotFoundError as e:
        click.echo(str(e), err=True)
        sys.exit(1)
    except ValueError as e:
        click.echo(str(e), err=True)
        sys.exit(1)

    try:
        result = run_case(case_model)
    except Exception as e:
        click.echo(f"执行失败: {e}", err=True)
        sys.exit(1)

    if output_format == "json":
        click.echo(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        click.echo(f"执行测试用例: {case}")
        click.echo(f"场景: {result.get('scenario_name', '')} 状态: {result.get('status', '')}")


if __name__ == "__main__":
    main()
