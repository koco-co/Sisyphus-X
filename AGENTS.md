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

- 每次仅提交一个最小功能改动点（atomic commit），禁止混合无关变更。
- Commit message 格式必须为：`<emoji> <type>(<scope>): <description>`
- 推荐类型：
  - `🔧 chore`: 配置/依赖
  - `✨ feat` / `🐛 fix`: 功能/修复
  - `♻️ refactor`: 重构
  - `✅ test`: 测试与用例
  - `📝 docs`: 文档
  - `💄 style`: 样式与资源
- 提交前自动执行最小必要校验（lint/test 仅针对受影响范围）。
- Push 前自动清理临时产物与缓存（不影响源码），并确保工作区干净。

## 项目运行命令

./sisyphus_init.sh # 启动所有服务 (Docker 中间件 + 后端 + 前端)
./sisyphus_init.sh start --backend --debug # 仅启动后端并前台流式输出
./sisyphus_init.sh start --frontend --debug # 仅启动前端并前台流式输出
