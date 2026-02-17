#!/bin/bash
# Sisyphus-X 后端测试运行脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Sisyphus-X 后端测试运行器${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 切换到后端目录
cd "$(dirname "$0")"

# 检查 uv 是否安装
if ! command -v uv &> /dev/null; then
    echo -e "${RED}错误: uv 未安装${NC}"
    echo "请先安装 uv: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}正在安装依赖...${NC}"
    uv sync
fi

# 解析命令行参数
TEST_PATH=""
COVERAGE=false
VERBOSE=false
MARKERS=""
PARALLEL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--path)
            TEST_PATH="$2"
            shift 2
            ;;
        -c|--coverage)
            COVERAGE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -m|--marker)
            MARKERS="$2"
            shift 2
            ;;
        -j|--parallel)
            PARALLEL=true
            shift
            ;;
        -h|--help)
            echo "用法: run_tests.sh [选项]"
            echo ""
            echo "选项:"
            echo "  -p, --path PATH       指定测试路径 (默认: tests/)"
            echo "  -c, --coverage        生成覆盖率报告"
            echo "  -v, --verbose         详细输出"
            echo "  -m, --marker MARKER   只运行带标记的测试"
            echo "  -j, --parallel        并行运行测试"
            echo "  -h, --help            显示帮助信息"
            echo ""
            echo "示例:"
            echo "  run_tests.sh                           # 运行所有测试"
            echo "  run_tests.sh -p tests/models           # 运行模型测试"
            echo "  run_tests.sh -c                        # 运行测试并生成覆盖率报告"
            echo "  run_tests.sh -m unit                   # 只运行单元测试"
            echo "  run_tests.sh -p tests/api/ -c -v       # 运行 API 测试(详细+覆盖率)"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            echo "使用 -h 查看帮助信息"
            exit 1
            ;;
    esac
done

# 构建测试命令
TEST_CMD="uv run pytest"

# 添加路径
if [ -n "$TEST_PATH" ]; then
    TEST_CMD="$TEST_CMD $TEST_PATH"
else
    TEST_CMD="$TEST_CMD tests/"
fi

# 添加标记
if [ -n "$MARKERS" ]; then
    TEST_CMD="$TEST_CMD -m \"$MARKERS\""
fi

# 添加详细输出
if [ "$VERBOSE" = true ]; then
    TEST_CMD="$TEST_CMD -v"
else
    TEST_CMD="$TEST_CMD -q"
fi

# 添加覆盖率
if [ "$COVERAGE" = true ]; then
    TEST_CMD="$TEST_CMD --cov=app --cov-report=term-missing --cov-report=html"
    echo -e "${YELLOW}生成覆盖率报告...${NC}"
fi

# 并行运行
if [ "$PARALLEL" = true ]; then
    if ! uv run pytest --version | grep -q "pytest-xdist"; then
        echo -e "${YELLOW}安装 pytest-xdist...${NC}"
        uv add --dev pytest-xdist
    fi
    TEST_CMD="$TEST_CMD -n auto"
    echo -e "${YELLOW}并行运行测试...${NC}"
fi

# 运行测试
echo -e "${GREEN}运行命令:${NC} $TEST_CMD"
echo ""

if eval $TEST_CMD; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  测试通过! ✓${NC}"
    echo -e "${GREEN}========================================${NC}"

    if [ "$COVERAGE" = true ]; then
        echo ""
        echo -e "${GREEN}覆盖率报告已生成:${NC}"
        echo -e "  终端: 查看上方输出"
        echo -e "  HTML: file://$(pwd)/htmlcov/index.html"
        echo ""

        # 自动打开浏览器 (macOS)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            read -p "是否在浏览器中打开覆盖率报告? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                open htmlcov/index.html
            fi
        fi
    fi
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  测试失败! ✗${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
