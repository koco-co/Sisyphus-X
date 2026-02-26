#!/usr/bin/env bash
# ============================================================
#  Sisyphus-X 项目管理脚本
#  版本: v2.0.0
#  更新时间: 2026-02-25
# ============================================================
#  支持命令:
#    - start / stop / restart / status
#    - install / lint / test / migrate
#    - logs / clean / help
#
set -uo pipefail

# ============================================================
#  常量定义
# ============================================================
readonly VERSION="2.0.0"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_DIR="$SCRIPT_DIR/logs"
readonly BACKEND_DIR="$SCRIPT_DIR/backend"
readonly FRONTEND_DIR="$SCRIPT_DIR/frontend"
readonly ENGINE_DIR="$SCRIPT_DIR/Sisyphus-api-engine"

readonly BACKEND_PORT=8000
readonly FRONTEND_PORT=5173

# ============================================================
#  颜色与样式
# ============================================================
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly NC='\033[0m'

# ============================================================
#  日志函数
# ============================================================
log_line() {
    local color=$1
    local icon=$2
    local level=$3
    local message=$4
    # 统一前缀宽度，提升整体对齐观感
    printf "%b%s %-7s%b %s\n" "$color" "$icon" "[$level]" "$NC" "$message"
}

log_info()    { log_line "$BLUE" "ℹ️ " "INFO" "$1"; }
log_success() { log_line "$GREEN" "✅" "SUCCESS" "$1"; }
log_warning() { log_line "$YELLOW" "⚠️ " "WARNING" "$1"; }
log_error()   { log_line "$RED" "❌" "ERROR" "$1"; }
log_step()    { log_line "$CYAN" "🔧" "STEP" "$1"; }
log_debug()   { log_line "$DIM" "🔍" "DEBUG" "$1"; }

print_header() {
    echo ""
    echo -e "${BOLD}${MAGENTA}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${MAGENTA}║${NC}  🏛️  ${BOLD}Sisyphus-X${NC} — 自动化测试管理平台              ${BOLD}${MAGENTA}║${NC}"
    echo -e "${BOLD}${MAGENTA}║${NC}  📌 版本: v${VERSION}                                  ${BOLD}${MAGENTA}║${NC}"
    echo -e "${BOLD}${MAGENTA}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_separator() {
    echo -e "${DIM}──────────────────────────────────────────────────${NC}"
}

get_running_middleware_services() {
    local dc
    dc=$(detect_docker_compose)
    if [ -z "$dc" ] || [ ! -f "$SCRIPT_DIR/docker-compose.yml" ]; then
        return 0
    fi

    $dc ps --services --filter status=running 2>/dev/null || true
}

normalize_middleware_name() {
    local raw_name=$1
    case "$raw_name" in
        *postgres*) echo "PostgreSQL" ;;
        *redis*) echo "Redis" ;;
        *minio*) echo "MinIO" ;;
        *) echo "$raw_name" ;;
    esac
}

print_running_middlewares() {
    local services
    services=$(get_running_middleware_services)

    if [ -z "$services" ]; then
        echo -e "  中间件列表: ${RED}无运行中的中间件${NC}"
        return
    fi

    echo -e "  中间件列表:"
    while IFS= read -r service; do
        [ -z "$service" ] && continue
        local display_name
        display_name=$(normalize_middleware_name "$service")
        echo -e "    - ${display_name}  ${GREEN}✅ 运行中${NC}"
    done <<< "$services"
}

# ============================================================
#  错误处理
# ============================================================
error_handler() {
    local line_number=$1
    local error_code=$2
    echo ""
    log_error "脚本在第 ${BOLD}$line_number${NC} 行出错 (退出码: $error_code)"
    log_error "请查看日志: ${BOLD}$LOG_DIR/${NC}"
    echo ""
    log_info "💡 常见问题排查:"
    echo "   1. 确保 Docker, Node.js, Python, uv 均已安装"
    echo "   2. 默认端口 $BACKEND_PORT / $FRONTEND_PORT 若被占用将自动切换"
    echo "   3. 检查 backend/.env 和 frontend/.env 配置"
    echo "   4. 运行 ${BOLD}./sisyphus_init.sh status${NC} 查看服务状态"
    echo ""
}

# ============================================================
#  工具函数
# ============================================================
ensure_log_dir() {
    mkdir -p "$LOG_DIR"
}

ensure_root_dir() {
    if [ "$SCRIPT_DIR" != "$(pwd)" ]; then
        cd "$SCRIPT_DIR" || { log_error "无法切换到项目根目录: $SCRIPT_DIR"; exit 1; }
    fi
}

is_port_in_use() {
    lsof -Pi :"$1" -sTCP:LISTEN -t >/dev/null 2>&1
}

# 从 start_port 起找到第一个未被占用的端口
find_available_port() {
    local start=$1
    local p=$start
    while is_port_in_use "$p"; do
        p=$((p + 1))
    done
    echo "$p"
}

# 获取当前后端/前端实际使用的端口（用于状态展示）
get_backend_port() {
    if [ -f "$LOG_DIR/backend.port" ]; then
        cat "$LOG_DIR/backend.port" 2>/dev/null || echo "$BACKEND_PORT"
    else
        echo "$BACKEND_PORT"
    fi
}
get_frontend_port() {
    if [ -f "$LOG_DIR/frontend.port" ]; then
        cat "$LOG_DIR/frontend.port" 2>/dev/null || echo "$FRONTEND_PORT"
    else
        echo "$FRONTEND_PORT"
    fi
}

# 等待 HTTP 服务返回 200（用于确认服务真正就绪）
wait_for_http() {
    local url=$1
    local max_retries=${2:-15}
    local retries=0
    while [ $retries -lt $max_retries ]; do
        local code
        code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$url" 2>/dev/null || echo "000")
        if [ "$code" = "200" ]; then
            return 0
        fi
        sleep 2
        retries=$((retries + 1))
    done
    return 1
}

get_pid_from_file() {
    local pid_file="$1"
    if [ -f "$pid_file" ]; then
        cat "$pid_file"
    else
        echo ""
    fi
}

detect_docker_compose() {
    if docker compose version &>/dev/null; then
        echo "docker compose"
    elif docker-compose --version &>/dev/null; then
        echo "docker-compose"
    else
        echo ""
    fi
}

graceful_kill() {
    local pid=$1
    local name=$2
    local timeout=${3:-10}

    if [ -z "$pid" ] || ! ps -p "$pid" >/dev/null 2>&1; then
        return 0
    fi

    log_step "正在停止 $name (PID: $pid)..."
    kill "$pid" 2>/dev/null

    local waited=0
    while ps -p "$pid" >/dev/null 2>&1 && [ $waited -lt $timeout ]; do
        sleep 1
        waited=$((waited + 1))
    done

    if ps -p "$pid" >/dev/null 2>&1; then
        log_warning "$name 未在 ${timeout}s 内退出，强制终止..."
        kill -9 "$pid" 2>/dev/null
        sleep 1
    fi

    log_success "$name 已停止"
}

# ============================================================
#  依赖检查
# ============================================================
check_command() {
    local cmd=$1
    local name=$2
    local install_hint=$3

    if command -v "$cmd" &>/dev/null; then
        local version
        version=$("$cmd" --version 2>&1 | head -1)
        log_success "$name: $version"
        return 0
    else
        log_error "$name 未安装"
        log_info "💡 安装方式: $install_hint"
        return 1
    fi
}

cmd_check_deps() {
    print_separator
    log_info "🔍 检查系统依赖..."
    echo ""

    local has_error=0

    check_command "docker" "Docker" "https://docs.docker.com/get-docker/" || has_error=1
    check_command "node" "Node.js" "https://nodejs.org/ (需要 18+)" || has_error=1
    check_command "uv" "UV" "curl -LsSf https://astral.sh/uv/install.sh | sh" || has_error=1
    check_command "npm" "npm" "随 Node.js 一起安装" || has_error=1

    # Python：优先用后端 uv 环境，只输出一行
    if [ -f "$BACKEND_DIR/pyproject.toml" ]; then
        local pyver
        pyver=$(cd "$BACKEND_DIR" && uv run python --version 2>/dev/null || true)
        if [ -n "$pyver" ]; then
            if echo "$pyver" | grep -qE "3\.(1[2-9]|[2-9][0-9])"; then
                log_success "Python: $pyver"
            else
                log_warning "Python: $pyver（项目需要 3.12+，请执行: cd backend && uv sync）"
            fi
        else
            log_error "Python 未就绪，请执行: cd backend && uv sync"
            has_error=1
        fi
    else
        check_command "python3" "Python" "https://www.python.org/ (需要 3.12+)" || has_error=1
    fi

    local dc
    dc=$(detect_docker_compose)
    if [ -n "$dc" ]; then
        log_success "Docker Compose: $($dc version 2>&1 | head -1)"
    else
        log_error "Docker Compose 未安装"
        has_error=1
    fi

    echo ""
    if [ $has_error -eq 1 ]; then
        log_error "存在未安装的依赖，请先安装后重试"
        return 1
    fi
    log_success "🎉 所有依赖检查通过"
    return 0
}

# ============================================================
#  代码检查 (Lint)
# ============================================================
run_backend_lint() {
    log_step "🐍 运行后端代码检查 (Ruff)..."
    cd "$BACKEND_DIR"

    if uv run ruff check app/ 2>&1 | tee -a "$LOG_DIR/lint.log"; then
        log_success "后端 Ruff 检查通过 ✨"
    else
        log_warning "后端 Ruff 检查发现问题 (不阻断启动)"
        log_info "修复命令: cd backend && uv run ruff check app/ --fix"
    fi

    cd "$SCRIPT_DIR"
}

run_frontend_lint() {
    log_step "⚛️  运行前端代码检查 (ESLint)..."
    cd "$FRONTEND_DIR"

    if [ ! -d "node_modules" ]; then
        log_warning "前端依赖未安装，跳过 lint 检查"
        cd "$SCRIPT_DIR"
        return
    fi

    if npm run lint 2>&1 | tee -a "$LOG_DIR/lint.log"; then
        log_success "前端 ESLint 检查通过 ✨"
    else
        log_warning "前端 ESLint 检查发现问题 (不阻断启动)"
        log_info "修复命令: cd frontend && npm run lint -- --fix"
    fi

    cd "$SCRIPT_DIR"
}

cmd_lint() {
    ensure_log_dir
    > "$LOG_DIR/lint.log"
    print_separator
    log_info "🔎 运行代码规范检查..."
    echo ""
    run_backend_lint
    echo ""
    run_frontend_lint
    echo ""
    log_info "📄 完整日志: $LOG_DIR/lint.log"
}

# ============================================================
#  安装依赖
# ============================================================
cmd_install() {
    ensure_log_dir
    print_separator
    log_info "📦 安装项目依赖..."
    echo ""

    # 后端依赖
    log_step "🐍 安装后端 Python 依赖 (uv sync)..."
    cd "$BACKEND_DIR"
    if uv sync 2>&1 | tee -a "$LOG_DIR/install.log"; then
        log_success "后端依赖安装完成"
    else
        log_error "后端依赖安装失败，请查看日志: $LOG_DIR/install.log"
        cd "$SCRIPT_DIR"
        return 1
    fi
    cd "$SCRIPT_DIR"
    echo ""

    # 前端依赖
    log_step "⚛️  安装前端 Node.js 依赖 (npm install)..."
    cd "$FRONTEND_DIR"
    if npm install 2>&1 | tee -a "$LOG_DIR/install.log"; then
        log_success "前端依赖安装完成"
    else
        log_error "前端依赖安装失败，请查看日志: $LOG_DIR/install.log"
        cd "$SCRIPT_DIR"
        return 1
    fi
    cd "$SCRIPT_DIR"
    echo ""

    # 引擎依赖 (可选)
    if [ -f "$ENGINE_DIR/pyproject.toml" ]; then
        log_step "🔧 安装引擎依赖..."
        cd "$ENGINE_DIR"
        if uv sync 2>&1 | tee -a "$LOG_DIR/install.log"; then
            log_success "引擎依赖安装完成"
        else
            log_warning "引擎依赖安装失败 (非关键，继续)"
        fi
        cd "$SCRIPT_DIR"
        echo ""
    fi

    log_success "🎉 所有依赖安装完成"
}

# ============================================================
#  数据库迁移
# ============================================================
cmd_migrate() {
    print_separator
    log_info "🗄️  执行数据库迁移..."
    echo ""

    cd "$BACKEND_DIR"

    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            log_warning "backend/.env 不存在，从 .env.example 复制..."
            cp .env.example .env
            log_success "已创建 backend/.env"
        else
            log_error "backend/.env 和 .env.example 均不存在"
            cd "$SCRIPT_DIR"
            return 1
        fi
    fi

    log_step "应用数据库迁移 (alembic upgrade head)..."
    local output
    output=$(uv run alembic upgrade head 2>&1)
    local exit_code=$?

    echo "$output" | tee -a "$LOG_DIR/migrate.log"

    if [ $exit_code -ne 0 ]; then
        if echo "$output" | grep -q "already exists"; then
            log_warning "检测到表已存在，尝试标记迁移为已完成..."
            if uv run alembic stamp head 2>&1 | tee -a "$LOG_DIR/migrate.log"; then
                log_success "已标记迁移为已完成"
            else
                log_error "标记迁移失败"
                cd "$SCRIPT_DIR"
                return 1
            fi
        else
            log_error "数据库迁移失败，查看日志: $LOG_DIR/migrate.log"
            cd "$SCRIPT_DIR"
            return 1
        fi
    else
        log_success "数据库迁移完成 🗄️"
    fi

    cd "$SCRIPT_DIR"
}

# ============================================================
#  启动服务
# ============================================================
start_infra() {
    log_step "🐳 启动中间件服务 (PostgreSQL, Redis, MinIO)..."

    if [ ! -f "$SCRIPT_DIR/docker-compose.yml" ]; then
        log_error "docker-compose.yml 不存在"
        return 1
    fi

    local dc
    dc=$(detect_docker_compose)
    if [ -z "$dc" ]; then
        log_error "Docker Compose 不可用"
        return 1
    fi

    if ! $dc up -d 2>&1 | tee -a "$LOG_DIR/infra.log"; then
        log_warning "Docker Compose 启动失败（如 Docker 未运行或权限不足），跳过中间件"
        return 0
    fi

    log_step "⏳ 等待中间件健康检查..."
    local retries=0
    local max_retries=30
    while [ $retries -lt $max_retries ]; do
        local healthy=0
        local total=0
        local status_lines
        status_lines=$($dc ps --format "{{.Status}}" 2>/dev/null || $dc ps 2>/dev/null || true)
        while IFS= read -r line; do
            [ -z "$line" ] && continue
            total=$((total + 1))
            if echo "$line" | grep -qE "(healthy|running)"; then
                healthy=$((healthy + 1))
            fi
        done <<< "$status_lines"

        if [ $total -gt 0 ] && [ $healthy -eq $total ]; then
            break
        fi

        retries=$((retries + 1))
        sleep 2
    done

    if [ $retries -ge $max_retries ]; then
        log_warning "中间件健康检查超时，部分服务可能未就绪"
        $dc ps 2>/dev/null || true
    else
        log_success "中间件服务已就绪 🐳"
    fi
}

start_backend() {
    log_step "🐍 启动后端服务..."

    local actual_port=$BACKEND_PORT
    if is_port_in_use $BACKEND_PORT; then
        actual_port=$(find_available_port $((BACKEND_PORT + 1)))
        log_warning "默认端口 $BACKEND_PORT 已被占用，改用端口 $actual_port"
    fi
    echo $actual_port > "$LOG_DIR/backend.port"

    cd "$BACKEND_DIR"

    if [ ! -f "app/main.py" ]; then
        log_error "backend/app/main.py 不存在"
        cd "$SCRIPT_DIR"
        return 1
    fi

    # 确保后端使用 Python 3.12+（项目要求）
    local pyver
    pyver=$(uv run python --version 2>/dev/null || true)
    if [ -n "$pyver" ]; then
        if ! echo "$pyver" | grep -qE "3\.(1[2-9]|[2-9][0-9])"; then
            log_error "后端需要 Python 3.12+，当前: $pyver"
            log_info "请安装 Python 3.12+ 后执行: cd backend && uv sync"
            cd "$SCRIPT_DIR"
            return 1
        fi
        log_debug "后端 Python: $pyver"
    fi

    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_info "已从 .env.example 创建 backend/.env"
        fi
    fi

    > "$LOG_DIR/backend.log"

    nohup uv run uvicorn app.main:app --reload --host 0.0.0.0 --port $actual_port \
        > "$LOG_DIR/backend.log" 2>&1 &
    local pid=$!
    echo $pid > "$LOG_DIR/backend.pid"

    log_step "⏳ 等待后端启动 (PID: $pid)..."

    local retries=0
    while [ $retries -lt 20 ]; do
        if ! ps -p $pid >/dev/null 2>&1; then
            log_error "后端进程已退出"
            log_error "最后日志:"
            tail -15 "$LOG_DIR/backend.log" 2>/dev/null | sed 's/^/  /'
            cd "$SCRIPT_DIR"
            return 1
        fi
        if is_port_in_use $actual_port; then
            if wait_for_http "http://127.0.0.1:$actual_port/docs" 5; then
                log_success "后端服务启动成功 🐍"
                log_info "  📍 地址: http://localhost:$actual_port"
                log_info "  📚 API 文档: http://localhost:$actual_port/docs"
                cd "$SCRIPT_DIR"
                return 0
            fi
        fi
        sleep 2
        retries=$((retries + 1))
    done

    log_error "后端启动超时（端口已监听但 HTTP 未就绪或进程异常）"
    log_error "查看日志: tail -f $LOG_DIR/backend.log"
    cd "$SCRIPT_DIR"
    return 1
}

start_frontend() {
    log_step "⚛️  启动前端服务..."

    local actual_port=$FRONTEND_PORT
    if is_port_in_use $FRONTEND_PORT; then
        actual_port=$(find_available_port $((FRONTEND_PORT + 1)))
        log_warning "默认端口 $FRONTEND_PORT 已被占用，改用端口 $actual_port"
    fi
    echo $actual_port > "$LOG_DIR/frontend.port"

    cd "$FRONTEND_DIR"

    if [ ! -f "package.json" ]; then
        log_error "frontend/package.json 不存在"
        cd "$SCRIPT_DIR"
        return 1
    fi

    if [ ! -d "node_modules" ]; then
        log_step "📦 安装前端依赖..."
        npm install 2>&1 | tee -a "$LOG_DIR/install.log"
    fi

    > "$LOG_DIR/frontend.log"

    nohup npm run dev -- --host 0.0.0.0 --port $actual_port < /dev/null > "$LOG_DIR/frontend.log" 2>&1 &
    local pid=$!
    echo $pid > "$LOG_DIR/frontend.pid"

    log_step "⏳ 等待前端启动 (PID: $pid)..."

    local retries=0
    while [ $retries -lt 15 ]; do
        if is_port_in_use $actual_port; then
            log_success "✅ 前端服务启动成功"
            log_info "  📍 地址: http://localhost:$actual_port"
            cd "$SCRIPT_DIR"
            return 0
        fi

        if ! ps -p $pid >/dev/null 2>&1; then
            log_error "前端进程已退出"
            log_error "最后日志:"
            tail -10 "$LOG_DIR/frontend.log" 2>/dev/null | sed 's/^/  /'
            cd "$SCRIPT_DIR"
            return 1
        fi

        sleep 2
        retries=$((retries + 1))
    done

    log_error "前端启动超时"
    log_error "查看日志: tail -f $LOG_DIR/frontend.log"
    cd "$SCRIPT_DIR"
    return 1
}

cmd_start() {
    local target="${1:---all}"
    ensure_log_dir
    ensure_root_dir

    trap 'error_handler ${LINENO} $?' ERR

    print_separator
    log_info "🚀 启动 Sisyphus-X 服务 ($target)..."
    echo ""

    # 依赖检查
    cmd_check_deps || return 1
    echo ""

    # 代码规范检查（仅警告）
    log_info "🔎 执行启动前代码检查..."
    echo ""
    run_backend_lint 2>/dev/null || true
    echo ""
    run_frontend_lint 2>/dev/null || true
    echo ""

    case "$target" in
        --all)
            start_infra || log_warning "中间件启动失败（如 Docker 未运行或权限不足），继续启动后端与前端..."
            echo ""
            cmd_migrate || log_warning "迁移未完成，继续启动..."
            echo ""
            start_backend
            echo ""
            start_frontend
            ;;
        --infra)
            start_infra
            ;;
        --backend)
            start_backend
            ;;
        --frontend)
            start_frontend
            ;;
        *)
            log_error "未知目标: $target"
            log_info "可选: --all, --infra, --backend, --frontend"
            return 1
            ;;
    esac

    echo ""
    print_separator
    cmd_status_compact
    trap - ERR
}

# ============================================================
#  停止服务
# ============================================================
stop_backend() {
    log_step "🛑 停止后端服务..."
    local pid
    pid=$(get_pid_from_file "$LOG_DIR/backend.pid")

    if [ -n "$pid" ] && ps -p "$pid" >/dev/null 2>&1; then
        graceful_kill "$pid" "后端服务"
        rm -f "$LOG_DIR/backend.pid" "$LOG_DIR/backend.port"
    else
        local port_pid
        local port_to_try
        port_to_try=$BACKEND_PORT
        port_pid=$(lsof -ti:$port_to_try 2>/dev/null || echo "")
        if [ -z "$port_pid" ] && [ -f "$LOG_DIR/backend.port" ]; then
            port_to_try=$(cat "$LOG_DIR/backend.port" 2>/dev/null)
            port_pid=$(lsof -ti:$port_to_try 2>/dev/null || echo "")
        fi
        if [ -n "$port_pid" ]; then
            graceful_kill "$port_pid" "后端服务 (端口 $port_to_try)"
        else
            log_info "后端服务未运行"
        fi
        rm -f "$LOG_DIR/backend.pid" "$LOG_DIR/backend.port"
    fi
}

stop_frontend() {
    log_step "🛑 停止前端服务..."
    local pid
    pid=$(get_pid_from_file "$LOG_DIR/frontend.pid")

    if [ -n "$pid" ] && ps -p "$pid" >/dev/null 2>&1; then
        graceful_kill "$pid" "前端服务"
        rm -f "$LOG_DIR/frontend.pid" "$LOG_DIR/frontend.port"
    else
        local port_pid
        local port_to_try
        port_to_try=$FRONTEND_PORT
        port_pid=$(lsof -ti:$port_to_try 2>/dev/null || echo "")
        if [ -z "$port_pid" ] && [ -f "$LOG_DIR/frontend.port" ]; then
            port_to_try=$(cat "$LOG_DIR/frontend.port" 2>/dev/null)
            port_pid=$(lsof -ti:$port_to_try 2>/dev/null || echo "")
        fi
        if [ -n "$port_pid" ]; then
            graceful_kill "$port_pid" "前端服务 (端口 $port_to_try)"
        else
            log_info "前端服务未运行"
        fi
        rm -f "$LOG_DIR/frontend.pid" "$LOG_DIR/frontend.port"
    fi
}

stop_infra() {
    log_step "🐳 停止中间件服务..."

    local dc
    dc=$(detect_docker_compose)
    if [ -z "$dc" ]; then
        log_warning "Docker Compose 不可用"
        return 0
    fi

    if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
        $dc down 2>&1
        log_success "中间件服务已停止"
    fi
}

cmd_stop() {
    local target="${1:---all}"
    print_separator
    log_info "🛑 停止 Sisyphus-X 服务 ($target)..."
    echo ""

    case "$target" in
        --all)
            stop_frontend
            echo ""
            stop_backend
            echo ""
            stop_infra
            ;;
        --infra)
            stop_infra
            ;;
        --backend)
            stop_backend
            ;;
        --frontend)
            stop_frontend
            ;;
        *)
            log_error "未知目标: $target"
            return 1
            ;;
    esac

    echo ""
    log_success "🏁 服务已停止"
}

# ============================================================
#  重启服务
# ============================================================
cmd_restart() {
    local target="${1:---all}"
    print_separator
    log_info "🔄 重启 Sisyphus-X 服务 ($target)..."
    echo ""
    cmd_stop "$target"
    echo ""
    cmd_start "$target"
}

# ============================================================
#  服务状态
# ============================================================
cmd_status_compact() {
    echo -e "  ${BOLD}服务状态:${NC}"

    local bport fport
    bport=$(get_backend_port)
    fport=$(get_frontend_port)

    # 后端
    if is_port_in_use $BACKEND_PORT || is_port_in_use "$bport"; then
        local bpid
        bpid=$(get_pid_from_file "$LOG_DIR/backend.pid")
        echo -e "  🐍 后端:   ${GREEN}运行中${NC} (PID: ${bpid:-unknown})  http://localhost:$bport"
    else
        echo -e "  🐍 后端:   ${RED}未运行${NC}"
    fi

    # 前端
    if is_port_in_use $FRONTEND_PORT || is_port_in_use "$fport"; then
        local fpid
        fpid=$(get_pid_from_file "$LOG_DIR/frontend.pid")
        echo -e "  ⚛️  前端:   ${GREEN}运行中${NC} (PID: ${fpid:-unknown})  http://localhost:$fport"
    else
        echo -e "  ⚛️  前端:   ${RED}未运行${NC}"
    fi

    # 中间件
    local dc
    dc=$(detect_docker_compose)
    if [ -n "$dc" ] && [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
        local container_count
        container_count=$($dc ps -q 2>/dev/null | wc -l | tr -d ' ')
        if [ "$container_count" -gt 0 ]; then
            echo -e "  🐳 中间件: ${GREEN}运行中${NC} ($container_count 个容器)"
        else
            echo -e "  🐳 中间件: ${RED}未运行${NC}"
        fi
    fi

    print_running_middlewares
}

cmd_status() {
    print_separator
    log_info "📊 Sisyphus-X 服务状态"
    echo ""

    # 后端
    local bport
    bport=$(get_backend_port)
    echo -e "${BOLD}🐍 后端服务:${NC}"
    if is_port_in_use $BACKEND_PORT || is_port_in_use "$bport"; then
        local bpid
        bpid=$(get_pid_from_file "$LOG_DIR/backend.pid")
        echo -e "  状态: ${GREEN}✅ 运行中${NC}"
        echo -e "  PID:  ${bpid:-unknown}"
        echo -e "  地址: http://localhost:$bport"
        echo -e "  文档: http://localhost:$bport/docs"
    else
        echo -e "  状态: ${RED}❌ 未运行${NC}"
    fi
    echo ""

    # 前端
    local fport
    fport=$(get_frontend_port)
    echo -e "${BOLD}⚛️  前端服务:${NC}"
    if is_port_in_use $FRONTEND_PORT || is_port_in_use "$fport"; then
        local fpid
        fpid=$(get_pid_from_file "$LOG_DIR/frontend.pid")
        echo -e "  状态: ${GREEN}✅ 运行中${NC}"
        echo -e "  PID:  ${fpid:-unknown}"
        echo -e "  地址: http://localhost:$fport"
    else
        echo -e "  状态: ${RED}❌ 未运行${NC}"
    fi
    echo ""

    # 中间件
    echo -e "${BOLD}🐳 中间件服务:${NC}"
    local dc
    dc=$(detect_docker_compose)
    if [ -n "$dc" ] && [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
        $dc ps 2>/dev/null || echo "  Docker Compose 状态查询失败"
    else
        echo -e "  状态: ${RED}❌ Docker Compose 不可用${NC}"
    fi
    echo ""

    # 日志
    echo -e "${BOLD}📋 日志文件:${NC}"
    echo "  后端: $LOG_DIR/backend.log"
    echo "  前端: $LOG_DIR/frontend.log"
    echo "  迁移: $LOG_DIR/migrate.log"
}

# ============================================================
#  测试
# ============================================================
cmd_test() {
    local target="${1:---all}"
    ensure_log_dir
    print_separator
    log_info "🧪 运行测试 ($target)..."
    echo ""

    case "$target" in
        --all)
            local has_error=0
            > "$LOG_DIR/test-all.log"

            # 后端 Python 测试：统一使用仓库根目录 tests/ 下的 3 个目录
            log_step "🐍  运行后端测试 (tests/unit + tests/interface)..."
            cd "$BACKEND_DIR"
            if uv run --with pytest-asyncio pytest ../tests/unit ../tests/interface -v 2>&1 | tee -a "$LOG_DIR/test-all.log"; then
                log_success "后端 tests/unit + tests/interface 测试通过"
            else
                log_error "后端 tests/unit 或 tests/interface 测试有失败项"
                has_error=1
            fi
            cd "$SCRIPT_DIR"
            echo ""

            # 引擎: Python 单元测试 + YAML 测试用例
            if [ -d "$ENGINE_DIR" ]; then
                cd "$ENGINE_DIR"

                # Python 单元测试: tests/unit 下的 pytest
                if [ -d "tests/unit" ]; then
                    log_step "🧠  运行 sisyphus-api-engine Python 单元测试 (tests/unit)..."
                    if uv run python -m pytest tests/unit -v 2>&1 | tee -a "$LOG_DIR/test-all.log"; then
                        log_success "sisyphus-api-engine Python 单元测试通过"
                    else
                        log_error "sisyphus-api-engine Python 单元测试有失败项"
                        has_error=1
                    fi
                    echo ""
                fi

                # YAML 测试用例: tests/yaml 通过 CLI 批量执行
                if [ -d "tests/yaml" ]; then
                    log_step "🧠  运行 sisyphus-api-engine YAML 测试用例 (tests/yaml)..."
                    if uv run python -m apirun.cli --cases tests/yaml 2>&1 | tee -a "$LOG_DIR/test-all.log"; then
                        log_success "sisyphus-api-engine tests/yaml 用例通过"
                    else
                        log_error "sisyphus-api-engine tests/yaml 用例有失败项"
                        has_error=1
                    fi
                    echo ""
                fi

                # 示例 YAML 用例: examples/
                if [ -d "examples" ]; then
                    log_step "🧠  运行 sisyphus-api-engine 示例用例 (examples/)..."
                    if uv run python -m apirun.cli --cases examples/ 2>&1 | tee -a "$LOG_DIR/test-all.log"; then
                        log_success "sisyphus-api-engine examples/ 用例通过"
                    else
                        log_error "sisyphus-api-engine examples/ 用例有失败项"
                        has_error=1
                    fi
                    echo ""
                fi

                cd "$SCRIPT_DIR"
            fi

            # 自动化测试：tests/auto 下的 Playwright E2E，用 frontend 的 Node 环境运行
            if [ -d "$FRONTEND_DIR" ] && [ -f "$FRONTEND_DIR/package.json" ]; then
                log_step "🤖  运行自动化测试 (tests/auto, Playwright E2E)..."
                cd "$FRONTEND_DIR"
                if npx playwright test -c ../tests/auto/playwright.config.ts 2>&1 | tee -a "$LOG_DIR/test-all.log"; then
                    log_success "自动化测试 (tests/auto) 通过"
                else
                    log_error "自动化测试 (tests/auto) 有失败项"
                    has_error=1
                fi
                cd "$SCRIPT_DIR"
                echo ""
            fi

            # 前端单元测试（Vitest）
            if [ -d "$FRONTEND_DIR" ] && [ -f "$FRONTEND_DIR/package.json" ]; then
                log_step "⚛️  运行前端单元测试 (Vitest)..."
                cd "$FRONTEND_DIR"
                if npm run test:run 2>&1 | tee -a "$LOG_DIR/test-all.log"; then
                    log_success "前端单元测试通过"
                else
                    log_error "前端单元测试有失败项"
                    has_error=1
                fi
                cd "$SCRIPT_DIR"
            fi

            echo ""
            log_info "📄 全量测试日志: $LOG_DIR/test-all.log"
            if [ $has_error -ne 0 ]; then
                log_error "❌ 全量测试未全部通过，请根据日志排查问题"
                return 1
            fi
            log_success "🎉 所有测试通过 (后端 + 引擎 + 自动化 + 前端)"
            ;;
        --unit)
            local has_error=0
            > "$LOG_DIR/test-unit.log"

            # 仅运行仓库根 tests/unit 下的后端单元测试
            log_step "🐍  运行后端单元测试 (tests/unit)..."
            cd "$BACKEND_DIR"
            if uv run --with pytest-asyncio pytest ../tests/unit -v 2>&1 | tee -a "$LOG_DIR/test-unit.log"; then
                log_success "后端单元测试通过"
            else
                log_error "后端单元测试有失败项"
                has_error=1
            fi
            cd "$SCRIPT_DIR"
            echo ""

            # Sisyphus 引擎 Python 单元测试：tests/unit 下的 pytest
            if [ -d "$ENGINE_DIR" ]; then
                log_step "🧠  运行 sisyphus-api-engine Python 单元测试 (tests/unit)..."
                cd "$ENGINE_DIR"
                if uv run python -m pytest tests/unit -v 2>&1 | tee -a "$LOG_DIR/test-unit.log"; then
                    log_success "sisyphus-api-engine Python 单元测试通过"
                else
                    log_error "sisyphus-api-engine Python 单元测试有失败项"
                    has_error=1
                fi
                cd "$SCRIPT_DIR"
                echo ""
            fi

            echo ""
            log_info "📄 单元测试日志: $LOG_DIR/test-unit.log"
            if [ $has_error -ne 0 ]; then
                log_error "❌ 单元测试未全部通过，请修复后重试"
                return 1
            fi
            log_success "🎉 单元测试通过 (tests/unit + sisyphus-api-engine tests/)"
            ;;
        --interface)
            # 仅运行仓库根 tests/interface 下的接口测试
            log_step "🐍  运行接口测试 (tests/interface)..."
            cd "$BACKEND_DIR"
            if uv run --with pytest-asyncio pytest ../tests/interface -v 2>&1; then
                log_success "接口测试通过"
            else
                log_error "接口测试有失败项"
                cd "$SCRIPT_DIR"
                return 1
            fi
            cd "$SCRIPT_DIR"
            ;;
        --auto)
            # 仅运行 tests/auto 下的 Playwright 自动化测试
            if [ -d "$FRONTEND_DIR" ] && [ -f "$FRONTEND_DIR/package.json" ]; then
                log_step "🤖  运行自动化测试 (tests/auto, Playwright E2E)..."
                cd "$FRONTEND_DIR"
                if npx playwright test -c ../tests/auto/playwright.config.ts 2>&1; then
                    log_success "自动化测试 (tests/auto) 通过"
                else
                    log_error "自动化测试 (tests/auto) 有失败项"
                    cd "$SCRIPT_DIR"
                    return 1
                fi
                cd "$SCRIPT_DIR"
            else
                log_warning "前端目录或 package.json 不存在，无法运行自动化测试 (tests/auto)"
                return 1
            fi
            ;;
        --e2e)
            # 保留前端自身的 E2E 测试入口 (frontend/tests 下的配置)
            log_step "⚛️  运行前端 E2E 测试 (Playwright, frontend)..."
            cd "$FRONTEND_DIR"
            npm run test:e2e 2>&1 || log_warning "前端 E2E 测试有失败项"
            cd "$SCRIPT_DIR"
            ;;
        *)
            log_error "未知测试类型: $target"
            log_info "可选: --all, --unit, --interface, --auto, --e2e"
            return 1
            ;;
    esac
}

# ============================================================
#  查看日志
# ============================================================
cmd_logs() {
    local target="${1:---backend}"

    case "$target" in
        --backend)
            if [ -f "$LOG_DIR/backend.log" ]; then
                log_info "📄 后端日志 (Ctrl+C 退出):"
                tail -f "$LOG_DIR/backend.log"
            else
                log_warning "后端日志文件不存在"
            fi
            ;;
        --frontend)
            if [ -f "$LOG_DIR/frontend.log" ]; then
                log_info "📄 前端日志 (Ctrl+C 退出):"
                tail -f "$LOG_DIR/frontend.log"
            else
                log_warning "前端日志文件不存在"
            fi
            ;;
        *)
            log_error "未知日志类型: $target"
            log_info "可选: --backend, --frontend"
            return 1
            ;;
    esac
}

# ============================================================
#  清理
# ============================================================
cmd_clean() {
    print_separator
    log_info "🧹 清理临时文件..."
    echo ""

    # 日志文件
    if [ -d "$LOG_DIR" ]; then
        rm -f "$LOG_DIR"/*.log "$LOG_DIR"/*.pid
        log_success "清理日志和 PID 文件"
    fi

    # Python 缓存
    find "$SCRIPT_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find "$SCRIPT_DIR" -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
    find "$SCRIPT_DIR" -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
    log_success "清理 Python 缓存 (__pycache__, .pytest_cache, .ruff_cache)"

    # 临时目录
    if [ -d "$SCRIPT_DIR/temp" ]; then
        rm -rf "$SCRIPT_DIR/temp"
        log_success "清理 temp/ 目录"
    fi

    # 前端构建输出
    if [ -d "$FRONTEND_DIR/dist" ]; then
        rm -rf "$FRONTEND_DIR/dist"
        log_success "清理 frontend/dist/"
    fi

    echo ""
    log_success "🧹 清理完成"
}

# ============================================================
#  帮助信息
# ============================================================
cmd_help() {
    echo -e "${BOLD}用法:${NC}"
    echo "  ./sisyphus_init.sh <command> [options]"
    echo ""
    echo -e "${BOLD}命令:${NC}"
    echo ""
    echo -e "  ${GREEN}start${NC}   [--all|--backend|--frontend|--infra]"
    echo "          启动服务 (默认: --all)"
    echo ""
    echo -e "  ${GREEN}stop${NC}    [--all|--backend|--frontend|--infra]"
    echo "          停止服务 (默认: --all)"
    echo ""
    echo -e "  ${GREEN}restart${NC} [--all|--backend|--frontend|--infra]"
    echo "          重启服务 (默认: --all)"
    echo ""
    echo -e "  ${GREEN}status${NC}  查看所有服务运行状态"
    echo ""
    echo -e "  ${GREEN}install${NC} 安装所有依赖 (后端 + 前端 + 引擎)"
    echo ""
    echo -e "  ${GREEN}lint${NC}    运行代码规范检查 (Ruff + ESLint)"
    echo ""
    echo -e "  ${GREEN}test${NC}    [--all|--unit|--interface|--auto|--e2e]"
    echo "          运行测试 (默认: --all)"
    echo "            --all       后端 tests/unit + tests/interface,"
    echo "                        引擎 tests/unit (pytest) + tests/yaml (CLI) + examples/,"
    echo "                        自动化 tests/auto (Playwright) + 前端单测"
    echo "            --unit      仅运行后端 tests/unit + 引擎 tests/unit (pytest)"
    echo "            --interface 仅运行后端 tests/interface"
    echo "            --auto      仅运行 tests/auto (Playwright E2E 自动化)"
    echo "            --e2e       仅运行前端自身 E2E 测试 (frontend)"
    echo ""
    echo -e "  ${GREEN}migrate${NC} 执行数据库迁移 (Alembic)"
    echo ""
    echo -e "  ${GREEN}logs${NC}    [--backend|--frontend]"
    echo "          查看服务日志 (默认: --backend)"
    echo -e "  ${GREEN}clean${NC}   清理临时文件和缓存"
    echo ""
    echo -e "  ${GREEN}help${NC}    显示此帮助信息"
    echo ""
    echo -e "${BOLD}示例:${NC}"
    echo "  ./sisyphus_init.sh start              # 启动所有服务"
    echo "  ./sisyphus_init.sh start --backend    # 仅启动后端"
    echo "  ./sisyphus_init.sh stop               # 停止所有服务"
    echo "  ./sisyphus_init.sh restart --frontend # 重启前端"
    echo "  ./sisyphus_init.sh lint               # 代码检查"
    echo "  ./sisyphus_init.sh test --unit        # 运行单元测试"
    echo ""
}

# ============================================================
#  主入口
# ============================================================
main() {
    local command="${1:-help}"
    shift 2>/dev/null || true

    print_header

    case "$command" in
        start)    cmd_start "$@" ;;
        stop)     cmd_stop "$@" ;;
        restart)  cmd_restart "$@" ;;
        status)   cmd_status ;;
        install)  cmd_install ;;
        lint)     cmd_lint ;;
        test)     cmd_test "$@" ;;
        migrate)  cmd_migrate ;;
        logs)     cmd_logs "$@" ;;
        clean)    cmd_clean ;;
        help|--help|-h)  cmd_help ;;
        *)
            log_error "未知命令: $command"
            echo ""
            cmd_help
            exit 1
            ;;
    esac
}

main "$@"
