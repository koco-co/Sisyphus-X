"""CLI 入口点 - sisyphus 命令"""

import click


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
    # TODO: 实现引擎核心逻辑
    click.echo(f"执行测试用例: {case}")
    click.echo(f"输出格式: {output_format}")


if __name__ == "__main__":
    main()
