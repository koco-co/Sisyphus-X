# 执行器集成 - 技术实现详细任务列表

> 基于产品路线图的技术实现分解
> 每个任务包含：目标、实现细节、验收标准、预估时间

---

## 📦 Phase 1: 基础设施搭建（Week 1）

### Task 1.1: 更新依赖和配置

**目标**：将 Sisyphus-api-engine 作为第三方依赖集成

**实现步骤**：
```bash
# 1. 更新 requirements.txt
cat >> requirements.txt << EOF
# Sisyphus API Engine - 核心执行器
Sisyphus-api-engine==1.0.1
EOF

# 2. 创建安装脚本
# scripts/install_executor.sh
pip install Sisyphus-api-engine==1.0.1
sisyphus-api-engine --version

# 3. 更新 .env 配置
# 添加执行器相关配置
EXECUTOR_ENGINE="sisyphus-api-engine"
EXECUTOR_VERSION="1.0.1"
EXECUTOR_TIMEOUT=300
```

**验收标准**：
- ✅ `pip list | grep Sisyphus` 显示已安装
- ✅ `sisyphus-api-engine --help` 可以正常执行
- ✅ 文档更新（README.md）

**预估时间**：2小时

---

### Task 1.2: 创建执行器适配层目录结构

**目标**：建立清晰的代码组织结构

**实现步骤**：
```bash
# 创建目录结构
mkdir -p backend/app/services/execution
cd backend/app/services/execution

# 创建模块文件
touch __init__.py
touch yaml_generator.py
touch parameter_parser.py
touch keyword_injector.py
touch execution_scheduler.py
touch executor_adapter.py
touch result_parser.py
touch exceptions.py

# 创建测试目录
mkdir -p tests/services/execution
touch tests/services/execution/__init__.py
touch tests/services/execution/test_yaml_generator.py
touch tests/services/execution/test_executor_adapter.py
```

**目录结构**：
```
backend/app/services/execution/
├── __init__.py                 # 导出所有公共接口
├── exceptions.py               # 自定义异常
├── yaml_generator.py           # YAML生成器
├── parameter_parser.py         # 参数解析器
├── keyword_injector.py         # 关键字注入器
├── execution_scheduler.py      # 执行调度器
├── executor_adapter.py         # 执行器适配器
└── result_parser.py            # 结果解析器
```

**验收标准**：
- ✅ 目录结构创建完成
- ✅ 所有文件有基础文档字符串
- ✅ 可以导入模块不报错

**预估时间**：1小时

---

### Task 1.3: 定义数据模型

**目标**：定义适配层的核心数据结构

**实现步骤**：

```python
# backend/app/services/execution/exceptions.py

class ExecutorException(Exception):
    """执行器异常基类"""
    pass

class YAMLGenerationException(ExecutorException):
    """YAML生成异常"""
    pass

class ExecutionTimeoutException(ExecutorException):
    """执行超时异常"""
    pass

class ResultParseException(ExecutorException):
    """结果解析异常"""
    pass
```

```python
# backend/app/services/execution/__init__.py

from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

class ExecutionRequest(BaseModel):
    """执行请求"""
    yaml_content: str                    # YAML内容
    base_url: Optional[str] = None       # 基础URL
    variables: Dict[str, Any] = {}       # 变量
    dynamic_keywords: List[str] = []     # 动态关键字代码列表
    timeout: Optional[int] = 300         # 超时时间（秒）
    environment: Optional[str] = None    # 环境名称

class ExecutionResult(BaseModel):
    """执行结果"""
    success: bool                        # 是否成功
    test_case: Dict[str, Any]            # 测试用例信息
    steps: List[Dict[str, Any]]          # 步骤结果
    statistics: Dict[str, int]           # 统计信息
    final_variables: Dict[str, Any]      # 最终变量
    performance_metrics: Optional[Dict[str, Any]] = None  # 性能指标
    error: Optional[str] = None          # 错误信息
    duration: Optional[float] = None     # 执行耗时（秒）

class TestCaseForm(BaseModel):
    """测试用例表单数据"""
    name: str
    description: Optional[str] = None
    project_id: int
    environment_id: Optional[int] = None
    steps: List[Dict[str, Any]]
    variables: Dict[str, Any] = {}
    config: Dict[str, Any] = {}

class TestStep(BaseModel):
    """测试步骤"""
    id: str
    type: str                            # request/database/wait/condition/keyword
    name: str
    params: Dict[str, Any]
    validations: Optional[List[Dict[str, Any]]] = None
    skip_if: Optional[str] = None
    only_if: Optional[str] = None
```

**验收标准**：
- ✅ 所有数据模型定义完成
- ✅ Pydantic验证通过
- ✅ 类型注解完整

**预估时间**：2小时

---

### Task 1.4: 实现 YAML 生成器

**目标**：将前端表单数据转换为 YAML 格式

**实现步骤**：

```python
# backend/app/services/execution/yaml_generator.py

import yaml
from typing import Dict, Any, List
from . import TestCaseForm, TestStep

class YAMLGenerator:
    """YAML生成器 - 将表单数据转换为YAML"""

    def generate_from_form(self, form_data: TestCaseForm) -> str:
        """
        从表单数据生成YAML

        Args:
            form_data: 测试用例表单数据

        Returns:
            YAML字符串
        """
        # 构建基础结构
        yaml_dict = {
            "name": form_data.name,
            "description": form_data.description or "",
        }

        # 添加配置
        if form_data.variables or form_data.config:
            yaml_dict["config"] = {}
            if form_data.variables:
                yaml_dict["config"]["variables"] = form_data.variables
            if form_data.config:
                yaml_dict["config"].update(form_data.config)

        # 转换步骤
        yaml_dict["steps"] = []
        for step in form_data.steps:
            yaml_dict["steps"].append(self._convert_step(step))

        # 生成YAML
        return yaml.dump(yaml_dict, allow_unicode=True, sort_keys=False)

    def _convert_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """转换单个步骤"""
        step_type = step.get("type")

        if step_type == "request":
            return self._convert_request_step(step)
        elif step_type == "database":
            return self._convert_database_step(step)
        elif step_type == "wait":
            return self._convert_wait_step(step)
        elif step_type == "keyword":
            return self._convert_keyword_step(step)
        elif step_type == "condition":
            return self._convert_condition_step(step)
        else:
            raise ValueError(f"Unknown step type: {step_type}")

    def _convert_request_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """转换HTTP请求步骤"""
        params = step.get("params", {})
        return {
            step["name"]: {
                "type": "request",
                "request": {
                    "url": params.get("url", ""),
                    "method": params.get("method", "GET"),
                },
                "validate": step.get("validations", [])
            }
        }

    def _convert_database_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """转换数据库操作步骤"""
        params = step.get("params", {})
        return {
            step["name"]: {
                "type": "database",
                "operation": {
                    "type": params.get("operation_type", "query"),
                    "sql": params.get("sql", ""),
                },
                "validate": step.get("validations", [])
            }
        }

    def _convert_wait_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """转换等待步骤"""
        params = step.get("params", {})
        wait_type = params.get("wait_type", "fixed")

        if wait_type == "fixed":
            return {
                step["name"]: {
                    "type": "wait",
                    "wait": {
                        "type": "fixed",
                        "seconds": params.get("seconds", 1)
                    }
                }
            }
        elif wait_type == "condition":
            return {
                step["name"]: {
                    "type": "wait",
                    "wait": {
                        "type": "condition",
                        "condition": params.get("condition", ""),
                        "timeout": params.get("timeout", 30),
                        "interval": params.get("interval", 1)
                    }
                }
            }

    def _convert_keyword_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """转换关键字步骤"""
        params = step.get("params", {})
        return {
            step["name"]: {
                "type": "keyword",
                "keyword": params.get("keyword_name", ""),
                "params": params.get("keyword_params", {})
            }
        }

    def _convert_condition_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """转换条件判断步骤"""
        params = step.get("params", {})
        return {
            step["name"]: {
                "type": "condition",
                "condition": params.get("condition", ""),
                "then_steps": [self._convert_step(s) for s in params.get("then_steps", [])],
                "else_steps": [self._convert_step(s) for s in params.get("else_steps", [])]
            }
        }
```

**验收标准**：
- ✅ 支持所有步骤类型转换
- ✅ 生成的YAML符合执行器规范
- ✅ 单元测试覆盖率 > 80%

**测试用例**：
```python
def test_generate_simple_request():
    form = TestCaseForm(
        name="测试用例",
        project_id=1,
        steps=[{
            "id": "1",
            "type": "request",
            "name": "GET请求",
            "params": {
                "url": "/api/users",
                "method": "GET"
            },
            "validations": [
                {"type": "eq", "path": "status_code", "value": 200}
            ]
        }]
    )

    generator = YAMLGenerator()
    yaml_content = generator.generate_from_form(form)

    expected = """
name: 测试用例
description: null
steps:
  - GET请求:
      type: request
      request:
        url: /api/users
        method: GET
      validate:
        - {type: eq, path: status_code, value: 200}
"""
    assert yaml_content.strip() == expected.strip()
```

**预估时间**：4小时

---

### Task 1.5: 实现执行器适配器

**目标**：封装对 Sisyphus-api-engine 的调用

**实现步骤**：

```python
# backend/app/services/execution/executor_adapter.py

import subprocess
import json
import tempfile
import os
from typing import Optional
from . import ExecutionRequest, ExecutionResult, ExecutorException

class ExecutorAdapter:
    """Sisyphus-api-engine 适配器"""

    EXECUTOR_CMD = "sisyphus-api-engine"

    def __init__(self, timeout: int = 300):
        """
        初始化适配器

        Args:
            timeout: 默认超时时间（秒）
        """
        self.timeout = timeout

    async def execute(self, request: ExecutionRequest) -> ExecutionResult:
        """
        执行测试用例

        Args:
            request: 执行请求

        Returns:
            执行结果
        """
        # 1. 创建临时YAML文件
        yaml_path = self._create_temp_file(request.yaml_content)

        try:
            # 2. 构建命令
            cmd = self._build_command(yaml_path, request)

            # 3. 执行
            result = await self._run_executor(cmd, request.timeout or self.timeout)

            # 4. 解析结果
            return self._parse_result(result.stdout, result.stderr)

        finally:
            # 5. 清理临时文件
            if os.path.exists(yaml_path):
                os.unlink(yaml_path)

    def _create_temp_file(self, content: str) -> str:
        """创建临时文件"""
        fd, path = tempfile.mkstemp(suffix=".yaml", text=True)
        with os.fdopen(fd, 'w') as f:
            f.write(content)
        return path

    def _build_command(self, yaml_path: str, request: ExecutionRequest) -> List[str]:
        """构建执行命令"""
        cmd = [
            self.EXECUTOR_CMD,
            "--cases", yaml_path,
            "--output", "-json"  # 输出JSON格式
        ]

        # 添加基础URL
        if request.base_url:
            cmd.extend(["--base-url", request.base_url])

        # 添加动态关键字
        if request.dynamic_keywords:
            cmd.extend([
                "--dynamic-keywords",
                json.dumps(request.dynamic_keywords)
            ])

        # 添加环境变量
        if request.environment:
            cmd.extend(["--profile", request.environment])

        # 添加变量
        if request.variables:
            cmd.extend([
                "--variables",
                json.dumps(request.variables)
            ])

        return cmd

    async def _run_executor(self, cmd: List[str], timeout: int) -> subprocess.CompletedProcess:
        """
        运行执行器

        Args:
            cmd: 命令列表
            timeout: 超时时间

        Returns:
            进程结果
        """
        try:
            # 使用 asyncio 运行子进程
            import asyncio
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await asyncio.wait_for(
                proc.communicate(),
                timeout=timeout
            )

            return subprocess.CompletedProcess(
                args=cmd,
                returncode=proc.returncode,
                stdout=stdout.decode('utf-8'),
                stderr=stderr.decode('utf-8')
            )

        except asyncio.TimeoutError:
            # 超时则杀死进程
            if proc:
                proc.kill()
                await proc.wait()
            raise ExecutorException(f"Execution timeout after {timeout} seconds")

    def _parse_result(self, stdout: str, stderr: str) -> ExecutionResult:
        """
        解析执行器输出

        Args:
            stdout: 标准输出
            stderr: 标准错误

        Returns:
            执行结果
        """
        if not stdout:
            return ExecutionResult(
                success=False,
                test_case={},
                steps=[],
                statistics={},
                final_variables={},
                error=stderr or "No output from executor"
            )

        try:
            # 解析JSON
            data = json.loads(stdout)

            # 提取关键字段
            test_case_info = data.get("test_case", {})
            steps = data.get("steps", [])
            statistics = data.get("statistics", {})
            final_vars = data.get("final_variables", {})
            metrics = data.get("performance_metrics", {})

            # 判断是否成功
            success = test_case_info.get("status") == "passed"

            return ExecutionResult(
                success=success,
                test_case=test_case_info,
                steps=steps,
                statistics=statistics,
                final_variables=final_vars,
                performance_metrics=metrics,
                duration=test_case_info.get("duration"),
                error=None if success else self._extract_error(steps)
            )

        except json.JSONDecodeError as e:
            raise ExecutorException(f"Failed to parse executor output: {e}\nOutput: {stdout[:500]}")

    def _extract_error(self, steps: List[Dict]) -> Optional[str]:
        """从步骤中提取错误信息"""
        for step in steps:
            if step.get("status") == "failed":
                return step.get("error") or step.get("message", "Unknown error")
        return None
```

**验收标准**：
- ✅ 可以调用执行器并获取结果
- ✅ 正确处理超时和异常
- ✅ 单元测试通过

**测试用例**：
```python
import pytest

@pytest.mark.asyncio
async def test_execute_simple_case():
    adapter = ExecutorAdapter()

    request = ExecutionRequest(
        yaml_content="""
name: 测试用例
steps:
  - 步骤1:
      type: request
      url: https://httpbin.org/get
      method: GET
""",
        base_url="https://httpbin.org"
    )

    result = await adapter.execute(request)

    assert result.success is True
    assert len(result.steps) > 0
    assert result.statistics["total_steps"] == 1
```

**预估时间**：4小时

---

### Task 1.6: 实现关键字注入器

**目标**：管理动态关键字的收集和注入

**实现步骤**：

```python
# backend/app/services/execution/keyword_injector.py

import json
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.models.keyword import Keyword

class KeywordInjector:
    """关键字动态注入管理"""

    async def collect_keywords(
        self,
        session: AsyncSession,
        project_id: int,
        category: Optional[str] = None
    ) -> List[Keyword]:
        """
        收集项目的活跃关键字

        Args:
            session: 数据库会话
            project_id: 项目ID
            category: 可选的分类过滤

        Returns:
            关键字实例列表
        """
        query = select(Keyword).where(
            Keyword.project_id == project_id,
            Keyword.is_active == True
        )

        if category:
            query = query.where(Keyword.category == category)

        result = await session.execute(query)
        return result.scalars().all()

    def validate_keyword_code(self, code: str) -> dict:
        """
        验证关键字代码语法和安全性

        Args:
            code: Python代码字符串

        Returns:
            验证结果 {"valid": bool, "error": str}
        """
        try:
            compile(code, "<string>", "exec")
            return {"valid": True, "error": None}
        except SyntaxError as e:
            return {
                "valid": False,
                "error": f"Line {e.lineno}: {e.msg}"
            }
        except Exception as e:
            return {
                "valid": False,
                "error": str(e)
            }

    def inject_to_executor(self, keywords: List[Keyword]) -> List[str]:
        """
        将关键字代码序列化为列表，供执行器加载

        Args:
            keywords: 关键字实例列表

        Returns:
            关键字代码列表
        """
        return [kw.function_code for kw in keywords if kw.is_active]

    async def prepare_keywords_for_execution(
        self,
        session: AsyncSession,
        project_id: int
    ) -> List[str]:
        """
        为执行准备关键字代码

        Args:
            session: 数据库会话
            project_id: 项目ID

        Returns:
            关键字代码列表
        """
        keywords = await self.collect_keywords(session, project_id)
        return self.inject_to_executor(keywords)
```

**验收标准**：
- ✅ 可以从数据库收集关键字
- ✅ 代码验证功能正常
- ✅ 序列化格式正确

**预估时间**：2小时

---

### Task 1.7: 实现参数解析器

**目标**：组装完整的执行参数

**实现步骤**：

```python
# backend/app/services/execution/parameter_parser.py

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.test_case import TestCase
from app.models.project import Environment
from . import ExecutionRequest, TestCaseForm
from .yaml_generator import YAMLGenerator
from .keyword_injector import KeywordInjector

class ParameterParser:
    """参数解析器"""

    def __init__(self):
        self.yaml_generator = YAMLGenerator()
        self.keyword_injector = KeywordInjector()

    async def parse_execution_request(
        self,
        session: AsyncSession,
        test_case: TestCase,
        environment_id: Optional[int] = None
    ) -> ExecutionRequest:
        """
        解析执行请求，组装完整的执行参数

        Args:
            session: 数据库会话
            test_case: 测试用例实例
            environment_id: 环境ID（可选）

        Returns:
            ExecutionRequest
        """
        # 1. 加载环境配置
        environment = None
        base_url = None
        env_variables = {}

        if environment_id:
            environment = await session.get(Environment, environment_id)
            if environment:
                base_url = environment.domain
                env_variables = environment.variables or {}

        # 2. 生成YAML
        form_data = TestCaseForm(**test_case.form_data)
        yaml_content = self.yaml_generator.generate_from_form(form_data)

        # 3. 合并变量
        variables = {**env_variables}
        if form_data.variables:
            variables.update(form_data.variables)

        # 4. 收集关键字
        dynamic_keywords = await self.keyword_injector.prepare_keywords_for_execution(
            session, test_case.project_id
        )

        # 5. 构建请求
        return ExecutionRequest(
            yaml_content=yaml_content,
            base_url=base_url,
            variables=variables,
            dynamic_keywords=dynamic_keywords,
            timeout=300,
            environment=environment.name if environment else None
        )
```

**预估时间**：2小时

---

### Task 1.8: 实现执行调度器

**目标**：统一管理测试执行

**实现步骤**：

```python
# backend/app/services/execution/execution_scheduler.py

import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.test_case import TestCase
from app.models.test_execution import TestExecution
from .executor_adapter import ExecutorAdapter
from .parameter_parser import ParameterParser
from . import ExecutionResult

class ExecutionScheduler:
    """测试执行调度器"""

    def __init__(self):
        self.executor = ExecutorAdapter()
        self.parser = ParameterParser()

    async def execute_test_case(
        self,
        session: AsyncSession,
        test_case_id: int,
        environment_id: Optional[int] = None
    ) -> ExecutionResult:
        """
        执行单个测试用例（同步）

        Args:
            session: 数据库会话
            test_case_id: 测试用例ID
            environment_id: 环境ID

        Returns:
            执行结果
        """
        # 1. 加载测试用例
        test_case = await session.get(TestCase, test_case_id)
        if not test_case:
            raise ValueError(f"TestCase not found: {test_case_id}")

        # 2. 创建执行记录
        execution = TestExecution(
            test_case_id=test_case_id,
            environment_id=environment_id,
            status="running"
        )
        session.add(execution)
        await session.commit()

        # 3. 解析参数
        request = await self.parser.parse_execution_request(
            session, test_case, environment_id
        )

        # 4. 执行
        try:
            result = await self.executor.execute(request)

            # 5. 更新执行记录
            execution.status = "success" if result.success else "failed"
            execution.result_data = result.dict()
            execution.duration = result.duration
            execution.completed_at = datetime.utcnow()

            await session.commit()

            return result

        except Exception as e:
            # 错误处理
            execution.status = "error"
            execution.result_data = {"error": str(e)}
            execution.completed_at = datetime.utcnow()
            await session.commit()
            raise

    async def execute_test_case_async(
        self,
        session: AsyncSession,
        test_case_id: int,
        environment_id: Optional[int] = None
    ) -> str:
        """
        异步执行测试用例（提交到任务队列）

        Args:
            session: 数据库会话
            test_case_id: 测试用例ID
            environment_id: 环境ID

        Returns:
            任务ID
        """
        # 生成任务ID
        task_id = str(uuid.uuid4())

        # 创建执行记录
        execution = TestExecution(
            test_case_id=test_case_id,
            environment_id=environment_id,
            status="pending",
            result_data={"task_id": task_id}
        )
        session.add(execution)
        await session.commit()

        # TODO: 提交到任务队列（Celery/RQ）
        # current_app.send_task(
        #     'app.tasks.execute_test_case',
        #     args=[test_case_id, environment_id],
        #     task_id=task_id
        # )

        return task_id
```

**预估时间**：3小时

---

### Task 1.9: 创建执行 API 端点

**目标**：提供前端调用的 API

**实现步骤**：

```python
# backend/app/api/v1/endpoints/execution.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_session
from app.services.execution import ExecutionScheduler
from app.schemas.execution import ExecutionResponse, AsyncTaskResponse

router = APIRouter()
scheduler = ExecutionScheduler()

@router.post("/testcases/{test_case_id}/execute", response_model=ExecutionResponse)
async def execute_test_case(
    test_case_id: int,
    environment_id: int = None,
    async_mode: bool = False,
    session: AsyncSession = Depends(get_session)
):
    """
    执行测试用例

    Args:
        test_case_id: 测试用例ID
        environment_id: 环境ID
        async_mode: 是否异步执行
        session: 数据库会话

    Returns:
        执行结果或任务ID
    """
    try:
        if async_mode:
            # 异步执行
            task_id = await scheduler.execute_test_case_async(
                session, test_case_id, environment_id
            )
            return AsyncTaskResponse(task_id=task_id, status="pending")
        else:
            # 同步执行
            result = await scheduler.execute_test_case(
                session, test_case_id, environment_id
            )
            return ExecutionResponse(**result.dict())

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**注册路由**：

```python
# backend/app/api/v1/api.py

from app.api.v1.endpoints import execution

api_router.include_router(
    execution.router,
    prefix="/execution",
    tags=["execution"],
    dependencies=[Depends(deps.get_current_user)]
)
```

**预估时间**：2小时

---

## 📊 Phase 2: 可视化编辑器（Week 2-3）

### Task 2.1: 前端表单组件设计

**目标**：创建测试用例编辑器UI组件

**文件结构**：
```
frontend/src/components/testcase/
├── TestCaseEditor.tsx         # 主编辑器
├── StepList.tsx               # 步骤列表
├── StepItem.tsx               # 单个步骤
├── StepForm.tsx               # 步骤表单
├── RequestStepForm.tsx        # HTTP请求表单
├── DatabaseStepForm.tsx       # 数据库操作表单
├── WaitStepForm.tsx           # 等待步骤表单
├── KeywordStepForm.tsx        # 关键字步骤表单
├── ConditionStepForm.tsx      # 条件判断表单
└── YAMLPreview.tsx            # YAML预览
```

**核心组件实现**（示例）：

```typescript
// frontend/src/components/testcase/TestCaseEditor.tsx

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { testCasesApi } from '@/api/client'
import { StepList } from './StepList'
import { YAMLPreview } from './YAMLPreview'

interface TestCaseEditorProps {
  testCaseId?: number
  projectId: number
  onSave?: () => void
}

export function TestCaseEditor({ testCaseId, projectId, onSave }: TestCaseEditorProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    steps: [],
    variables: {}
  })

  const saveMutation = useMutation({
    mutationFn: (data) => testCaseId
      ? testCasesApi.update(testCaseId, data)
      : testCasesApi.create({ ...data, project_id: projectId }),
    onSuccess: () => {
      onSave?.()
    }
  })

  const handleSave = () => {
    saveMutation.mutate(formData)
  }

  const handleExecute = async () => {
    // 先保存
    if (!testCaseId) {
      await saveMutation.mutateAsync(formData)
    }

    // 执行测试
    const result = await testCasesApi.execute(testCaseId, {
      environment_id: formData.environment_id
    })

    // 跳转到结果页面
    // navigate(`/testcases/${testCaseId}/results/${result.execution_id}`)
  }

  return (
    <div className="test-case-editor">
      <h2>测试用例编辑器</h2>

      {/* 基本信息 */}
      <div className="basic-info">
        <input
          placeholder="用例名称"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <textarea
          placeholder="描述"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      {/* 测试步骤 */}
      <StepList
        steps={formData.steps}
        onChange={(steps) => setFormData({ ...formData, steps })}
      />

      {/* YAML预览 */}
      <YAMLPreview formData={formData} />

      {/* 操作按钮 */}
      <div className="actions">
        <button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? '保存中...' : '保存'}
        </button>
        <button onClick={handleExecute}>
          执行测试
        </button>
      </div>
    </div>
  )
}
```

**预估时间**：8小时

---

### Task 2.2: 步骤表单组件

**目标**：实现不同类型步骤的表单

**HTTP请求表单示例**：

```typescript
// frontend/src/components/testcase/RequestStepForm.tsx

interface RequestStepFormProps {
  data: any
  onChange: (data: any) => void
}

export function RequestStepForm({ data, onChange }: RequestStepFormProps) {
  return (
    <div className="request-step-form">
      <h3>HTTP请求</h3>

      {/* URL */}
      <div className="field">
        <label>URL</label>
        <input
          value={data.url || ''}
          onChange={(e) => onChange({ ...data, url: e.target.value })}
          placeholder="/api/users"
        />
      </div>

      {/* Method */}
      <div className="field">
        <label>方法</label>
        <select
          value={data.method || 'GET'}
          onChange={(e) => onChange({ ...data, method: e.target.value })}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>

      {/* Headers */}
      <div className="field">
        <label>请求头</label>
        <KeyValueEditor
          data={data.headers || {}}
          onChange={(headers) => onChange({ ...data, headers })}
        />
      </div>

      {/* Body */}
      {['POST', 'PUT', 'PATCH'].includes(data.method) && (
        <div className="field">
          <label>请求体</label>
          <MonacoEditor
            language="json"
            value={JSON.stringify(data.body || {}, null, 2)}
            onChange={(value) => onChange({ ...data, body: JSON.parse(value) })}
            height="200px"
          />
        </div>
      )}

      {/* Validations */}
      <div className="field">
        <label>断言</label>
        <ValidationList
          validations={data.validations || []}
          onChange={(validations) => onChange({ ...data, validations })}
        />
      </div>
    </div>
  )
}
```

**预估时间**：12小时

---

### Task 2.3: YAML 实时预览

**目标**：实时生成并展示 YAML

```typescript
// frontend/src/components/testcase/YAMLPreview.tsx

import { useEffect, useState } from 'react'
import { testCasesApi } from '@/api/client'

interface YAMLPreviewProps {
  formData: any
}

export function YAMLPreview({ formData }: YAMLPreviewProps) {
  const [yaml, setYaml] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // 调用后端API生成YAML
    testCasesApi.generateYAML(formData)
      .then(res => {
        setYaml(res.data.yaml)
        setError('')
      })
      .catch(err => {
        setError(err.response?.data?.detail || '生成失败')
      })
  }, [formData])

  return (
    <div className="yaml-preview">
      <h3>YAML预览</h3>
      {error ? (
        <div className="error">{error}</div>
      ) : (
        <pre>{yaml}</pre>
      )}
    </div>
  )
}
```

**预估时间**：4小时

---

## 📋 总结

### Phase 1 完成时间估算

| 任务 | 预估时间 |
|------|----------|
| Task 1.1: 更新依赖 | 2小时 |
| Task 1.2: 目录结构 | 1小时 |
| Task 1.3: 数据模型 | 2小时 |
| Task 1.4: YAML生成器 | 4小时 |
| Task 1.5: 执行器适配器 | 4小时 |
| Task 1.6: 关键字注入器 | 2小时 |
| Task 1.7: 参数解析器 | 2小时 |
| Task 1.8: 执行调度器 | 3小时 |
| Task 1.9: API端点 | 2小时 |
| **总计** | **22小时（约3个工作日）** |

### Phase 2 完成时间估算

| 任务 | 预估时间 |
|------|----------|
| Task 2.1: 编辑器组件 | 8小时 |
| Task 2.2: 步骤表单 | 12小时 |
| Task 2.3: YAML预览 | 4小时 |
| **总计** | **24小时（约3个工作日）** |

### 里程碑

- **Week 1 结束**：基础执行能力可用（通过API调用）
- **Week 2 结束**：可视化编辑器可用
- **Week 3 结束**：关键字管理系统完成

---

**下一步：开始 Phase 1 的开发！🚀**
