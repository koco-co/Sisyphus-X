#!/bin/bash
# Sisyphus-X 一键启动脚本
# 版本: v1.1.0
# 更新时间: 2026-02-17
# 改进: 增强错误处理和环境检查

set -e  # 遇到错误立即退出
set -u  # 使用未定义变量时报错
set -o pipefail  # 管道命令失败时退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 错误处理函数
error_handler() {
    local line_number=$1
    local error_code=$2
    log_error "脚本在第 $line_number 行出错 (退出码: $error_code)"
    log_error "请查看日志文件获取详细信息:"
    log_error "  - logs/init.log"
    log_error "  - logs/backend.log"
    log_error "  - logs/frontend.log"
    log_error ""
    log_error "常见问题排查:"
    log_error "1. 确保所有依赖已安装 (Docker, Node.js, Python, uv)"
    log_error "2. 确保端口 8000 和 5173 未被占用"
    log_error "3. 检查 backend/.env 配置是否正确"
    log_error "4. 查看日志文件获取详细错误信息"
    exit $error_code
}

# 设置错误陷阱
trap 'error_handler ${LINENO} $?' ERR

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."

    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装,请先安装 Docker"
        exit 1
    fi

    # 检查 Docker Compose (支持 docker-compose 和 docker compose 两种命令)
    if ! docker compose version &> /dev/null && ! docker-compose --version &> /dev/null; then
        log_error "Docker Compose 未安装,请先安装 Docker Compose"
        exit 1
    fi

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装,请先安装 Node.js 18+"
        exit 1
    fi

    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 未安装,请先安装 Python 3.12+"
        exit 1
    fi

    # 检查 uv (Python 包管理器)
    if ! command -v uv &> /dev/null; then
        log_error "uv 未安装,请先安装 uv"
        log_info "安装命令: curl -LsSf https://astral.sh/uv/install.sh | sh"
        exit 1
    fi
    log_success "uv 已安装: $(uv --version)"

    # 检查 uvicorn 是否可用 (在 backend 目录中检查)
    log_info "检查 uvicorn 可用性..."
    cd backend
    if ! uv run uvicorn --help &> /dev/null; then
        log_warning "uvicorn 未安装,正在安装..."
        if ! uv add uvicorn[standard] 2>&1 | tee -a ../logs/init.log; then
            log_error "uvicorn 安装失败"
            cd ..
            exit 1
        fi
    fi
    cd ..
    log_success "uvicorn 可用"

    # 确保在项目根目录
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ "$SCRIPT_DIR" != "$(pwd)" ]; then
        log_warning "请在项目根目录运行此脚本"
        log_info "当前目录: $(pwd)"
        log_info "项目根目录: $SCRIPT_DIR"
        log_info "请执行: cd $SCRIPT_DIR && ./init.sh"
        exit 1
    fi
    log_success "项目目录检查通过"

    log_success "系统依赖检查通过"
}

# 启动基础设施服务
start_infrastructure() {
    log_info "启动基础设施服务 (PostgreSQL, Redis, MinIO)..."

    # 检查 docker-compose.yml 是否存在
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml 文件不存在"
        exit 1
    fi

    # 启动 Docker Compose 服务 (优先使用 docker compose，回退到 docker-compose)
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        DOCKER_COMPOSE="docker-compose"
    fi

    $DOCKER_COMPOSE up -d

    # 等待服务启动
    log_info "等待服务启动..."
    sleep 5

    # 检查服务状态
    if $DOCKER_COMPOSE ps | grep -q "Exit"; then
        log_error "部分服务启动失败,请检查日志: $DOCKER_COMPOSE logs"
        exit 1
    fi

    log_success "基础设施服务启动成功"
}

# 初始化后端
init_backend() {
    log_info "初始化后端服务..."

    cd backend

    # 检查 pyproject.toml 是否存在
    if [ ! -f "pyproject.toml" ]; then
        log_error "backend/pyproject.toml 文件不存在"
        log_error "请确保在正确的项目目录"
        cd ..
        exit 1
    fi

    # 检查 .env 文件
    if [ ! -f ".env" ]; then
        log_warning "backend/.env 文件不存在,从 .env.example 复制..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_info "已创建 backend/.env 文件"
        else
            log_error ".env.example 文件不存在"
            cd ..
            exit 1
        fi
    fi

    # 安装依赖 (使用 uv)
    log_info "安装 Python 依赖..."
    if ! uv sync 2>&1 | tee -a ../logs/init.log; then
        log_error "依赖安装失败,请查看日志: logs/init.log"
        cd ..
        exit 1
    fi

    # 运行数据库迁移
    log_info "运行数据库迁移..."

    # 保存当前迁移状态
    CURRENT=$(uv run alembic current 2>&1 | grep -oE "[a-f0-9]{13}|[a-z_]+")

    # 应用所有数据库迁移 (使用 heads 以支持多个分支)
    log_info "应用数据库迁移 (使用 heads)..."
    MIGRATION_OUTPUT=$(uv run alembic upgrade heads 2>&1)
    echo "$MIGRATION_OUTPUT" | tee -a ../logs/init.log

    if [ $? -ne 0 ]; then
        log_warning "数据库迁移失败,这可能是因为数据库状态不一致"

        # 检查是否是表已存在的错误
        if echo "$MIGRATION_OUTPUT" | grep -q "already exists"; then
            log_warning "检测到表已存在错误,尝试标记所有迁移为已完成..."
            # 直接标记所有 head
            uv run alembic stamp heads >> ../logs/init.log 2>&1
            if [ $? -eq 0 ]; then
                log_success "已标记所有迁移为已完成"
            else
                log_error "标记迁移失败,请查看日志: logs/init.log"
                cd ..
                exit 1
            fi
        else
            log_error "数据库迁移失败,请查看日志: logs/init.log"
            log_error "提示: 如果迁移失败,可以尝试重置数据库:"
            log_error "  删除 PostgreSQL 数据库并重新创建"
            log_error "  或者: cd backend && uv run alembic stamp heads"
            cd ..
            exit 1
        fi
    else
        log_success "数据库迁移完成"
    fi

    cd ..
    log_success "后端服务初始化完成"
}

# 启动后端服务
start_backend() {
    log_info "启动后端服务..."

    cd backend

    # 检查是否已经在运行
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "后端服务已在运行 (端口 8000)"
        cd ..
        return
    fi

    # 检查必要文件是否存在
    if [ ! -f "app/main.py" ]; then
        log_error "backend/app/main.py 文件不存在"
        log_error "请确保在正确的目录运行此脚本"
        cd ..
        exit 1
    fi

    # 清空旧日志
    > ../logs/backend.log

    # 后台启动后端服务
    log_info "执行命令: uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    nohup uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../logs/backend.pid

    # 等待后端启动
    log_info "等待后端服务启动 (PID: $BACKEND_PID)..."
    sleep 5

    # 检查后端是否启动成功
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_success "后端服务启动成功 (PID: $BACKEND_PID)"
        # 显示最后几行日志以确认启动
        log_info "后端启动日志:"
        tail -3 ../logs/backend.log | sed 's/^/  /'
    else
        log_error "后端服务启动失败,请查看日志: logs/backend.log"
        log_error "最后10行日志:"
        tail -10 ../logs/backend.log | sed 's/^/  /'
        cd ..
        exit 1
    fi

    cd ..
}

# 初始化前端
init_frontend() {
    log_info "初始化前端服务..."

    cd frontend

    # 检查 package.json 是否存在
    if [ ! -f "package.json" ]; then
        log_error "frontend/package.json 文件不存在"
        log_error "请确保在正确的项目目录"
        cd ..
        exit 1
    fi

    # 检查 node_modules
    if [ ! -d "node_modules" ]; then
        log_info "安装前端依赖..."
        if ! npm install 2>&1 | tee -a ../logs/init.log; then
            log_error "前端依赖安装失败,请查看日志: logs/init.log"
            cd ..
            exit 1
        fi
    fi

    cd ..
    log_success "前端服务初始化完成"
}

# 启动前端服务
start_frontend() {
    log_info "启动前端服务..."

    cd frontend

    # 检查是否已经在运行
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "前端服务已在运行 (端口 5173)"
        cd ..
        return
    fi

    # 检查必要文件是否存在
    if [ ! -f "package.json" ]; then
        log_error "frontend/package.json 文件不存在"
        log_error "请确保在正确的目录运行此脚本"
        cd ..
        exit 1
    fi

    # 清空旧日志
    > ../logs/frontend.log

    # 后台启动前端服务
    log_info "执行命令: npm run dev"
    nohup npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid

    # 等待前端启动
    log_info "等待前端服务启动 (PID: $FRONTEND_PID)..."
    sleep 5

    # 检查前端是否启动成功
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_success "前端服务启动成功 (PID: $FRONTEND_PID)"
        # 显示最后几行日志以确认启动
        log_info "前端启动日志:"
        tail -3 ../logs/frontend.log | sed 's/^/  /'
    else
        log_error "前端服务启动失败,请查看日志: logs/frontend.log"
        log_error "最后10行日志:"
        tail -10 ../logs/frontend.log | sed 's/^/  /'
        cd ..
        exit 1
    fi

    cd ..
}

# 创建日志目录
create_log_dir() {
    if [ ! -d "logs" ]; then
        mkdir -p logs
        log_info "创建日志目录: logs/"
    fi
}

# 显示服务状态
show_status() {
    echo ""
    echo "=========================================="
    echo "       Sisyphus-X 服务状态"
    echo "=========================================="
    echo ""

    # Docker 服务状态
    echo "📦 基础设施服务:"

    # 使用正确的 docker compose 命令
    if docker compose version &> /dev/null; then
        docker compose ps
    else
        docker-compose ps
    fi
    echo ""

    # 后端服务状态
    echo "🔧 后端服务:"
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        BACKEND_PID=$(cat logs/backend.pid 2>/dev/null || echo "unknown")
        echo "  ✅ 运行中 (PID: $BACKEND_PID)"
        echo "  📍 地址: http://localhost:8000"
        echo "  📚 API 文档: http://localhost:8000/docs"
    else
        echo "  ❌ 未运行"
    fi
    echo ""

    # 前端服务状态
    echo "🎨 前端服务:"
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        FRONTEND_PID=$(cat logs/frontend.pid 2>/dev/null || echo "unknown")
        echo "  ✅ 运行中 (PID: $FRONTEND_PID)"
        echo "  📍 地址: http://localhost:5173"
    else
        echo "  ❌ 未运行"
    fi
    echo ""

    echo "=========================================="
    echo ""
    echo "🎉 Sisyphus-X 启动完成!"
    echo ""
    echo "📖 查看日志:"
    echo "  后端: tail -f logs/backend.log"
    echo "  前端: tail -f logs/frontend.log"
    echo ""
    echo "🛑 停止服务:"
    echo "  ./stop.sh"
    echo ""
}

# 主流程
main() {
    echo ""
    echo "=========================================="
    echo "    Sisyphus-X 一键启动脚本"
    echo "    版本: v1.1.0"
    echo "=========================================="
    echo ""

    # 创建日志目录
    create_log_dir

    # 检查依赖
    check_dependencies

    # 启动基础设施服务
    start_infrastructure

    # 初始化并启动后端
    init_backend
    start_backend

    # 初始化并启动前端
    init_frontend
    start_frontend

    # 显示服务状态
    show_status
}

# 执行主流程
main
