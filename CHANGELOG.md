# Changelog

All notable changes to SisyphusX will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### ✨ 接口管理模块重构 - Phase 1 (后端)

#### 🎯 核心功能

- **环境管理服务**
  - ✨ 完整的 CRUD 操作
  - 🔁 环境克隆功能
  - 🔍 变量替换预览 API

- **cURL 命令解析器**
  - 📥 支持 cURL 命令导入
  - 🔍 自动检测认证类型（Bearer/API Key/Basic Auth）
  - 📝 解析 Headers/Params/Body

- **变量替换引擎**
  - 🔧 环境变量 `{{变量名}}` 替换
  - ⚙️ 系统变量 `{{$timestamp}}` 等
  - 🔄 支持嵌套变量替换

- **测试用例生成器**
  - 📋 从接口生成 YAML 测试用例
  - 🐍 生成 Python 关键字文件
  - ✅ 自动生成默认断言

#### 📊 数据库变更

- **新增表**
  - `interfacehistory` - 接口请求历史记录
  - `interfacetestcase` - 测试用例管理

- **扩展表**
  - `interface` - 添加 `order`, `auth_config` 字段
  - `interfacefolder` - 添加 `order` 字段
  - `projectenvironment` - 添加 `is_preupload` 字段

#### 🔌 API 接口扩展

- **环境管理** (`/api/v1/environments/`)
  - `GET /` - 列出环境
  - `POST /` - 创建环境
  - `GET /{id}` - 获取环境详情
  - `PUT /{id}` - 更新环境
  - `DELETE /{id}` - 删除环境
  - `POST /{id}/copy` - 克隆环境
  - `POST /{id}/replace` - 变量替换

- **接口历史** (`/api/v1/interfaces/`)
  - `GET /{id}/history` - 获取历史记录（分页）
  - `DELETE /history/{id}` - 删除历史条目
  - `DELETE /{id}/history` - 清空历史

- **接口增强**
  - `POST /parse-curl` - 解析 cURL 命令
  - `POST /{id}/generate-test-case` - 生成测试用例
  - `POST /{id}/preview-yaml` - 预览 YAML
  - `PUT /{id}/move` - 移动接口到其他文件夹
  - `POST /{id}/copy` - 复制接口

#### 🧪 测试覆盖

- ✅ 变量替换引擎：29/29 测试通过
- ⚠️ cURL 解析器：20/21 测试通过（1个非关键测试待修复）
- 📝 测试文件：
  - `tests/unit/backend/services/test_variable_replacer.py`
  - `tests/unit/backend/services/test_curl_parser.py`

#### 🛠️ 代码质量

- ✅ Ruff 检查通过（所有问题已修复）
- ✅ 类型注解更新为现代语法 (`X | None`)
- ✅ 导入顺序规范化
- ✅ SQLModel tablename 类型警告已抑制

#### 📚 文档

- 📝 代码审查报告：`docs/interface-refactor/code_review_report.md`
- 📋 任务清单：`docs/interface-refactor/02_任务清单.md`
- 📄 需求文档：`docs/interface-refactor/01_需求文档.md`

---

### 🎉 重大变更 - UV 迁移与代码质量提升

#### 🚀 包管理器现代化

- **从 Conda 迁移到 UV**
  - ⚡ 依赖安装速度提升 10-100 倍
  - 🔒 使用 uv.lock 实现精确的版本锁定
  - 📦 项目级虚拟环境（.venv/）实现完全隔离
  - 🛠️ 统一的开发工具链

#### 🏗️ 开发工具链重构

- **代码质量工具**
  - ✨ Ruff 0.15+ - 替代 Flake8 + Black + isort
  - 🎯 100x 更快的代码检查和格式化
  - ✅ 修复全部 38 个代码质量问题
  - 📊 代码质量 100% 符合规范

- **类型检查**
  - ✨ Pyright - 替代 mypy
  - 配置为 basic 模式（适合迁移）
  - 发现并记录类型提示问题

- **终端美化**
  - ✨ Rich 库集成
  - 彩色日志输出和进度展示

- **Pre-commit Hooks**
  - ✨ 自动代码质量检查
  - 提交前自动格式化

### 🔧 项目结构优化

#### 目录重构

```
sisyphus-x/
├── backend/          # 后端服务
│   ├── app/         # 应用代码
│   ├── alembic/     # 数据库迁移
│   └── engines/     # 执行引擎
├── frontend/        # 前端应用
│   └── src/         # 源代码
├── tests/           # 测试目录（待填充）
│   └── pytest.ini   # pytest 配置
├── scripts/         # 工具脚本
├── docs/            # 项目文档
├── engines/         # 测试引擎（统一）
└── deploy/          # 部署配置
```

#### 文档优化

- **docs/backend/** - 后端专题文档
  - 开发指南
  - 迁移笔记
  - 迁移计划

### ✨ 新增功能

#### AI 功能增强

- **AI 配置管理系统**
  - 支持多 AI 提供商配置
  - 动态切换默认模型
  - 配置启用/禁用控制

- **智能需求分析**
  - 基于 LangGraph 的多轮对话
  - 自动生成测试用例 YAML
  - 需求澄清和用例生成

#### 开发体验

- **验证脚本**
  - `verify_migration.sh` - 完整的迁移验证
  - `scripts/test_env.sh` - 环境测试
  - `scripts/test_lint.sh` - 代码检查
  - `scripts/test_type.sh` - 类型检查
  - `scripts/test_all.sh` - 综合测试

### 🔧 改进

#### 代码质量

- 修复 38 个 Ruff 代码质量问题：
  - 12 个布尔比较（E712）
  - 5 个导入问题（F401, F821）
  - 2 个裸 except（E722）
  - 2 个异常命名（N818）
  - 2 个方法参数（N805）
  - 4 个 Enum 继承（UP042）
  - 3 个未使用变量（F841）
  - 其他代码规范问题

#### 测试结构

- **统一测试目录**
  - `tests/unit/` - 单元测试
  - `tests/integration/` - 集成测试
  - `tests/e2e/` - 端到端测试
  - 支持 pytest、Playwright 等多种测试框架

### 🐛 Bug 修复

#### 依赖问题

- 修复缺失的 minio 依赖
- 修复缺失的 greenlet 依赖
- 修复缺失的 redis 依赖
- 修复缺失的 aiomysql 依赖

#### 类型注解

- 添加缺失的 `typing.Optional` 导入
- 修复 Pydantic validator 方法参数类型

### 📝 配置变更

#### 新增配置文件

- `backend/pyproject.toml` - UV 项目配置
- `backend/uv.lock` - 依赖版本锁定
- `backend/.python-version` - Python 版本锁定
- `backend/pyrightconfig.json` - Pyright 配置
- `.pre-commit-config.yaml` - Pre-commit 钩子

#### 更新配置文件

- `.gitignore` - 添加 UV、Ruff、Pyright 相关忽略规则

### 📚 文档变更

#### 新增文档

- `docs/backend/DEVELOPMENT.md` - 开发指南
- `docs/backend/MIGRATION_NOTES.md` - 迁移笔记
- `docs/backend/01_MIGRATION_PLAN.md` - 迁移计划
- `CHANGELOG.md` - 变更日志（本文件）

#### 更新文档

- `README.md` - 重组和更新项目说明
- `CLAUDE.md` - 更新启动命令为 UV

---

## [0.1.0] - 2026-01-15

### ✨ 初始版本

#### 核心功能

- **项目管理**
  - 项目 CRUD 操作
  - 多环境配置
  - 数据源管理

- **接口自动化测试**
  - 可视化用例编辑器
  - YAML 格式测试定义
  - 多步骤类型支持
  - 实时执行和结果展示

- **场景编排**
  - 基于 ReactFlow 的工作流编辑
  - 可视化执行展示
  - 场景复用

- **AI 功能**
  - 智能需求分析
  - AI 用例生成
  - 多模型支持（OpenAI、Anthropic）

#### 技术栈

- **前端**: React 19 + TypeScript + Vite + Tailwind CSS
- **后端**: FastAPI + SQLModel + PostgreSQL
- **AI**: LangChain + LangGraph
- **包管理**: Conda → UV（本版本迁移）
- **测试**: Pytest

#### 文档

- 基础 README.md
- CLAUDE.md - AI 助手指南
- AGENTS.md - Agent 开发规范

---

## 版本说明

### 版本号规则

- **主版本号 (Major)**: 不兼容的 API 变更
- **次版本号 (Minor)**: 向下兼容的功能新增
- **修订号 (Patch)**: 向下兼容的问题修复

### 变更类型

- ✨ **新增** (Added): 新功能
- 🔧 **改进** (Changed): 现有功能的改进
- 🐛 **修复** (Fixed): Bug 修复
- 🗑️ **删除** (Removed): 功能删除
- ⚠️ **废弃** (Deprecated): 即将删除的功能
- 🧪 **实验性** (Experimental): 实验性功能

### 提交类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响逻辑）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具变更

---

## 链接

- [Git仓库](https://github.com/your-org/sisyphus-x)
- [问题追踪](https://github.com/your-org/sisyphus-x/issues)
- [API 文档](http://localhost:8000/docs)

---

**最后更新**: 2026-02-11
