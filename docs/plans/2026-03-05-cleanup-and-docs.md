# 清理与文档更新实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 清理项目旧文件、更新 README/CHANGELOG/CLAUDE.md、为 sisyphus_init.sh 增加 --debug 前台流式日志模式。

**Architecture:** 分层清理（测试产物 → 废弃脚本）→ 文档重写 → 脚本增强。设计文档见 `docs/plans/2026-03-05-cleanup-and-docs-design.md`。

**Tech Stack:** Bash, Markdown

---

## Task 1: 清理测试产物目录

**Files:**
- Delete: `playwright-report-verification/` (entire dir)
- Delete: `frontend/playwright-report-verification/` (entire dir)
- Delete: `tests/playwright-report-verification/` (entire dir)
- Delete: `tests/auto/test-results/` (entire dir)
- Delete: `frontend/tests/e2e/test-results/` (entire dir, if exists)
- Delete: `.test-state/` (entire dir)
- Modify: `.gitignore` — add `playwright-report-verification/` if not present

**Step 1: 添加 .gitignore 条目**

在 `.gitignore` 的 Test reports 区块中确保包含：
```
playwright-report-verification/
```

**Step 2: 删除测试产物目录**

```bash
rm -rf playwright-report-verification
rm -rf frontend/playwright-report-verification
rm -rf tests/playwright-report-verification
rm -rf tests/auto/test-results
rm -rf frontend/tests/e2e/test-results 2>/dev/null || true
rm -rf .test-state
```

**Step 3: 验证测试仍可运行**

```bash
./sisyphus_init.sh test --unit
```
Expected: 单元测试通过（不要求全量 test --all，避免长时间）

**Step 4: Commit**

```bash
git add .gitignore
git status  # 确认删除的目录已从 git 中移除（若曾被 track）
git commit -m "chore: remove test artifacts (playwright-report-verification, test-results, .test-state)"
```

---

## Task 2: 删除废弃脚本

**Files:**
- Delete: `scripts/run-e2e-full.sh`

**Step 1: 确认脚本可替代**

`sisyphus_init.sh test --auto` 已覆盖 E2E 全流程，`run-e2e-full.sh` 可删除。

**Step 2: 删除文件**

```bash
rm -f scripts/run-e2e-full.sh
```

**Step 3: 若 scripts/ 为空则删除目录**

```bash
[ -d scripts ] && [ -z "$(ls -A scripts 2>/dev/null)" ] && rmdir scripts || true
```

**Step 4: Commit**

```bash
git add -A scripts/
git commit -m "chore: remove deprecated run-e2e-full.sh"
```

---

## Task 3: 更新 README.md

**Files:**
- Modify: `README.md`

**Step 1: 引擎描述统一为内嵌**

在「核心能力」或「技术栈」中，确保引擎描述为：
- 内嵌于 `backend/app/engine/`，非独立 PyPI 包

**Step 2: 开发命令中的引擎部分**

将「引擎 (独立 PyPI 包)」改为「内嵌引擎」：
- 移除或简化 `sisyphus-api-engine --case` CLI 示例
- 说明：引擎已内嵌，通过 `from app.engine.core.runner import load_case, run_case` 调用

**Step 3: 项目管理脚本增加 --debug**

在「开发命令」的 `./sisyphus_init.sh` 示例中增加：
```bash
./sisyphus_init.sh start --debug   # 前台流式输出（后端/前端日志实时打印）
```

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update README (embedded engine, --debug)"
```

---

## Task 4: 更新 CHANGELOG.md

**Files:**
- Modify: `CHANGELOG.md`

**Step 1: 整理 Unreleased 条目**

将 [Unreleased] 中「MVP 内部收尾」等已完成的变更整理为清晰版本条目（如 v0.x.x）。

**Step 2: 新增本次变更**

在 [Unreleased] 中增加：
```markdown
#### 清理与文档
- 删除测试产物目录 (playwright-report-verification, test-results, .test-state)
- 删除废弃脚本 scripts/run-e2e-full.sh
- 更新 README、CLAUDE.md 与当前实现一致
- sisyphus_init.sh 增加 start --debug 前台流式日志模式
```

**Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for cleanup and --debug"
```

---

## Task 5: 更新 CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: 引擎描述**

全文搜索 `sisyphus-api-engine`、`PyPI`、`pip install`，统一为：
- 引擎内嵌于 `backend/app/engine/`
- 通过 `from app.engine.core.runner import load_case, run_case` 调用

**Step 2: 开发命令**

在「项目管理」区块增加：
```bash
./sisyphus_init.sh start --debug   # 前台流式输出（后端/前端日志实时打印 + 写入 logs/）
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md (embedded engine, --debug)"
```

---

## Task 6: 实现 sisyphus_init.sh --debug

**Files:**
- Modify: `sisyphus_init.sh`

**Step 1: 解析 --debug**

在 `cmd_start` 开头解析参数，提取 `--debug` 并设置 `SISYPHUS_DEBUG` 环境变量：

```bash
cmd_start() {
    local target="--all"
    SISYPHUS_DEBUG=0
    while shift 2>/dev/null; do
        case "${1:-}" in
            --debug) SISYPHUS_DEBUG=1 ;;
            --all|--backend|--frontend|--infra) target="$1" ;;
            "") break ;;
        esac
    done
    # ... 原有逻辑，使用 $target
}
```

注意：需要正确处理 `main` 传入的 `$@`。当前 `main` 中 `shift` 只执行一次，`cmd_start` 收到的是 `$@`（即 `shift` 后的剩余参数）。因此 `cmd_start` 内应遍历 `"$@"` 解析 `--debug` 和 `target`。

修正后的解析逻辑：

```bash
cmd_start() {
    local target="--all"
    SISYPHUS_DEBUG=0
    for arg in "$@"; do
        case "$arg" in
            --debug) SISYPHUS_DEBUG=1 ;;
            --all|--backend|--frontend|--infra) target="$arg" ;;
        esac
    done
    # 后续使用 $target
```

**Step 2: 修改 start_backend**

当 `SISYPHUS_DEBUG=1` 时：
- 不使用 `nohup`，前台运行
- 使用 `tee -a "$LOG_DIR/backend.log"` 实现 stdout/stderr 同时输出到终端和文件
- 不写 pid 文件（或写 pid 但 stop 时通过端口查找）

实现示例：

```bash
if [ "${SISYPHUS_DEBUG:-0}" = "1" ]; then
    log_info "🐍 后端 (debug 模式): 前台运行，日志将实时输出..."
    uv run uvicorn app.main:app --reload --host 0.0.0.0 --port $actual_port 2>&1 | tee -a "$LOG_DIR/backend.log"
    # 前台进程结束后直接 return
    return $?
else
    # 原有 nohup 逻辑
    nohup uv run uvicorn ... > "$LOG_DIR/backend.log" 2>&1 &
    ...
fi
```

**Step 3: 修改 start_frontend**

同上，当 `SISYPHUS_DEBUG=1` 时：
- 前台运行 `npm run dev`
- 使用 `tee -a "$LOG_DIR/frontend.log"`

**Step 4: 处理 --debug 时的多服务**

`start --all --debug` 时，后端和前端会顺序阻塞。设计选择：
- **A**: 仅 `--backend` 或 `--frontend` 支持 `--debug`，`--all --debug` 时只启动后端并前台运行（前端需另开终端）
- **B**: `--all --debug` 时先启动后端前台，后台运行前端（需用户 Ctrl+C 停止后端后，前端继续在后台）

推荐 **A**：`--all --debug` 时提示「debug 模式仅支持单一服务，请使用 --backend 或 --frontend」；或实现为 `--all --debug` 仅对第一个服务（backend）前台运行，前端仍后台。

简化实现：`--all --debug` 时，后端前台运行，前端后台运行（用户可先看后端日志，需要时 `tail -f logs/frontend.log`）。

**Step 5: 更新 help**

在 `cmd_help` 的 start 行增加：
```
  start   [--all|--backend|--frontend|--infra] [--debug]
          启动服务 (默认: --all)。--debug 时前台流式输出日志
```

**Step 6: 重启支持**

`cmd_restart` 需将 `--debug` 透传给 `cmd_start`。检查 `cmd_restart` 实现，确保 `cmd_start "$@"` 或 `cmd_start $target` 能传递 `--debug`。

**Step 7: 手动测试**

```bash
./sisyphus_init.sh start --backend --debug
# 终端应实时输出后端日志，Ctrl+C 可停止
./sisyphus_init.sh stop --backend
```

**Step 8: Commit**

```bash
git add sisyphus_init.sh
git commit -m "feat(sisyphus_init): add --debug for foreground streaming logs"
```

---

## 执行顺序

1. Task 1 (清理测试产物)
2. Task 2 (删除废弃脚本)
3. Task 3 (README)
4. Task 4 (CHANGELOG)
5. Task 5 (CLAUDE.md)
6. Task 6 (--debug)

---

## 验收标准

- [ ] 测试产物目录已删除，`.gitignore` 已更新
- [ ] `scripts/run-e2e-full.sh` 已删除
- [ ] README、CHANGELOG、CLAUDE.md 无过时内容，引擎描述统一为内嵌
- [ ] `./sisyphus_init.sh start --backend --debug` 前台流式输出，且 `logs/backend.log` 同步更新
- [ ] `./sisyphus_init.sh help` 展示 `--debug` 用法
