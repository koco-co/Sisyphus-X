# 清理与文档更新设计

> 设计日期: 2026-03-05  
> 方案: 方案 A — 分层清理 + 文档重写优先 + 脚本增强

---

## 1. 目标

- **清理旧文件**: 删除项目中的测试产物、废弃脚本、过时文档引用
- **更新文档**: README、CHANGELOG、CLAUDE.md 与当前实现保持一致
- **脚本增强**: `sisyphus_init.sh` 增加 `--debug` 参数，支持前台流式日志

---

## 2. 清理范围

### 2.1 测试产物（可删除）

| 路径 | 说明 |
|------|------|
| `playwright-report-verification/` | 根目录 Playwright 报告产物 |
| `frontend/playwright-report-verification/` | 前端 Playwright 报告产物 |
| `tests/playwright-report-verification/` | 测试目录 Playwright 报告产物 |
| `tests/auto/test-results/` | 自动化测试结果（含 `.last-run.json`） |
| `frontend/tests/e2e/test-results/` | 前端 E2E 测试截图等 |
| `.test-state/` | 测试状态快照 |

**保留**: `tests/auto/.gitignore` 若已忽略 `test-results/`，则目录可删；清理后 `.gitignore` 确保这些路径被忽略。

### 2.2 废弃脚本（需确认后删除）

| 路径 | 说明 |
|------|------|
| `scripts/run-e2e-full.sh` | 若已被 `sisyphus_init.sh test --auto` 替代则删除 |

### 2.3 文档与代码

- **文档**: 不删除文件，仅更新内容（见第 3 节）
- **代码**: 架构已清理（v2 已删、引擎已内嵌），本次不涉及代码删除

---

## 3. 文档更新

### 3.1 README.md

- 保持现有结构，微调：
  - 确认「引擎」描述为内嵌（`backend/app/engine/`），非独立 PyPI 包
  - 开发命令中的引擎部分：改为「内嵌引擎，通过 Python API 调用」，移除 `sisyphus-api-engine --case` CLI 示例（或标注为「可选，若单独安装引擎」）
  - 项目管理脚本增加 `--debug` 说明

### 3.2 CHANGELOG.md

- 将 `[Unreleased]` 中已完成项整理为正式版本条目
- 移除重复或过时描述
- 新增本次清理与文档更新条目

### 3.3 CLAUDE.md

- 已描述内嵌引擎，需核对：
  - 移除所有「sisyphus-api-engine 独立 PyPI 包」表述
  - 统一为「内嵌于 backend/app/engine/」
  - 增加 `--debug` 启动说明

---

## 4. 脚本增强：`--debug`

### 4.1 行为

当执行 `./sisyphus_init.sh start --debug` 时：

- **中间件**: 保持现有行为（后台启动，日志写入 `infra.log`）
- **后端**: 前台运行，stdout/stderr 同时：
  1. 实时打印到终端（流式输出）
  2. 通过 `tee` 追加写入 `logs/backend.log`
- **前端**: 同上，流式输出 + `tee` 写入 `logs/frontend.log`

### 4.2 实现要点

- 解析 `start` 子命令的 `--debug` 参数
- `start_backend` / `start_frontend` 根据全局变量 `SISYPHUS_DEBUG` 分支：
  - `SISYPHUS_DEBUG=1`: 使用 `tee -a "$LOG_DIR/xxx.log"` 替代 `nohup ... > log 2>&1 &`
  - 前台进程，不写 pid 文件；`stop` 时通过端口查找进程终止
- `help` 中增加 `start --debug` 说明

### 4.3 约束

- `--debug` 仅对 `start` 生效
- `restart --debug` 等价于 `stop` + `start --debug`

---

## 5. 验收标准

1. 上述测试产物目录删除后，`./sisyphus_init.sh test --all` 仍可正常运行
2. README、CHANGELOG、CLAUDE.md 无过时内容，引擎描述统一为内嵌
3. `./sisyphus_init.sh start --debug` 可前台流式输出后端/前端日志，且日志文件同步更新
4. `./sisyphus_init.sh help` 展示 `--debug` 用法
