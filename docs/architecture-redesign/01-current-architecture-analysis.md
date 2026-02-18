# 当前架构分析报告

> **生成时间**: 2025-02-17
> **分析范围**: Sisyphus-X 项目完整架构
> **分析专家**: 架构分析专家

---

## 📊 执行摘要

Sisyphus-X 是一个 AI 驱动的企业级自动化测试平台,当前采用传统的三层架构。整体架构清晰但存在明显的可维护性、可测试性和扩展性问题。

**关键发现**:
- ✅ 技术选型现代且合理 (FastAPI + React 19 + Vite)
- ⚠️ 后端缺少领域层,业务逻辑分散
- ⚠️ 前端按类型组织,模块化程度不足
- ❌ 测试目录结构缺失 (tests_white/ 和 tests_black/ 不存在)
- ⚠️ 存在 13 个冗余/备份文件需清理

---

## 🗂️ 1. 后端架构分析

### 1.1 当前目录结构

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py
│   │       │   ├── projects.py
│   │       │   ├── interfaces.py
│   │       │   ├── api_test_cases.py
│   │       │   ├── scenarios.py
│   │       │   ├── ai.py
│   │       │   ├── requirements.py
│   │       │   └── test_case_knowledge.py
│   │       └── api.py                    # 路由注册
│   ├── core/
│   │   ├── config.py                     # Pydantic Settings
│   │   ├── db.py                         # 数据库连接
│   │   └── security.py                   # JWT、密码哈希
│   ├── middleware/
│   │   └── cors.py                       # CORS 中间件
│   ├── models/
│   │   ├── project.py                    # Project、Environment、Datasource
│   │   ├── api_test_case.py              # ApiTestCase、Step、Assertion
│   │   ├── ai_conversation.py            # AIConversation、Message
│   │   ├── requirement.py                # TestRequirement
│   │   ├── test_case_knowledge.py        # TestCaseKnowledge
│   │   ├── functional_test_case.py       # FunctionalTestCase
│   │   ├── scenario.py                   # Scenario、ScenarioNode
│   │   └── user.py                       # User
│   ├── schemas/
│   │   ├── project.py
│   │   ├── api_test_case.py
│   │   ├── ai_conversation.py
│   │   ├── requirement.py
│   │   ├── test_case_knowledge.py
│   │   ├── functional_test_case.py
│   │   ├── scenario.py
│   │   └── user.py
│   ├── services/
│   │   ├── ai/
│   │   │   ├── clarifier.py              # 需求澄清服务
│   │   │   ├── generator.py              # 用例生成服务
│   │   │   └── graph_builder.py          # LangGraph 编排
│   │   ├── execution/
│   │   │   ├── api_executor.py           # API 测试执行
│   │   │   └── scenario_executor.py      # 场景执行
│   │   ├── project_service.py
│   │   ├── interface_service.py
│   │   └── test_case_service.py
│   ├── tasks/
│   │   └── background_tasks.py           # 后台任务
│   └── utils/
│       ├── yaml_parser.py
│       └── validators.py
├── engines/
│   └── Sisyphus-api-engine/
│       ├── keywords/
│       └── executor.py
├── tests/
│   ├── api/
│   ├── models/
│   └── services/
├── alembic/
│   ├── versions/
│   │   └── .archive/
│   └── env.py
├── migrations/
│   └── performance/
├── logs/
├── alembic.ini
├── pyproject.toml
└── main.py
```

### 1.2 架构特点

**✅ 优点**:
1. **分层清晰**: API → Services → Models 职责分明
2. **异步优先**: 全面使用 async/await
3. **类型安全**: Pydantic schemas + SQLModel 类型注解
4. **依赖注入**: FastAPI Depends 机制
5. **现代化工具**: UV 包管理器、Alembic 迁移

**⚠️ 问题**:
1. **缺少领域层**
   - 业务逻辑散落在 `services/` 和 `endpoints/` 中
   - 无明确的实体和值对象概念
   - 业务规则与基础设施耦合

2. **无仓储抽象**
   - 直接使用 SQLModel 操作数据库
   - 难以进行单元测试 (无法 mock)
   - 违反依赖倒置原则

3. **服务层混乱**
   - `services/ai/` 和 `services/execution/` 职责不清
   - 缺少明确的用例编排层
   - 服务之间直接调用,耦合度高

4. **AI 服务耦合**
   - LangGraph/LLM 逻辑混在业务服务中
   - 难以切换 AI 提供商
   - 缺少统一的 AI Gateway

### 1.3 代码示例 - 当前问题

**问题 1: 业务逻辑在 Endpoint 中**

```python
# backend/app/api/v1/endpoints/projects.py
@router.post("/{project_id}/environments")
async def create_environment(
    project_id: int,
    data: EnvironmentCreate,
    session: AsyncSession = Depends(get_session)
):
    # ❌ 业务验证逻辑应该在领域层
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # ❌ 数据转换逻辑混在一起
    environment = Environment(**data.model_dump(), project_id=project_id)
    session.add(environment)
    await session.commit()
    await session.refresh(environment)

    return environment
```

**问题 2: 直接使用 ORM,无仓储抽象**

```python
# backend/app/services/project_service.py
class ProjectService:
    def __init__(self, session: AsyncSession):
        self.session = session  # ❌ 直接依赖数据库

    async def get_project(self, project_id: int) -> Project:
        # ❌ 无法 mock,难以测试
        return await self.session.get(Project, project_id)

    async def update_project(
        self,
        project_id: int,
        data: ProjectUpdate
    ) -> Project:
        # ❌ 数据库操作细节暴露
        project = await self.session.get(Project, project_id)
        if project:
            for key, value in data.model_dump(exclude_unset=True).items():
                setattr(project, key, value)
            await self.session.commit()
            await self.session.refresh(project)
        return project
```

**问题 3: AI 服务与业务逻辑耦合**

```python
# backend/app/services/ai/generator.py
class TestCaseGenerator:
    def __init__(self, session: AsyncSession):
        self.session = session  # ❌ 混合数据访问和AI生成
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def generate_test_cases(self, requirement_id: int):
        # ❌ 业务逻辑 + AI调用 + 数据访问混在一起
        requirement = await self.session.get(TestRequirement, requirement_id)

        prompt = self._build_prompt(requirement)
        response = await self.client.messages.create(...)

        # ❌ 直接写数据库
        for case_data in response.content:
            test_case = ApiTestCase(**case_data)
            self.session.add(test_case)

        await self.session.commit()
```

---

## 🎨 2. 前端架构分析

### 2.1 当前目录结构

```
frontend/src/
├── api/
│   └── client.ts                           # Axios 客户端 + 拦截器
├── components/
│   ├── business/                           # 业务组件
│   │   ├── ProjectCard.tsx
│   │   ├── TestCaseList.tsx
│   │   └── ScenarioEditor.tsx
│   ├── common/                             # 通用组件
│   │   ├── EmptyState.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── Pagination.tsx
│   ├── examples/                           # 示例组件 (TODO: 删除?)
│   ├── execution/                          # 执行相关组件
│   ├── keyword/                            # 关键字组件
│   ├── layout/                             # 布局组件
│   │   ├── AppShell.tsx
│   │   └── Navigation.tsx
│   ├── testcase/                           # 测试用例组件
│   └── ui/                                 # shadcn/ui 基础组件
│       ├── button.tsx
│       ├── input.tsx
│       ├── dialog.tsx
│       └── ...
├── pages/                                  # 页面组件 (过于扁平)
│   ├── api-automation/
│   │   ├── components/
│   │   └── utils/
│   ├── auth/
│   │   └── Login.tsx
│   ├── cases/
│   ├── environments/
│   ├── functional-test/
│   ├── global-params/
│   ├── interface/
│   │   ├── InterfaceEditor.tsx
│   │   └── components/
│   ├── interface-management/
│   │   ├── components/
│   │   ├── dialogs/
│   │   ├── hooks/
│   │   └── utils/
│   ├── keywords/
│   ├── plans/
│   ├── reports/
│   └── scenario/
│       ├── editor/
│       └── ScenarioFlow.tsx
├── config/
│   └── index.ts
├── contexts/
│   └── AuthContext.tsx
├── hooks/
│   ├── useDebounce.ts
│   └── useToast.ts
├── i18n/
│   └── locales/
│       ├── en.json
│       └── zh.json
├── lib/
│   └── utils.ts
├── stores/                                 # ⚠️ 状态管理职责不清
├── test/
├── types/
│   └── index.ts
├── App.tsx
└── main.tsx
```

### 2.2 架构特点

**✅ 优点**:
1. **组件分类清晰**: business/common/ui 分层合理
2. **状态管理现代化**: React Query + Context API
3. **类型安全**: TypeScript 严格模式
4. **API 客户端统一**: 单一 Axios 实例 + 拦截器
5. **现代构建工具**: Vite + HMR

**⚠️ 问题**:
1. **按类型组织**
   - components/ 按类型 (business/common/ui) 组织
   - pages/ 按功能页面组织
   - 缺少统一的功能域划分
   - 难以实现功能模块的独立性

2. **pages/ 过于扁平**
   - 12+ 个页面目录平铺
   - 缺少 widgets/features 分层
   - 大型页面组件过于复杂

3. **状态管理混乱**
   - stores/ 目录存在但内容不明确
   - contexts/ 和 stores/ 职责重叠
   - React Query、Context、useState 使用边界不清

4. **缺少共享层设计**
   - lib/ 和 hooks/ 过于简单
   - 缺少明确的 shared/ 概念
   - 配置、API、工具函数分散

### 2.3 代码示例 - 当前问题

**问题 1: 页面组件过于复杂**

```typescript
// frontend/src/pages/scenario/ScenarioFlow.tsx
export function ScenarioFlow() {
  // ❌ 800+ 行巨型组件
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // ❌ 多种状态管理方式混用
  const { data: scenarios } = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => scenariosApi.list()
  });

  const { user } = useAuth();  // Context
  const [isOpen, setIsOpen] = useState(false);  // Local state

  // ❌ 业务逻辑混在组件中
  const handleAddNode = (type: string) => {
    const newNode = createNode(type);
    setNodes([...nodes, newNode]);
    if (type === 'api-test') {
      // 验证逻辑...
    }
  };

  return (// ❌ 渲染逻辑 300+ 行);
}
```

**问题 2: 缺少功能模块化**

```typescript
// 当前结构: 按类型分散
components/business/ProjectCard.tsx          // 项目卡片
components/business/TestCaseList.tsx         // 测试用例列表
components/execution/TestExecutor.tsx        // 测试执行器
pages/api-automation/TestCaseEditor.tsx      // 用例编辑器
pages/interface/InterfaceEditor.tsx          // 接口编辑器
pages/scenario/ScenarioFlow.tsx              // 场景编排

// ❌ 问题: "测试用例" 相关代码分散在多个目录
// 难以复用、难以维护、难以独立测试
```

**问题 3: API 调用分散**

```typescript
// ❌ 在组件中直接调用 API
const { data } = useQuery({
  queryKey: ['projects'],
  queryFn: async () => {
    const response = await axios.get('/api/v1/projects');
    return response.data;
  }
});

// ❌ 或者在页面中定义 hooks
const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => axios.get('/api/v1/projects')
  });
};

// ⚠️ 缺少统一的功能级 hooks 层
```

---

## 🧪 3. 测试架构分析

### 3.1 当前测试结构

```
tests_white/     # ❌ 不存在
tests_black/     # ❌ 不存在

backend/tests/   # ✅ 存在
├── api/
│   ├── test_auth.py
│   ├── test_projects.py
│   └── test_interfaces.py
├── models/
│   └── test_project.py
└── services/
    ├── test_ai_generator.py
    └── test_project_service.py
```

### 3.2 架构问题

**❌ 缺少测试目录**:
- `tests_white/` (白盒测试) 不存在
- `tests_black/` (黑盒测试) 不存在
- 后端测试混在 `backend/tests/` 中

**⚠️ 测试组织问题**:
1. 无明确的单元测试/集成测试区分
2. 缺少 E2E 测试目录
3. fixture 和测试数据管理混乱
4. 测试覆盖率未达 80%

**❌ 缺少测试基础设施**:
- 无统一的 fixture 管理
- 无测试配置文件
- 无 CI/CD 测试集成配置

---

## 🗑️ 4. 冗余文件分析

### 4.1 Git 已删除文件 (待清理)

```bash
# 从 git status 中识别
docs/README.md                                    # 已删除,可清理
docs/产品路线图.md                                 # 已删除,可清理
docs/任务规划.json.bak                            # 已删除,可清理
docs/任务规划.json.bak-20260217-200643            # 已删除,可清理
docs/任务规划.json.old                            # 已删除,可清理
docs/功能状态跟踪.md                              # 已删除,可清理
docs/遗留问题.md                                   # 已删除,可清理
docs/架构检查报告.md                              # 已删除,可清理
```

**清理建议**: 这些文件已在 git 中标记为删除,可以安全提交删除。

### 4.2 备份文件 (*.bak)

```bash
# 后端备份文件
backend/tests/models/test_project.py.bak
backend/app/api/v1/endpoints/interface_folders.py.bak
backend/app/api/v1/endpoints/interfaces.py.bak
backend/app/api/v1/endpoints/environments.py.bak

# 前端备份文件
frontend/src/pages/interface/InterfaceEditor.tsx.bak
```

**清理建议**: 这些是开发过程中的备份文件,可以安全删除。

### 4.3 临时文件

- ✅ 未发现 *.tmp、*.old 文件
- ✅ 项目整体较干净

---

## 📋 5. 架构问题汇总

### 5.1 后端问题

| 问题 | 严重性 | 影响 |
|------|--------|------|
| 缺少领域层 | 🔴 高 | 业务逻辑分散,难以维护 |
| 无仓储抽象 | 🔴 高 | 难以测试,违反依赖倒置 |
| 服务层混乱 | 🟡 中 | 耦合度高,职责不清 |
| AI 服务耦合 | 🟡 中 | 难以切换 AI 提供商 |

### 5.2 前端问题

| 问题 | 严重性 | 影响 |
|------|--------|------|
| 按类型组织 | 🟡 中 | 模块化程度不足 |
| pages/ 过于扁平 | 🟡 中 | 组件过于复杂 |
| 状态管理混乱 | 🟡 中 | 职责不清,易出错 |
| 缺少共享层设计 | 🟢 低 | 复用性不足 |

### 5.3 测试问题

| 问题 | 严重性 | 影响 |
|------|--------|------|
| 测试目录缺失 | 🔴 高 | 无法组织测试 |
| 测试分类不清 | 🟡 中 | 覆盖率不足 |
| 缺少测试基础设施 | 🟡 中 | 测试效率低 |

---

## ✅ 6. 改进建议

### 6.1 后端 - Clean Architecture

**目标**:
- ✅ 实现领域层独立
- ✅ 引入仓储抽象
- ✅ 明确用例编排层
- ✅ AI 服务解耦

**分层设计**:
```
domain/         # 领域层 (entities, value_objects, interfaces)
use_cases/      # 用例层 (application business rules)
adapters/       # 适配器层 (repositories, controllers, gateways)
infrastructure/ # 基础设施层 (database, config, logging)
```

### 6.2 前端 - Feature-Sliced Design

**目标**:
- ✅ 按功能域组织
- ✅ 引入 widgets/features 分层
- ✅ 明确状态管理边界
- ✅ 统一共享层设计

**分层设计**:
```
pages/     # 页面层 (route-specific)
widgets/   # 组合组件 (reusable compositions)
features/  # 业务功能 (self-contained features)
entities/  # 业务实体 (domain models)
shared/    # 共享资源 (ui, lib, config, api)
```

### 6.3 测试 - 分层组织

**目标**:
- ✅ 建立 tests_white/ 和 tests_black/
- ✅ 明确单元/集成/E2E 测试边界
- ✅ 统一 fixture 和测试数据管理
- ✅ 达到 80%+ 覆盖率

**分层设计**:
```
tests_white/
├── unit/         # 单元测试
├── integration/  # 集成测试
└── api/          # API 接口测试

tests_black/
├── e2e/          # E2E 测试 (Playwright)
├── functional/   # 功能测试
└── test-data/    # 测试数据
```

---

## 🎯 7. 下一步行动

1. ✅ **后端架构师** - 生成 Clean Architecture 详细设计
2. ✅ **前端架构师** - 生成 Feature-Sliced Design 详细设计
3. ✅ **测试架构师** - 生成测试目录结构详细设计
4. ✅ **文件清理专家** - 生成文件清理报告
5. ✅ **技术文档专家** - 汇总生成完整迁移指南

---

**状态**: ✅ 当前架构分析完成,等待详细设计方案...
