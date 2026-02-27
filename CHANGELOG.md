# Changelog

All notable changes to Sisyphus-X will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Changed

- **引擎抽离**: `sisyphus-api-engine` 从本地子项目 (`Sisyphus-api-engine/`) 抽离为独立 PyPI 包，通过 `uv pip install sisyphus-api-engine` 安装
- **后端依赖**: `backend/pyproject.toml` 新增 `sisyphus-api-engine` 正式依赖
- **引擎文档**: 迁移至 `docs/api-engine/` 目录
- **项目脚本**: `sisyphus_init.sh` 移除本地引擎目录相关逻辑

### Removed

- **本地子项目**: 移除 `Sisyphus-api-engine/` 子目录（已发布为独立 PyPI 包）

## [0.2.0] - 2026-02-25

### Added

- **开发任务清单**: 基于需求文档完成前端(80项)/后端(63项)/引擎(37项)三部分细粒度任务拆分
- **引擎包骨架**: 初始化 `Sisyphus-api-engine/` 独立子项目，包结构重组为 `apirun/` (pyproject.toml + CLI 入口)
**项目管理脚本**: 新增 `sisyphus_init.sh` 统一脚本，支持 start/stop/restart/status/install/lint/test/migrate/logs/clean/help
- **前端环境模板**: 新增 `frontend/.env.example`

### Changed

- **项目结构重组**: 统一目录规范 (前端/后端/引擎三层分离)
- **README.md**: 基于需求文档重写，对齐产品定位为「自动化测试管理平台」
- **CHANGELOG.md**: 重写为 Keep a Changelog 规范格式
- **.env.example**: 重构为统一环境变量参考模板
- **.gitignore**: 优化分组，新增 `*.bak*`/`*.pid`/`allure-*`/`test-results/` 等规则
- **.pre-commit-config.yaml**: Ruff 版本对齐 pyproject.toml

### Removed

- **冗余文件**: 删除根目录 `pytest.ini` (配置已在 `backend/pyproject.toml`)
- **冗余脚本**: 删除 `init.sh` + `stop.sh` (合并为 `sisyphus_init.sh`)
- **重复测试目录**: 删除 `test_white/` (测试统一到 `backend/tests/`)
- **空目录**: 删除 `engines/sisyphus-web-engine/` 和 `engines/sisyphus-app-engine/` (后续需要时创建)
- **备份文件**: 删除 `backend/tests/api/test_interfaces_api.py.bak3~bak7` (5个)
- **临时文档**: 删除 `TEST_FIX_SUMMARY.md`、`BUG_STATUS_UPDATE.md`
- **示例代码**: 删除 `endpoints/examples/`、`components/examples/`、`tooltip.example.md`

### Fixed

- **技术栈描述**: 修正 README 中 React 版本从 19 到 18.2 (与 package.json 一致)
- **Ruff 版本**: 统一 `.pre-commit-config.yaml` 和 `pyproject.toml` 中的 Ruff 版本

---

## [0.1.0] - 2026-01-15

### Added

- **项目管理**: 项目 CRUD、多环境配置、数据源管理
- **接口自动化测试**: 可视化用例编辑器、YAML 格式测试定义、多步骤支持
- **场景编排**: 基于 ReactFlow 的工作流编辑和执行
- **AI 功能**: 智能需求分析、AI 用例生成、多模型支持 (OpenAI/Anthropic)
- **技术栈**: React 18 + TypeScript + Vite + Tailwind CSS / FastAPI + SQLModel + PostgreSQL
- **包管理**: 后端从 Conda 迁移到 UV
- **代码质量**: Ruff (检查+格式化) + Pyright (类型检查) + Pre-commit hooks

---

[Unreleased]: https://github.com/your-org/sisyphus-x/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/your-org/sisyphus-x/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-org/sisyphus-x/releases/tag/v0.1.0
