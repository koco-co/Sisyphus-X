# GitHub CI 工作流实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Sisyphus-X 项目添加 GitHub Actions CI 自动检查，包含代码质量、单元测试、文档检查和依赖更新。

**Architecture:** 使用单一 `ci.yml` 工作流文件，包含后端检查、前端检查、文档检查三个并行 job。使用 Dependabot 管理依赖更新。

**Tech Stack:** GitHub Actions, uv, pytest, ruff, npm, vitest, eslint, Dependabot

---

## Task 1: 创建 GitHub 工作流目录结构

**Files:**
- Create: `.github/workflows/`
- Create: `.github/`

**Step 1: 创建目录**

```bash
mkdir -p .github/workflows
```

**Step 2: 验证目录创建**

Run: `ls -la .github/`
Expected: 看到 `workflows` 目录

**Step 3: Commit**

```bash
git add .github/
git commit -m "chore: create GitHub workflows directory"
```

---

## Task 2: 创建主 CI 工作流文件

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: 编写 CI 工作流文件**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v4
        with:
          version: "latest"

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: uv sync --dev

      - name: Run ruff lint
        run: uv run ruff check app/

      - name: Run ruff format check
        run: uv run ruff format --check app/

      - name: Run unit tests
        run: uv run pytest ../tests/unit -v --tb=short

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Run unit tests
        run: npm run test:run

  docs:
    runs-on: ubuntu-latest
    needs: [backend, frontend]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check documentation updates
        run: |
          # Skip if [skip-docs] in commit message
          if git log --oneline -1 | grep -q '\[skip-docs\]'; then
            echo "Skipping docs check due to [skip-docs] flag"
            exit 0
          fi

          # Get changed files
          if [ "${{ github.event_name }}" = "pull_request" ]; then
            CHANGED_FILES=$(git diff --name-only origin/main...HEAD)
          else
            CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD)
          fi

          echo "Changed files:"
          echo "$CHANGED_FILES"

          # Check if code changed but CHANGELOG not updated
          CODE_CHANGED=$(echo "$CHANGED_FILES" | grep -cE "^(backend/app/|frontend/src/)" || true)
          CHANGELOG_CHANGED=$(echo "$CHANGED_FILES" | grep -c "CHANGELOG.md" || true)

          if [ "$CODE_CHANGED" -gt 0 ] && [ "$CHANGELOG_CHANGED" -eq 0 ]; then
            echo "::error::Code changes detected but CHANGELOG.md was not updated."
            echo "Please update CHANGELOG.md or add [skip-docs] to your commit message."
            exit 1
          fi

          # Check if dependencies changed but README not updated
          DEPS_CHANGED=$(echo "$CHANGED_FILES" | grep -cE "(pyproject.toml|package.json)" || true)
          README_CHANGED=$(echo "$CHANGED_FILES" | grep -c "README.md" || true)

          if [ "$DEPS_CHANGED" -gt 0 ] && [ "$README_CHANGED" -eq 0 ]; then
            echo "::warning::Dependencies changed. Consider updating README.md if there are new requirements."
          fi

          echo "Documentation check passed!"
```

**Step 2: 验证 YAML 语法**

Run: `python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`
Expected: 无错误输出

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat(ci): add main CI workflow with backend, frontend and docs checks"
```

---

## Task 3: 创建 Dependabot 配置

**Files:**
- Create: `.github/dependabot.yml`

**Step 1: 编写 Dependabot 配置**

```yaml
version: 2

updates:
  # Python dependencies
  - package-ecosystem: "pip"
    directory: "/backend"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
      - "backend"
    groups:
      dev-dependencies:
        patterns:
          - "pytest*"
          - "ruff*"
          - "pyright*"
      prod-dependencies:
        patterns:
          - "*"
        exclude-patterns:
          - "pytest*"
          - "ruff*"
          - "pyright*"

  # npm dependencies
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
      - "frontend"
    groups:
      dev-dependencies:
        patterns:
          - "@types/*"
          - "eslint*"
          - "vitest*"
          - "@vitest/*"
          - "@testing-library/*"
          - "typescript*"
      prod-dependencies:
        patterns:
          - "*"
        exclude-patterns:
          - "@types/*"
          - "eslint*"
          - "vitest*"
          - "@vitest/*"
          - "@testing-library/*"
          - "typescript*"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 3
    labels:
      - "dependencies"
      - "ci"
    groups:
      all-actions:
        patterns:
          - "*"
```

**Step 2: 验证 YAML 语法**

Run: `python -c "import yaml; yaml.safe_load(open('.github/dependabot.yml'))"`
Expected: 无错误输出

**Step 3: Commit**

```bash
git add .github/dependabot.yml
git commit -m "feat(ci): add Dependabot configuration for weekly dependency updates"
```

---

## Task 4: 验证 CI 配置

**Files:**
- None (验证步骤)

**Step 1: 检查工作流文件完整性**

Run: `ls -la .github/workflows/ && ls -la .github/dependabot.yml`
Expected: 看到 `ci.yml` 和 `dependabot.yml`

**Step 2: 查看最终状态**

Run: `git status`
Expected: 工作区干净，所有文件已提交

**Step 3: 推送到远程（手动）**

当准备好后，运行：
```bash
git push origin main
```

然后访问 GitHub 仓库的 Actions 页面查看 CI 运行状态。

---

## 实现文件清单

| 文件 | 操作 | 描述 |
|------|------|------|
| `.github/workflows/ci.yml` | 创建 | 主 CI 工作流 |
| `.github/dependabot.yml` | 创建 | 依赖更新配置 |

## 预期结果

1. 每次 PR 到 main 分支会自动运行：
   - 后端：ruff lint + format check + 单元测试
   - 前端：eslint + build + 单元测试
   - 文档：检查代码变更时是否更新 CHANGELOG

2. 每周一上午 9:00 Dependabot 自动检查依赖更新并创建 PR

3. 文档检查支持 `[skip-docs]` 跳过机制
