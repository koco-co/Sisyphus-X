# GitHub CI 工作流设计

## 概述

为 Sisyphus-X 项目添加 GitHub Actions CI 自动检查能力，采用简化设计，聚焦核心功能。

## 需求总结

| 功能 | 描述 |
|------|------|
| 代码质量检查 | 后端 ruff + 前端 eslint |
| 单元测试 | 后端 pytest + 前端 vitest |
| 构建验证 | 前端 vite build |
| 文档检查 | 代码变更时检查 README/CHANGELOG 是否需要更新 |
| 依赖更新 | Dependabot 自动创建 PR |

## 架构设计

### 文件结构

```
.github/
├── workflows/
│   └── ci.yml              # 统一的 CI 工作流
└── dependabot.yml          # 依赖自动更新配置
```

### 工作流设计

#### ci.yml

**触发条件：**
- `pull_request` 到 `main` 分支
- `push` 到 `main` 分支

**Job 结构：**

```
┌─────────────────────────────────────────────────────────┐
│                     backend (并行)                       │
│  • ruff check (代码规范)                                 │
│  • ruff format --check (格式检查)                        │
│  • pytest (单元测试)                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     frontend (并行)                      │
│  • eslint (代码规范)                                     │
│  • vite build (构建验证)                                 │
│  • vitest run (单元测试)                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     docs (文档检查)                      │
│  • 检测代码变更路径                                      │
│  • 判断是否需要更新 README/CHANGELOG                     │
│  • 未更新则 CI 失败                                      │
│  • 支持 [skip-docs] 跳过                                 │
└─────────────────────────────────────────────────────────┘
```

**文档检查规则：**

| 代码变更 | 需要检查的文档 |
|----------|----------------|
| `backend/pyproject.toml` | README.md (依赖说明) |
| `backend/app/api/` | README.md (API 说明) |
| `backend/alembic/versions/` | CHANGELOG.md |
| `frontend/package.json` | README.md (依赖说明) |
| `.env.example` | README.md (配置说明) |
| 任何功能变更 | CHANGELOG.md |

**跳过机制：**
- commit message 包含 `[skip-docs]` 可跳过文档检查
- 用于重构、格式调整等不需要更新文档的场景

#### dependabot.yml

**配置：**
- 更新频率：每周一上午 9:00
- 后端 pip 依赖：`backend/` 目录
- 前端 npm 依赖：`frontend/` 目录
- GitHub Actions：`.github/workflows/` 目录

**分组策略：**
- 生产依赖和开发依赖分开
- 减少 PR 数量，避免刷屏

**PR 限制：**
- 每次最多 5 个 PR
- 自动添加 `dependencies` 标签

## 技术细节

### 后端 CI 配置

```yaml
- uses: astral-sh/setup-uv@v4
  with:
    version: "latest"

- run: uv sync --dev

- run: uv run ruff check app/
- run: uv run ruff format --check app/
- run: uv run pytest ../tests/unit -v
```

### 前端 CI 配置

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: "npm"
    cache-dependency-path: frontend/package-lock.json

- run: npm ci
  working-directory: frontend

- run: npm run lint
  working-directory: frontend

- run: npm run build
  working-directory: frontend

- run: npm run test:run
  working-directory: frontend
```

### 文档检查脚本

使用 shell 脚本检测变更并判断是否需要更新文档：

```bash
# 检测变更文件
CHANGED_FILES=$(git diff --name-only origin/main...HEAD)

# 检查是否需要更新 CHANGELOG
if echo "$CHANGED_FILES" | grep -qE "^(backend/app/|frontend/src/)"; then
  # 检查 CHANGELOG 是否更新
  if ! echo "$CHANGED_FILES" | grep -q "CHANGELOG.md"; then
    echo "::error::代码变更需要更新 CHANGELOG.md"
    exit 1
  fi
fi
```

## 预期效果

- **快速反馈**：CI 在 3-5 分钟内完成
- **文档同步**：代码变更时强制检查文档更新
- **依赖管理**：自动检测过期依赖并创建 PR
- **维护简单**：只有 2 个配置文件，易于理解和修改

## 实现文件清单

1. `.github/workflows/ci.yml` - 主 CI 工作流
2. `.github/dependabot.yml` - 依赖更新配置
