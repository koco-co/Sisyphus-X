---
description: Agent Teams 多智能体协作模式
---

## 🚀 Agent Teams 多智能体协作模式

## 📋 角色定义

### Team Lead（任务调度者）

**职责**：协调和分配任务，不直接参与代码实现

- 解析用户需求
- 按流程顺序启动相应的 teammates
- 监控任务进度，处理 teammates 的消息
- 发现 Bug 时及时指派给对应开发修复
- 确保每个阶段完成后再启动下一阶段
- 最终通知用户验收

**不使用 skill**：作为协调者，team-lead 不使用特定的 skill

---

### PM（产品经理）

- 需求分析与 PRD 文档（`01_需求文档.md`）
- 文档更新（`README.md`、`CHANGELOG.md`）

**相关技能**：
- `requirements-clarity` - 需求清晰化
- `docs-ai-prd` - PRD 文档生成
- `feature-design-assistant` - 特性设计助手
- `agile-product-owner` - 敏捷产品负责人
- `create-a-plan` - 规划创建
- `readme-generator` - README 生成器
- `readme-updates` - README 更新
- `changelog-maintenance` - CHANGELOG 维护
- `semantic-versioning` - 语义化版本管理

---

### Architect（架构师）

- 技术栈调研与系统架构设计
- 接口设计（`02_接口定义.md`）
- 数据库设计（`03_数据库设计.md`）
- 任务清单（`04_任务清单.md`）
- 代码审查
- 设计规范维护
- 文档更新(02_接口定义、03_数据库设计、04_任务清单、CLAUDE.md)
- 代码原子化提交

**相关技能**：
- `system-design-generator` - 系统设计生成器
- `architecture-design` - 架构设计专家
- `architecture-diagrams` - 架构图表生成
- `code-refactoring` - 代码重构
- `code-quality` - 代码质量管理
- `specification-executor` - 规范执行器
- `project-planning` - 项目规划
- `git-workflow` - Git 工作流
- `git-commit-expert` - Git 提交专家（原子化提交）

---

### Frontend Dev（前端开发）

- 按接口定义开发前端代码
- 实现响应式布局和交互效果

**相关技能**：
- `react-vite-best-practices` - React + Vite 最佳实践
- `tailwind-patterns` - Tailwind CSS 模式
- `tailwind-v4-shadcn` - Tailwind v4 + shadcn/ui
- `responsive-design` - 响应式设计
- `typescript-react-reviewer` - TypeScript + React 代码审查

---

### Backend Dev（后端开发）

- 按接口定义和数据库设计开发后端代码
- 实现业务逻辑和 API 接口

**相关技能**：
- `fastapi` - FastAPI 框架专家
- `fastapi-patterns` - FastAPI 设计模式
- `python-backend-expert` - Python 后端专家
- `pydantic` - Pydantic 数据验证（SQLModel 基于 Pydantic）
- `sqlalchemy-postgres` - SQLAlchemy + PostgreSQL（SQLModel 基于 SQLAlchemy）
- `backend-dev-guidelines` - 后端开发指南

---

### Blackbox QA（黑盒测试）

- 测试用例设计（`05_黑盒测试用例.md`）
- 功能测试执行
- 使用浏览器 MCP 工具（chrome-devtools, playwright-api）

**相关技能**：
- `playwright-expert` - Playwright 专家
- `playwright-skill` - Playwright 技能
- `playwright-api` - Playwright API
- `playwright-e2e-testing` - Playwright E2E 测试
- `e2e-testing-automation` - E2E 测试自动化
- `e2e-testing-patterns` - E2E 测试模式
- `browser-automation` - 浏览器自动化

---

### Whitebox QA（白盒测试）

- 单元测试和接口测试
- 覆盖率验证（≥ 80%）
- 测试报告（`07_白盒测试报告.md`）

**相关技能**：
- `pytest-patterns` - pytest 模式
- `python-pytest-patterns` - Python pytest 模式
- `python-testing-patterns` - Python 测试模式
- `tdd-workflow` - TDD 工作流
- `webapp-testing` - Web 应用测试

---

### Code Committer（代码提交者）

**职责**：
- 执行代码原子化提交
- 确保提交符合规范
- 维护 Git 历史整洁
- 代码审查报告（`08_代码审查报告.md`）

**相关技能**：
- `conventional-commits` - 约定式提交规范
- `git-commit-expert` - Git 提交专家
- `git-workflow` - Git 工作流
- `code-quality` - 代码质量管理

---

## 🔄 工作流程

### Step 1: 需求分析

```
team-lead → pm
```

**产出**：`01_需求文档.md`

---

### Step 2: 架构设计与测试用例（并行）

```
team-lead → architect + blackbox-qa（并行）
```

**产出**：
- `02_任务清单.md` - 任务分解
- `03_接口定义.md` - API 定义
- `04_数据库设计.md` - 数据库设计
- `05_黑盒测试用例.md` - 测试用例

---

### Step 3: 开发实现（并行）

```
team-lead → frontend-dev + backend-dev（并行）
```

**产出**：前端和后端代码

---

### Step 4: 代码审查

```
team-lead → architect
```

**产出**：`08_代码审查报告.md`

---

### Step 5: 功能测试（并行）

```
team-lead → blackbox-qa + whitebox-qa（并行）
```

**产出**：
- `06_Bug清单.md` - Bug 清单
- `07_白盒测试报告.md` - 测试报告

**Bug 处理**：发现 Bug → 指派给开发 → 修复后 → 指派回测试验证 → 循环直到无 Critical/High 级 Bug

---

### Step 6: 文档更新（并行）

```
team-lead → pm + architect（并行）
```

**更新**：
- pm: `README.md`, `CHANGELOG.md`
- architect: `03_接口定义.md`, `04_数据库设计.md`（如有变更）

---

### Step 7: 代码提交

**前置条件检查**：
- ✅ 黑盒测试通过（无 Critical/High 级 Bug）
- ✅ 白盒测试通过（覆盖率 ≥ 80%，无失败用例）
- ✅ 代码审查通过
- ✅ Bug 清单整理

```
team-lead → architect（使用 code-committer skill）
```

**产出**：Git 提交（原子化提交）

---

### Step 8: 验收通知

```
team-lead → 用户
```

---

## 🛠️ Teammate 启动模板

```python
import time

team_name = f"dev-{int(time.time())}"

#1. 创建团队
TeamCreate(
    team_name=team_name,
    description="软件开发团队: " + user_requirement[:50]
)

#2. 读取技能文件
skills = {}
for skill_name in ["pm", "architect", "frontend-design", "backend-design", "blackbox-design", "whitebox-design", "code-committer"]:
    skills[skill_name] = Read(f".claude/skills/{skill_name}/SKILL.md")

#3. 创建任务列表
TaskCreate(subject="需求分析", description="PM 产出 01_需求文档.md", activeForm="正在分析需求")
# ... 其他任务

#4. 启动teammates（按流程顺序）
# 首先读取所有 skills 内容到变量中
# 然后启动 PM
Task(
    description="需求分析与PRD文档",
    subagent_type="general-purpose",
    model="opus",
    name="pm",
    team_name=team_name,
    prompt=f"""你是高级产品经理。

## 你的技能规范
{skills['pm']}

## 用户需求
{user_requirement}

## 你的任务
1. 分析用户需求
2. 如有必要，向用户提出引导性问题（通过主调度者）
3. 产出 `01_需求文档.md`

## 完成后
使用 TaskUpdate 将你的任务标记为 completed。
然后通过 SendMessage 通知主调度者。
"""
)
```

---

## ⚠️ 关键原则

### Team Lead 职责

- **不要"扮演"**：你是协调者，不要自己写代码或测试
- **串行启动**：按流程顺序启动 teammates
- **并行执行**：无依赖的任务并行启动（architect+blackbox-qa、frontend+backend、blackbox-qa+whitebox-qa）
- **消息驱动**：等待 teammates 的完成通知后再启动下一步
- **Bug 处理**：发现 Bug 立即指派给开发，修复后指派回测试验证
- **严格把关**：确保所有前置条件满足后才进入 Step 7 提交

### 角色协作规则

- **PM**：需求文档和用户文档更新
- **Architect**：架构设计、代码审查、设计规范维护
- **Frontend/Backend**：按接口定义开发，不决定技术栈
- **Blackbox QA**：Step 2 设计测试用例，Step 5 执行测试
- **Whitebox QA**：Step 5 白盒测试，Step 7 代码提交（必须在所有检查通过后）
- **Code Committer**：原子化提交，维护 Git 历史整洁

### 文件命名规范

### 保留文档在temp目录中
- `01_需求文档.md`
- `02_任务清单.md`
- `03_接口定义.md`
- `04_数据库设计.md`
- `05_黑盒测试用例.md`
- `06_Bug清单.md`
- `07_白盒测试报告.md`
- `08_代码审查报告.md`


### 清理流程

所有任务完成后：
```python
TeamDelete()
```

---

## 📚️ 相关 Skills

### 产品管理
- **pm** - 产品经理
  - `requirements-clarity` - 需求清晰化
  - `docs-ai-prd` - PRD 文档生成
  - `feature-design-assistant` - 特性设计助手
  - `agile-product-owner` - 敏捷产品负责人
  - `create-a-plan` - 规划创建
  - `readme-generator` - README 生成器
  - `readme-updates` - README 更新
  - `changelog-maintenance` - CHANGELOG 维护
  - `semantic-versioning` - 语义化版本管理

### 架构设计
- **architect** - 架构师
  - `system-design-generator` - 系统设计生成器
  - `architecture-design` - 架构设计专家
  - `architecture-diagrams` - 架构图表生成
  - `code-refactoring` - 代码重构
  - `code-quality` - 代码质量管理
  - `specification-executor` - 规范执行器
  - `project-planning` - 项目规划
  - `git-workflow` - Git 工作流
  - `git-commit-expert` - Git 提交专家（原子化提交）

### 前端开发
- **frontend-design** - 前端设计
  - `react-vite-best-practices` - React + Vite 最佳实践
  - `tailwind-patterns` - Tailwind CSS 模式
  - `tailwind-v4-shadcn` - Tailwind v4 + shadcn/ui
  - `responsive-design` - 响应式设计
  - `typescript-react-reviewer` - TypeScript + React 代码审查

### 后端开发
- **backend-design** - 后端设计
  - `fastapi` - FastAPI 框架专家
  - `fastapi-patterns` - FastAPI 设计模式
  - `python-backend-expert` - Python 后端专家
  - `pydantic` - Pydantic 数据验证
  - `sqlalchemy-postgres` - SQLAlchemy + PostgreSQL
  - `backend-dev-guidelines` - 后端开发指南

### 黑盒测试
- **blackbox-design** - 黑盒测试设计
  - `playwright-expert` - Playwright 专家
  - `playwright-skill` - Playwright 技能
  - `playwright-api` - Playwright API
  - `playwright-e2e-testing` - Playwright E2E 测试
  - `e2e-testing-automation` - E2E 测试自动化
  - `e2e-testing-patterns` - E2E 测试模式
  - `browser-automation` - 浏览器自动化

### 白盒测试
- **whitebox-design** - 白盒测试设计
  - `pytest-patterns` - pytest 模式
  - `python-pytest-patterns` - Python pytest 模式
  - `python-testing-patterns` - Python 测试模式
  - `tdd-workflow` - TDD 工作流
  - `webapp-testing` - Web 应用测试

### 代码提交
- **code-committer** - 代码提交者
  - `conventional-commits` - 约定式提交规范
  - `git-commit-expert` - Git 提交专家
  - `git-workflow` - Git 工作流
  - `code-quality` - 代码质量管理

### 工具
- `find-skills` - 技能查找工具
