# Sisyphus-X MVP 内部收尾设计文档

> **创建日期**: 2026-03-05
> **目标**: 1–2 周内将 Sisyphus-X 打磨到「团队内部可顺畅自用的 MVP」水平
> **策略**: 体验主线驱动 — 以测试工程师视角按主链路分阶段收尾

---

## 背景

经过全面代码探索和需求文档比对，发现以下关键问题：

1. **后端 v1/v2 双版本并行**: v1（`endpoints/` + `models/`）和 v2（`modules/` + `models_new/`）两套独立 API 体系，前端只连 v1
2. **引擎外置**: `sisyphus-api-engine` 作为独立 PyPI 包通过 subprocess CLI 调用，增加部署复杂度
3. **功能断链**: Plans/Reports 搜索未传 API、v2 执行引擎未对接、Allure 报告未完全实现
4. **超出需求**: 功能测试、文档中心、账号/权限管理等菜单项全部为占位页
5. **UI 不一致**: 分页、Toast、空状态组件未统一；重复组件和路由并存
6. **脚本问题**: `sisyphus_init.sh` 帮助文档过时、参数处理脆弱、测试目录混乱

## 关键决策

| 决策 | 选择 | 理由 |
|------|------|------|
| v1/v2 处理 | 保留 v1，删除 v2 | v1 引擎集成完整、前端已连接、迁移一致；v2 核心执行链路未实现 |
| 引擎集成 | 源码复制到 `backend/app/engine/` | 省去 subprocess 开销，支持直接 Python API 调用，简化部署 |
| 超范围功能 | 加「即将上线」标记 | 保留入口展示完整度，但明确标记为未实现 |

## 引擎集成设计

### 当前调用方式（subprocess CLI）

```
前端参数 → 后端 YAML 生成 → 保存 temp/ → subprocess 调用 CLI → 解析 stdout JSON → 返回前端
```

### 目标调用方式（直接 Python API）

```
前端参数 → 后端 YAML 生成 → load_case(yaml_path) → run_case(case, publisher) → result.model_dump() → 返回前端
```

### 引擎核心接口

- **输入**: `CaseModel`（可从 YAML 文件或 dict 构建）
- **输出**: `ExecutionResult`（Pydantic 模型，可 `.model_dump()` 得到 dict）
- **实时推送**: 通过 `publisher` 参数传入 WebSocket publisher，支持 scenario_start / step_start / step_done / scenario_done 事件

## 五阶段路线图

### 阶段一：架构清理（Day 1–2）

- 删除 v2 代码（`modules/`、`models_new/`、`base_new.py`、main.py v2 路由）
- 内嵌引擎源码到 `backend/app/engine/`
- 替换 subprocess CLI 调用为直接 Python API 调用
- 前端超范围入口加「即将上线」标记

### 阶段二：主链路打通（Day 3–5）

四条核心链路：

1. 项目 → 接口定义 → 调试
2. 场景编排 → 调试
3. 测试计划 → 执行 → 实时报告
4. 测试报告 → 查看历史

### 阶段三：UI 统一 & 信息架构（Day 6–8）

- 修复搜索/筛选失效（Plans、Reports）
- 统一分页（Keywords）、Toast（sonner）、空状态
- 合并重复组件、清理冗余代码

### 阶段四：工程化 & 脚本打磨（Day 9–10）

- 修复 `sisyphus_init.sh` 各项问题
- 统一测试目录
- 更新依赖配置

### 阶段五：文档 & 收尾（Day 11–12）

- 更新 CHANGELOG、CLAUDE.md、开发任务清单
- 记录技术债

## 验收标准

1. 能完成一次完整的「建项目 → 定义接口 → 编排场景 → 创建计划 → 执行 → 查看报告」流程
2. 所有列表页搜索、分页、Toast、空状态风格统一
3. 新环境下 `./sisyphus_init.sh install && ./sisyphus_init.sh start` 一次性启动成功
4. 文档与代码同步
