"""开发工具集 - 使用Rich美化输出"""
from rich.console import Console
from rich.table import Table
from rich.progress import track
import sys

console = Console()


def show_env_info():
    """显示环境信息"""
    table = Table(title="🚀 SisyphusX 环境信息")
    table.add_column("项目", style="cyan")
    table.add_column("值", style="green")

    table.add_row("Python版本", sys.version.split()[0])
    table.add_row("包管理器", "uv")
    table.add_row("数据库", "SQLite/PostgreSQL")
    table.add_row("AI框架", "LangChain + LangGraph")

    console.print(table)


if __name__ == "__main__":
    show_env_info()
