#!/bin/bash
# Sisyphus-X 一键停止脚本
# 版本: v1.0.0
# 更新时间: 2026-02-15

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 停止前端服务
stop_frontend() {
    log_info "停止前端服务..."

    # 从 PID 文件读取
    if [ -f "logs/frontend.pid" ]; then
        FRONTEND_PID=$(cat logs/frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            kill $FRONTEND_PID
            log_success "前端服务已停止 (PID: $FRONTEND_PID)"
        else
            log_warning "前端服务未运行 (PID: $FRONTEND_PID)"
        fi
        rm -f logs/frontend.pid
    else
        # 通过端口查找并停止
        FRONTEND_PID=$(lsof -ti:5173 2>/dev/null || echo "")
        if [ -n "$FRONTEND_PID" ]; then
            kill $FRONTEND_PID
            log_success "前端服务已停止 (PID: $FRONTEND_PID)"
        else
            log_warning "前端服务未运行"
        fi
    fi
}

# 停止后端服务
stop_backend() {
    log_info "停止后端服务..."

    # 从 PID 文件读取
    if [ -f "logs/backend.pid" ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            kill $BACKEND_PID
            log_success "后端服务已停止 (PID: $BACKEND_PID)"
        else
            log_warning "后端服务未运行 (PID: $BACKEND_PID)"
        fi
        rm -f logs/backend.pid
    else
        # 通过端口查找并停止
        BACKEND_PID=$(lsof -ti:8000 2>/dev/null || echo "")
        if [ -n "$BACKEND_PID" ]; then
            kill $BACKEND_PID
            log_success "后端服务已停止 (PID: $BACKEND_PID)"
        else
            log_warning "后端服务未运行"
        fi
    fi
}

# 停止基础设施服务
stop_infrastructure() {
    log_info "停止基础设施服务..."

    if [ -f "docker-compose.yml" ]; then
        # 使用正确的 docker compose 命令
        if docker compose version &> /dev/null; then
            docker compose down
        else
            docker-compose down
        fi
        log_success "基础设施服务已停止"
    else
        log_warning "docker-compose.yml 文件不存在"
    fi
}

# 清理日志 (可选)
clean_logs() {
    read -p "是否清理日志文件? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "清理日志文件..."
        rm -f logs/*.log
        log_success "日志文件已清理"
    fi
}

# 主流程
main() {
    echo ""
    echo "=========================================="
    echo "    Sisyphus-X 一键停止脚本"
    echo "    版本: v1.0.0"
    echo "=========================================="
    echo ""

    # 停止前端
    stop_frontend
    echo ""

    # 停止后端
    stop_backend
    echo ""

    # 停止基础设施
    stop_infrastructure
    echo ""

    # 询问是否清理日志
    clean_logs
    echo ""

    echo "=========================================="
    echo ""
    echo "✅ Sisyphus-X 已停止"
    echo ""
    echo "🔄 重新启动:"
    echo "  ./init.sh"
    echo ""
}

# 执行主流程
main
