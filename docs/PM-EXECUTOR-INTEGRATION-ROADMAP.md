# SisyphusX 测试平台 - 执行器集成产品路线图

> **产品定位**：企业级低代码自动化测试平台
> **核心目标**：通过可视化界面降低测试编写门槛，同时保持专业级的扩展能力
> **技术策略**：平台与执行器解耦，通过标准协议集成第三方执行引擎

---

## 📊 产品架构全景图

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户交互层                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │用例编辑器  │  │场景编排器  │  │关键字管理  │  │结果查看器  │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       业务逻辑层（后端）                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │用例管理    │  │场景管理    │  │关键字服务  │  │执行服务    │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      执行器适配层（新增）                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │YAML生成器  │  │参数解析器  │  │关键字注入  │  │结果解析器  │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
│                      ┌────────────┐                              │
│                      │执行调度器  │                              │
│                      └────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    第三方执行引擎                                 │
│              Sisyphus-api-engine (PyPI Package)                  │
│                    ↓ 通过 CLI 调用 ↓                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 核心产品价值主张

### 用户痛点
- ❌ 编写 YAML 测试用例学习成本高
- ❌ 复杂场景难以可视化管理和复用
- ❌ 自定义关键字需要修改代码并重启服务
- ❌ 测试结果不够直观，难以快速定位问题

### 产品解决方案
- ✅ **可视化编辑**：拖拽式创建测试用例，自动生成 YAML
- ✅ **场景编排**：基于工作流的复杂场景编排
- ✅ **动态扩展**：通过界面管理关键字，实时生效无需重启
- ✅ **智能报告**：结构化的测试结果展示和问题定位

---

## 📦 产品功能模块规划

### 模块一：可视化测试用例编辑器 🔧

**用户价值**：降低测试编写门槛，提升效率

**核心功能**：
1. **步骤化编辑界面**
   - 添加测试步骤（HTTP请求、数据库操作、条件判断等）
   - 配置步骤参数（URL、方法、请求体、断言等）
   - 支持步骤拖拽排序和复制

2. **智能表单设计**
   - 根据步骤类型动态渲染表单字段
   - 内置参数校验和错误提示
   - 支持变量引用和环境切换

3. **实时预览**
   - 实时生成 YAML 预览
   - 语法检查和错误高亮
   - 支持手动编辑 YAML（高级模式）

**数据流**：
```
用户操作表单 → 前端收集参数 → 发送到后端 → YAML生成器 → 标准YAML → 保存到数据库
```

---

### 模块二：关键字管理系统 🚀

**用户价值**：无需编码即可扩展测试能力

**核心功能**：
1. **关键字编辑器**
   - Monaco代码编辑器（Python语法高亮）
   - 实时语法检查和错误提示
   - 关键字参数定义（名称、类型、描述）

2. **关键字分类管理**
   - 按项目/分类组织
   - 支持导入导出
   - 版本管理

3. **关键字测试**
   - 在线测试关键字
   - 参数输入和结果查看
   - 执行日志输出

4. **动态注入机制**
   - 启用/禁用关键字
   - 实时生效（无需重启）
   - 安全沙箱执行

**技术架构**：
```
关键字代码 → 保存到数据库 → 执行时动态加载 → 注入到执行器 → exec()执行
```

---

### 模块三：测试执行引擎 ⚡

**用户价值**：可靠、高效的测试执行

**核心功能**：
1. **执行调度**
   - 单次执行/批量执行
   - 定时任务（Cron表达式）
   - 并发控制和资源管理

2. **环境管理**
   - 多环境配置（dev/test/prod）
   - 环境变量管理
   - 动态切换环境

3. **执行监控**
   - 实时执行进度
   - 日志流式输出
   - 执行状态更新

4. **关键字上下文注入**
   - 收集项目活跃关键字
   - 序列化为JSON传递给执行器
   - 执行器动态加载并执行

**数据流**：
```
测试用例(YAML) + 动态关键字(JSON) → 执行调度器 → Sisyphus-api-engine → 执行结果
```

---

### 模块四：结果分析与报告 📊

**用户价值**：快速理解和定位问题

**核心功能**：
1. **执行结果展示**
   - 测试用例级别统计（通过率、耗时）
   - 步骤级别详细结果
   - 失败原因高亮

2. **性能指标**
   - 请求耗时分解（DNS/TCP/首字节/总时间）
   - 资源使用监控
   - 性能趋势分析

3. **日志查看**
   - 结构化日志展示
   - 日志过滤和搜索
   - 错误堆栈追踪

4. **报告导出**
   - HTML/PDF报告
   - JSON原始数据
   - 集成第三方系统（Jira、钉钉）

---

## 🏗️ 技术架构设计

### 新增模块：执行器适配层

**设计目标**：解耦平台与具体执行器的实现，支持多种执行器

**核心组件**：

#### 1. YAML生成引擎（YAMLGenerator）

```python
# backend/app/services/execution/yaml_generator.py

class YAMLGenerator:
    """表单参数 → YAML 文件"""

    def generate_from_form(self, form_data: TestCaseForm) -> str:
        """
        将前端表单数据转换为YAML格式

        Args:
            form_data: {
                "name": "测试用例名称",
                "description": "描述",
                "steps": [
                    {
                        "type": "request",
                        "name": "步骤名称",
                        "url": "/api/users",
                        "method": "POST",
                        "body": {...},
                        "validations": [...]
                    }
                ]
            }

        Returns:
            YAML字符串（符合Sisyphus-api-engine格式）
        """
        pass

    def generate_from_scenario(self, scenario_data: dict) -> str:
        """从场景编排数据生成YAML"""
        pass
```

**前端数据结构示例**：
```typescript
interface TestCaseForm {
  name: string
  description: string
  project_id: number
  environment_id?: number
  steps: TestStep[]
}

interface TestStep {
  id: string
  type: 'request' | 'database' | 'wait' | 'condition' | 'keyword'
  name: string
  params: Record<string, any>
  validations?: Validation[]
}
```

#### 2. 参数解析器（ParameterParser）

```python
# backend/app/services/execution/parameter_parser.py

class ParameterParser:
    """解析和标准化执行参数"""

    def parse_execution_request(
        self,
        test_case: TestCase,
        environment: Environment,
        keywords: List[Keyword]
    ) -> ExecutionRequest:
        """
        解析执行请求，组装完整的执行参数

        Args:
            test_case: 测试用例实例
            environment: 环境配置
            keywords: 动态关键字列表

        Returns:
            ExecutionRequest {
                "yaml_content": "...",
                "base_url": "...",
                "variables": {...},
                "dynamic_keywords": ["def keyword1(): ...", ...]
            }
        """
        # 生成YAML
        yaml_content = self.yaml_generator.generate_from_db(test_case)

        # 注入环境变量
        variables = self._merge_variables(test_case, environment)

        # 收集关键字代码
        dynamic_keywords = [kw.function_code for kw in keywords if kw.is_active]

        return ExecutionRequest(
            yaml_content=yaml_content,
            base_url=environment.domain,
            variables=variables,
            dynamic_keywords=dynamic_keywords
        )
```

#### 3. 关键字注入器（KeywordInjector）

```python
# backend/app/services/execution/keyword_injector.py

class KeywordInjector:
    """关键字动态注入管理"""

    def collect_keywords(
        self,
        project_id: int,
        category: Optional[str] = None
    ) -> List[Keyword]:
        """
        收集项目的活跃关键字

        Args:
            project_id: 项目ID
            category: 可选的分类过滤

        Returns:
            关键字实例列表
        """
        pass

    def validate_keyword_code(self, code: str) -> ValidationResult:
        """验证关键字代码语法和安全性"""
        pass

    def inject_to_executor(self, keywords: List[str]) -> str:
        """
        将关键字代码序列化为JSON，供执行器加载

        Returns:
            JSON字符串，格式：["def kw1(): ...", "def kw2(): ..."]
        """
        pass
```

#### 4. 执行调度器（ExecutionScheduler）

```python
# backend/app/services/execution/execution_scheduler.py

class ExecutionScheduler:
    """测试执行调度器"""

    def __init__(self):
        self.executor_adapter = ExecutorAdapter()

    async def execute_test_case(
        self,
        test_case_id: int,
        environment_id: Optional[int] = None,
        async_mode: bool = False
    ) -> ExecutionResult:
        """
        执行单个测试用例

        Args:
            test_case_id: 测试用例ID
            environment_id: 环境ID（可选）
            async_mode: 是否异步执行

        Returns:
            执行结果
        """
        # 1. 加载测试用例
        test_case = await self.load_test_case(test_case_id)

        # 2. 收集关键字
        keywords = self.keyword_injector.collect_keywords(test_case.project_id)

        # 3. 解析参数
        exec_request = self.param_parser.parse_execution_request(
            test_case, environment, keywords
        )

        # 4. 调用执行器
        if async_mode:
            # 异步执行：提交到任务队列
            task_id = await self.submit_to_queue(exec_request)
            return {"task_id": task_id, "status": "pending"}
        else:
            # 同步执行：直接调用
            result = await self.executor_adapter.execute(exec_request)
            return result

    async def execute_scenario(self, scenario_id: int) -> ExecutionResult:
        """执行场景（工作流）"""
        pass
```

#### 5. 执行器适配器（ExecutorAdapter）

```python
# backend/app/services/execution/executor_adapter.py

import subprocess
import json

class ExecutorAdapter:
    """Sisyphus-api-engine 适配器"""

    EXECUTOR_CMD = "sisyphus-api-engine"

    async def execute(self, request: ExecutionRequest) -> ExecutionResult:
        """
        调用 Sisyphus-api-engine 执行测试

        Args:
            request: ExecutionRequest {
                yaml_content: str,
                base_url: str,
                variables: dict,
                dynamic_keywords: List[str]
            }

        Returns:
            ExecutionResult {
                success: bool,
                test_case: {...},
                steps: [...],
                statistics: {...},
                final_variables: {...}
            }
        """
        # 1. 创建临时YAML文件
        yaml_path = self._create_temp_file(request.yaml_content)

        try:
            # 2. 构建命令
            cmd = [
                self.EXECUTOR_CMD,
                "--cases", yaml_path,
                "--output", "-json"  # 输出JSON格式
            ]

            # 3. 注入动态关键字
            if request.dynamic_keywords:
                cmd.extend([
                    "--dynamic-keywords",
                    json.dumps(request.dynamic_keywords)
                ])

            # 4. 执行
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self._calculate_timeout(request)
            )

            # 5. 解析结果
            return self._parse_result(result.stdout)

        finally:
            # 6. 清理临时文件
            os.unlink(yaml_path)

    def _parse_result(self, output: str) -> ExecutionResult:
        """解析执行器输出"""
        try:
            data = json.loads(output)
            return ExecutionResult(**data)
        except json.JSONDecodeError:
            raise ExecutorException(f"Invalid output format: {output}")
```

#### 6. 结果解析器（ResultParser）

```python
# backend/app/services/execution/result_parser.py

class ResultParser:
    """解析执行器返回的原始结果"""

    def parse(self, raw_output: str) -> ParsedResult:
        """
        解析原始输出为结构化数据

        Args:
            raw_output: JSON格式的执行器输出

        Returns:
            ParsedResult {
                summary: {...},
                steps: [...],
                performance_metrics: {...},
                errors: [...]
            }
        """
        pass

    def extract_failures(self, result: ParsedResult) -> List[FailureInfo]:
        """提取失败信息"""
        pass

    def calculate_statistics(self, result: ParsedResult) -> Statistics:
        """计算统计数据"""
        pass

    def save_to_database(self, result: ParsedResult, test_case_id: int):
        """保存结果到数据库"""
        pass
```

---

## 📅 开发阶段规划

### Phase 1: 基础设施搭建（Week 1）

**目标**：建立执行器适配层，实现基础调用

**任务列表**：

#### PM-001: 执行器适配层架构设计
- [ ] 定义适配层接口规范
- [ ] 设计数据模型（TestCaseForm, ExecutionRequest, ExecutionResult）
- [ ] 确定与Sisyphus-api-engine的集成协议
- [ ] 编写技术设计文档

**验收标准**：
- ✅ 接口文档完整
- ✅ 数据模型定义清晰
- ✅ 技术方案评审通过

#### PM-002: Sisyphus-api-engine 集成准备
- [ ] 更新 requirements.txt：`Sisyphus-api-engine==1.0.1`
- [ ] 编写安装脚本和文档
- [ ] 验证 CLI 命令调用
- [ ] 测试基础执行流程

**验收标准**：
- ✅ 可以通过 `pip install` 安装执行器
- ✅ CLI 命令可以正常执行测试
- ✅ 输出格式符合预期

#### PM-003: 核心适配器实现
- [ ] 实现 `YAMLGenerator` - 基础YAML生成
- [ ] 实现 `ExecutorAdapter` - 调用执行器
- [ ] 实现 `ResultParser` - 解析执行结果
- [ ] 单元测试覆盖率达到 80%

**验收标准**：
- ✅ 可以生成简单测试用例的YAML
- ✅ 可以调用执行器并获取结果
- ✅ 单元测试通过

---

### Phase 2: 可视化编辑器（Week 2-3）

**目标**：实现表单到YAML的转换，用户可通过界面创建测试

**任务列表**：

#### PM-004: 前端表单设计
- [ ] 设计测试用例编辑表单UI
- [ ] 实现步骤添加/删除/排序功能
- [ ] 实现不同步骤类型的动态表单
- [ ] 实时YAML预览功能

**UI原型**：
```
┌─────────────────────────────────────────────┐
│ 测试用例编辑器                               │
├─────────────────────────────────────────────┤
│ 用例名称: [________________]  环境: [下拉▼] │
│ 描述:     [________________]               │
├─────────────────────────────────────────────┤
│ 测试步骤                                     │
│ ┌─────────────────────────────────────────┐ │
│ │ ▼ 步骤1: HTTP请求              [删除]   │ │
│ │   URL: [/api/users]                    │ │
│ │   方法: [POST ▼]                       │ │
│ │   请求体: {...}                         │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ ▼ 步骤2: 数据库验证           [删除]   │ │
│ │   SQL: [SELECT COUNT(*) FROM users]    │ │
│ │   期望: [> 0]                           │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ [+ 添加步骤]                                 │
├─────────────────────────────────────────────┤
│ YAML预览:                                    │
│ ┌─────────────────────────────────────────┐ │
│ │ name: "测试用例"                        │ │
│ │ steps:                                  │ │
│ │   - ...                                 │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ [保存] [执行测试] [取消]                     │
└─────────────────────────────────────────────┘
```

#### PM-005: 后端YAML生成增强
- [ ] 支持所有步骤类型的YAML生成
- [ ] 支持变量引用和环境切换
- [ ] 支持条件判断和循环
- [ ] YAML语法验证

#### PM-006: 测试用例CRUD API
- [ ] 创建测试用例
- [ ] 更新测试用例
- [ ] 删除测试用例
- [ ] 查询测试用例（分页、过滤）

**验收标准**：
- ✅ 用户可以通过界面创建完整测试用例
- ✅ 生成的YAML符合执行器规范
- ✅ 可以保存和加载测试用例

---

### Phase 3: 关键字管理系统（Week 4）

**目标**：实现动态关键字管理，支持实时扩展

**任务列表**：

#### PM-007: 关键字编辑器
- [ ] Monaco Editor集成（Python语法高亮）
- [ ] 实时代码检查
- [ ] 参数定义表单
- [ ] 关键字测试功能

**UI原型**：
```
┌─────────────────────────────────────────────┐
│ 关键字编辑器                                 │
├─────────────────────────────────────────────┤
│ 基本信息                                     │
│ 名称: [custom_assertion]  分类: [断言▼]    │
│ 描述: [自定义断言关键字]                    │
├─────────────────────────────────────────────┤
│ 函数代码                                     │
│ ┌─────────────────────────────────────────┐ │
│ │ def custom_assertion(actual, expected): │ │
│ │     """自定义断言"""                    │ │
│ │     return actual == expected            │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ 参数定义                                     │
│ [+ 添加参数]                                 │
│ ┌─────────────────────────────────────────┐ │
│ │ 参数名: actual   类型: [any ▼]  [删除]  │ │
│ │ 参数名: expected 类型: [any ▼]  [删除]  │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ 测试                                         │
│ actual: [10]  expected: [10]                │
│ [执行测试]                                   │
│ 结果: ✅ Passed (返回值: True)               │
├─────────────────────────────────────────────┤
│ [保存] [取消]                                │
└─────────────────────────────────────────────┘
```

#### PM-008: 动态关键字注入
- [ ] 实现关键字代码序列化
- [ ] 传递给执行器
- [ ] 执行器动态加载
- [ ] 错误处理和日志

#### PM-009: 关键字管理API
- [ ] 关键字CRUD
- [ ] 关键字验证
- [ ] 关键字测试
- [ ] 关键字启用/禁用

**验收标准**：
- ✅ 用户可以创建和编辑关键字
- ✅ 关键字在测试用例中可以调用
- ✅ 修改关键字后立即生效（无需重启）

---

### Phase 4: 执行调度系统（Week 5）

**目标**：实现测试执行的调度和监控

**任务列表**：

#### PM-010: 执行调度器
- [ ] 同步执行模式
- [ ] 异步执行模式（任务队列）
- [ ] 并发控制
- [ ] 超时处理

#### PM-011: 执行监控
- [ ] WebSocket实时推送
- [ ] 执行进度展示
- [ ] 日志流式输出
- [ ] 状态更新

#### PM-012: 环境管理
- [ ] 环境配置管理
- [ ] 环境变量管理
- [ ] 环境切换
- [ ] 环境验证

**验收标准**：
- ✅ 可以执行测试并获取结果
- ✅ 执行过程可以实时监控
- ✅ 支持多环境切换

---

### Phase 5: 结果展示系统（Week 6）

**目标**：友好地展示测试结果和问题定位

**任务列表**：

#### PM-013: 结果展示UI
- [ ] 测试用例结果概览
- [ ] 步骤级别详情
- [ ] 失败原因高亮
- [ ] 性能指标展示

**UI原型**：
```
┌─────────────────────────────────────────────┐
│ 测试执行结果                                 │
├─────────────────────────────────────────────┤
│ ✅ 测试用例: 用户登录测试                    │
│    状态: PASSED  耗时: 1.23s  环境: test     │
├─────────────────────────────────────────────┤
│ 步骤详情                                     │
│ ┌─────────────────────────────────────────┐ │
│ │ ✅ 步骤1: 发送登录请求 (234ms)           │ │
│ │    请求: POST /api/login                 │ │
│ │    响应: 200 OK                          │ │
│ │    断言: status_code == 200 ✓           │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ ✅ 步骤2: 验证返回token (56ms)           │ │
│ │    提取: $.data.token → "abc123"        │ │
│ │    断言: token is not None ✓            │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ ✅ 步骤3: 数据库验证 (112ms)             │ │
│ │    SQL: SELECT * FROM users WHERE ...   │ │
│ │    结果: 返回1条记录 ✓                  │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ 性能指标                                     │
│ • DNS解析: 12ms                             │
│ • TCP连接: 45ms                             │
│ • TLS握手: 89ms                             │
│ • 首字节: 123ms                             │
│ • 总耗时: 234ms                             │
├─────────────────────────────────────────────┤
│ [重新执行] [导出报告] [查看日志]             │
└─────────────────────────────────────────────┘
```

#### PM-014: 报告导出
- [ ] HTML报告生成
- [ ] PDF报告生成
- [ ] JSON数据导出
- [ ] 第三方系统集成

#### PM-015: 历史记录
- [ ] 执行历史查询
- [ ] 趋势分析
- [ ] 对比功能

**验收标准**：
- ✅ 测试结果清晰展示
- ✅ 失败原因一目了然
- ✅ 支持多种报告格式

---

### Phase 6: 场景编排增强（Week 7）

**目标**：增强工作流编排能力

**任务列表**：

#### PM-016: 场景与用例关联
- [ ] 在场景中引用测试用例
- [ ] 参数传递机制
- [ ] 上下文共享

#### PM-017: 复杂工作流支持
- [ ] 条件分支
- [ ] 并行执行
- [ ] 循环迭代
- [ ] 错误处理

**验收标准**：
- ✅ 可以编排复杂测试场景
- ✅ 支持条件判断和循环

---

### Phase 7: 优化和文档（Week 8）

**目标**：优化性能，完善文档

**任务列表**：

#### PM-018: 性能优化
- [ ] 执行器调用优化
- [ ] 缓存机制
- [ ] 并发优化
- [ ] 数据库查询优化

#### PM-019: 用户体验优化
- [ ] 加载状态优化
- [ ] 错误提示优化
- [ ] 快捷键支持
- [ ] 批量操作

#### PM-020: 文档完善
- [ ] 用户使用手册
- [ ] API文档
- [ ] 关键字开发指南
- [ ] 部署文档

**验收标准**：
- ✅ 性能指标达标
- ✅ 文档完整
- ✅ 用户反馈良好

---

## 📊 数据模型设计

### 核心实体关系

```
Project (项目)
  ├── Environment (环境)
  ├── TestCase (测试用例)
  │   └── TestStep (测试步骤)
  ├── Keyword (关键字)
  └── Scenario (场景)
      └── ScenarioNode (场景节点)

TestExecution (测试执行记录)
  ├── TestStepResult (步骤结果)
  └── TestReport (测试报告)
```

### 关键数据结构

#### TestCase（测试用例）
```python
class TestCase(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int
    name: str
    description: Optional[str] = None
    # 存储表单数据（JSON格式）
    form_data: dict  # {"steps": [...], "variables": {...}}
    # 缓存生成的YAML
    yaml_content: Optional[str] = None
    created_at: datetime
    updated_at: datetime
```

#### Keyword（关键字）
```python
class Keyword(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int
    name: str  # 关键字名称
    func_name: str  # 函数名
    category: Optional[str] = None  # 分类
    description: Optional[str] = None
    # 存储Python代码
    function_code: str  # "def custom_keyword(): ..."
    # 参数定义（JSON）
    params_schema: Optional[dict] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
```

#### TestExecution（测试执行记录）
```python
class TestExecution(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    test_case_id: int
    environment_id: Optional[int] = None
    status: str  # pending/running/success/failed
    # 存储完整结果（JSON）
    result_data: Optional[dict] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration: Optional[float] = None  # 秒
```

---

## 🔌 接口规范

### 前端 → 后端 API

#### 创建测试用例
```http
POST /api/v1/testcases
Content-Type: application/json

{
  "project_id": 1,
  "name": "用户登录测试",
  "description": "测试用户登录功能",
  "form_data": {
    "steps": [
      {
        "type": "request",
        "name": "发送登录请求",
        "params": {
          "url": "/api/login",
          "method": "POST",
          "body": {"username": "test", "password": "123456"}
        },
        "validations": [
          {"type": "eq", "path": "status_code", "value": 200}
        ]
      }
    ]
  }
}
```

#### 执行测试
```http
POST /api/v1/testcases/{id}/execute
Content-Type: application/json

{
  "environment_id": 2,
  "async": false
}
```

#### 创建关键字
```http
POST /api/v1/keywords
Content-Type: application/json

{
  "project_id": 1,
  "name": "自定义断言",
  "func_name": "custom_assertion",
  "category": "断言",
  "function_code": "def custom_assertion(actual, expected):\n    return actual == expected",
  "params_schema": {
    "actual": {"type": "any", "required": true},
    "expected": {"type": "any", "required": true}
  }
}
```

### 后端 → Sisyphus-api-engine

#### CLI调用
```bash
sisyphus-api-engine \
  --cases /tmp/test_case.yaml \
  --dynamic-keywords '["def kw1(): ...", "def kw2(): ..."]' \
  --output -json
```

#### 输入格式
```yaml
name: "测试用例"
steps:
  - name: "步骤1"
    type: request
    request:
      url: "/api/users"
      method: GET
    validate:
      - eq: ["status_code", 200]
```

#### 输出格式
```json
{
  "test_case": {
    "name": "测试用例",
    "status": "passed",
    "start_time": "2025-01-30T10:00:00",
    "end_time": "2025-01-30T10:00:01",
    "duration": 1.234
  },
  "steps": [
    {
      "name": "步骤1",
      "status": "passed",
      "duration": 0.567
    }
  ],
  "statistics": {
    "total_steps": 1,
    "passed_steps": 1,
    "failed_steps": 0
  }
}
```

---

## 🎯 成功指标

### 技术指标
- ✅ 执行器调用成功率 > 99.9%
- ✅ 测试执行延迟 < 500ms
- ✅ 关键字加载时间 < 100ms（10个关键字）
- ✅ YAML生成准确率 100%

### 产品指标
- ✅ 用户创建测试用例时间减少 60%（相比手写YAML）
- ✅ 关键字复用率 > 50%
- ✅ 测试执行效率提升 40%
- ✅ 用户满意度 > 4.5/5

### 业务指标
- ✅ 平台DAU增长
- ✅ 测试用例数量增长
- ✅ 关键字贡献数增长
- ✅ 客户续费率提升

---

## 🚨 风险管理

### 技术风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Sisyphus-api-engine版本不兼容 | 中 | 高 | 版本锁定，充分测试 |
| exec()安全问题 | 中 | 高 | 沙箱执行，代码审计 |
| 性能瓶颈 | 低 | 中 | 缓存，异步处理 |
| YAML格式变更 | 低 | 中 | 版本管理，适配层 |

### 产品风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 用户学习成本高 | 中 | 中 | 文档，教程，示例 |
| 功能复杂度超预期 | 高 | 高 | 分阶段迭代，MVP优先 |
| 用户需求变化 | 高 | 中 | 敏捷开发，快速响应 |

---

## 📚 参考资料

### 技术文档
- [Sisyphus-api-engine文档](https://github.com/koco-co/Sisyphus-api-engine)
- [Python exec()安全](https://docs.python.org/3/library/functions.html#exec)
- [YAML规范](https://yaml.org/spec/)

### 产品参考
- [Postman接口测试](https://www.postman.com/)
- [JMeter性能测试](https://jmeter.apache.org/)
- [低代码平台设计模式](https://www.nocode.dev/)

---

## ✅ 检查清单

### 每个阶段完成前检查：
- [ ] 功能完整性
- [ ] 代码质量（测试覆盖率）
- [ ] 文档完整性
- [ ] 性能达标
- [ ] 安全审查
- [ ] 用户体验测试

### 发布前检查：
- [ ] 所有P0任务完成
- [ ] 核心功能测试通过
- [ ] 性能测试通过
- [ ] 安全测试通过
- [ ] 用户验收测试通过
- [ ] 文档完整
- [ ] 回滚计划准备

---

**开始构建下一代测试平台吧！🚀**
