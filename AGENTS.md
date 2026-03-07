# Repository Guidelines

## 项目结构与模块组织

本仓库采用前后端分离结构。`frontend/` 为 Vite + React + TypeScript 前端，核心代码在 `frontend/src/`，端到端测试在 `frontend/e2e/`。`backend/` 为 FastAPI 服务，业务代码位于 `backend/app/`，数据库迁移在 `backend/alembic/`。统一测试目录在 `tests/`，其中 `unit/` 为单元测试，`interface/` 为接口测试，`e2e/` 与 `auto/` 包含 Playwright 自动化脚本。设计文档和实施方案集中在 `docs/`。

## 构建、测试与开发命令

优先使用项目脚本：`./sisyphus_init.sh install` 安装依赖，`./sisyphus_init.sh start` 启动前后端与中间件，`./sisyphus_init.sh lint` 执行检查，`./sisyphus_init.sh test --all` 运行全量测试。

按子项目单独开发时：前端在 `frontend/` 下使用 `npm run dev`、`npm run build`、`npm run lint`、`npm run test:run`、`npm run test:e2e`；后端在 `backend/` 下使用 `uv run uvicorn app.main:app --reload` 启动服务，使用 `uv run pytest` 执行测试。

## 代码风格与命名约定

前端遵循 ESLint Flat Config，使用 TypeScript、React Hooks 和函数组件；缩进保持 2 空格，组件文件与页面组件使用 `PascalCase`，hooks 与工具函数使用 `camelCase`。后端基于 Python 3.12，使用 Ruff 与 Pyright；行宽以 `backend/pyproject.toml` 中的 100 为准，模块与函数采用 `snake_case`，类名使用 `PascalCase`。

## 测试规范

Python 测试由 Pytest 驱动，文件命名为 `test_*.py`，建议按功能放入 `tests/unit/` 或 `tests/interface/`。前端单测使用 Vitest，推荐命名为 `*.test.ts` 或 `*.test.tsx`。端到端测试使用 Playwright，放在 `frontend/e2e/` 或 `tests/e2e/`。提交前至少运行与改动直接相关的测试，再视影响范围补充全量验证。

## 提交与 Pull Request 规范

Git 历史采用 Conventional Commits 风格，如 `feat: ...`、`fix: ...`、`docs: ...`、`chore: ...`；必要时可加作用域，例如 `feat(sisyphus_init): ...`。PR 应说明变更目的、主要改动、验证方式，并关联对应任务或问题；涉及 UI 或交互改动时，请附截图或录屏。

## 配置与安全提示

本地配置优先参考 `.env.example` 与 README，不要提交真实密钥、令牌或数据库凭据。测试产物、报告目录和本地缓存应保持忽略状态，避免把 `playwright-report/`、`test-results/`、`.venv/` 等开发环境文件纳入提交。

## Git Commit & Push Convention

- 必须采用智能原子化提交：每次仅提交一个最小改动点，禁止将无关改动混入同一个 commit。
- Commit message 固定格式：`<emoji> <type>(<scope>): <description>`。
- 推荐类型映射：
  - `🔧 chore`：配置、依赖、脚本、CI 调整
  - `✨ feat`：新功能实现
  - `🐛 fix`：缺陷修复
  - `♻️ refactor`：不改变行为的重构
  - `✅ test`：测试脚本、测试数据、回归用例
  - `📝 docs`：文档更新
  - `💄 style`：样式、UI 资源、纯展示调整
- 默认按以下顺序拆分 commit（按存在的改动点择需执行）：
  1. `🔧 chore` 配置与依赖
  2. `✨ feat` / `🐛 fix` 功能与修复
  3. `♻️ refactor` 重构
  4. `✅ test` 测试与数据
  5. `📝 docs` 文档
  6. `💄 style` 样式与静态资源
- 提交前校验：仅运行受影响范围的最小必要检查（lint/test/build），确保结果可复现。
- Push 前清理：自动清理临时产物与缓存（如 `playwright-report/`、`test-results/`、`.pytest_cache/`、`.mypy_cache/`、`__pycache__/`），不得删除源码与业务数据。
- 提交后要求：工作区保持干净（`git status` 无待提交内容）再执行 push。
- 目标：保证每个 commit 可独立回滚、可独立审阅、可独立追踪。

## 项目运行命令

./sisyphus_init.sh # 启动所有服务 (Docker 中间件 + 后端 + 前端)
./sisyphus_init.sh start --backend --debug # 仅启动后端并前台流式输出
./sisyphus_init.sh start --frontend --debug # 仅启动前端并前台流式输出

# 项目开发规范

## 代码风格

开发范式和代码风格遵循 Google Style，注释使用中文。

## 提交前检查

每次提交前, 检查是否需要更新以下文档: README.md、CHANGELOG.md、CLAUDE.md、AGENTS.md。

如果存在需求变更、新增时, 更新需求文档: docs/Sisyphus-X需求文档.md。
