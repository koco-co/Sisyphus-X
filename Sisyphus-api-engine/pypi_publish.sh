#!/bin/bash
set -euo pipefail

echo "========== sisyphus-api-engine PyPI 发布 =========="

if [ -z "${PYPI_API_TOKEN:-}" ]; then
    echo "错误: PYPI_API_TOKEN 环境变量未设置"
    echo "请先执行: export PYPI_API_TOKEN=your_token"
    exit 1
fi

echo "1. 清理旧构建产物..."
rm -rf dist/ build/ *.egg-info

echo "2. 构建包..."
uv build

echo "3. 发布到 PyPI..."
uv publish --token "$PYPI_API_TOKEN"

echo "========== 发布完成 =========="
