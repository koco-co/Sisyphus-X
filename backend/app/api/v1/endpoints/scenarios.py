"""场景编排 API 路由

实现场景 CRUD、步骤管理、数据集管理、场景调试等接口
参考文档: docs/接口定义.md §6 场景编排模块
"""
import csv
import io
import uuid
import yaml
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlmodel import col
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.db import get_session
from app.models.scenario import Scenario, ScenarioStep, Dataset
from app.models.user import User
from app.models.env_variable import EnvVariable
from app.models.project import ProjectEnvironment
from app.schemas.pagination import PageResponse
from app.schemas.scenario import (
    ScenarioCreate,
    ScenarioUpdate,
    ScenarioResponse,
    ScenarioDetailResponse,
    ScenarioStepCreate,
    ScenarioStepResponse,
    ReorderStepsRequest,
    DatasetCreate,
    DatasetResponse,
    ImportCsvResponse,
    DebugScenarioRequest,
    DebugScenarioResponse,
    DebugScenarioStepResult,
)
from app.services.engine_executor import EngineExecutor

router = APIRouter()


# ========== ========== ========== ========== ========== ==========
# 场景 CRUD (6.1 ~ 6.5)
# ========== ========== ========== ========== ========== ==========


@router.get("/", response_model=PageResponse[ScenarioResponse])
async def list_scenarios(
    page: int = Query(1, ge=1, description="页码"),
    limit: int = Query(10, ge=1, le=100, description="每页条数"),
    project_id: Optional[str] = Query(None, description="项目 ID"),
    priority: Optional[str] = Query(None, pattern=r"^P[0-3]$", description="优先级 (P0/P1/P2/P3)"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> PageResponse[ScenarioResponse]:
    """获取场景列表 (6.1)"""
    skip = (page - 1) * limit
    statement = select(Scenario)
    count_statement = select(func.count()).select_from(Scenario)

    # 筛选条件
    if project_id is not None:
        statement = statement.where(col(Scenario.project_id) == project_id)
        count_statement = count_statement.where(col(Scenario.project_id) == project_id)

    if priority is not None:
        statement = statement.where(col(Scenario.priority) == priority)
        count_statement = count_statement.where(col(Scenario.priority) == priority)

    if search:
        search_pattern = f"%{search}%"
        statement = statement.where(col(Scenario.name).like(search_pattern))
        count_statement = count_statement.where(col(Scenario.name).like(search_pattern))

    # 排序
    statement = statement.order_by(Scenario.updated_at.desc())

    # 预加载关系
    statement = statement.options(selectinload(Scenario.steps))

    # 分页
    total = int((await session.execute(count_statement)).scalar_one() or 0)
    result = await session.execute(statement.offset(skip).limit(limit))
    scenarios = result.scalars().all()

    pages = (total + limit - 1) // limit

    # 转换为 Schema
    scenario_responses = [ScenarioResponse.model_validate(s) for s in scenarios]

    return PageResponse(
        items=scenario_responses,
        total=total,
        page=page,
        size=limit,
        pages=pages,
    )


@router.post("/", response_model=ScenarioResponse, status_code=201)
async def create_scenario(
    data: ScenarioCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ScenarioResponse:
    """创建场景 (6.2)"""
    # 生成 UUID
    scenario_id = str(uuid.uuid4())

    # 创建场景
    scenario = Scenario(
        id=scenario_id,
        project_id=data.project_id,
        created_by=current_user.id,
        name=data.name,
        description=data.description,
        priority=data.priority,
        tags=data.tags,
        variables=data.variables,
        pre_sql=data.pre_sql,
        post_sql=data.post_sql,
    )

    session.add(scenario)
    await session.commit()
    await session.refresh(scenario)

    # 预加载关系
    await session.refresh(scenario, ["steps"])

    return ScenarioResponse.model_validate(scenario)


@router.get("/{scenario_id}", response_model=ScenarioDetailResponse)
async def get_scenario(
    scenario_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ScenarioDetailResponse:
    """获取场景详情 (6.3)"""
    # 查询场景
    statement = select(Scenario).where(Scenario.id == scenario_id).options(
        selectinload(Scenario.steps),
        selectinload(Scenario.datasets)
    )
    result = await session.execute(statement)
    scenario = result.scalar_one_or_none()

    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")

    return ScenarioDetailResponse.model_validate(scenario)


@router.put("/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(
    scenario_id: str,
    data: ScenarioUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ScenarioResponse:
    """更新场景 (6.4)"""
    scenario = await session.get(Scenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")

    # 更新字段 (只更新提供的字段)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(scenario, key, value)

    await session.commit()

    # 重新查询以加载关系
    statement = select(Scenario).where(Scenario.id == scenario_id).options(
        selectinload(Scenario.steps)
    )
    result = await session.execute(statement)
    scenario = result.scalar_one()

    return ScenarioResponse.model_validate(scenario)


@router.delete("/{scenario_id}", status_code=204)
async def delete_scenario(
    scenario_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """删除场景 (6.5)"""
    scenario = await session.get(Scenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")

    await session.delete(scenario)
    await session.commit()


# ========== ========== ========== ========== ========== ==========
# 步骤管理 (6.6 ~ 6.8)
# ========== ========== ========== ========== ========== ==========


@router.post("/{scenario_id}/steps", response_model=ScenarioStepResponse, status_code=201)
async def create_or_update_step(
    scenario_id: str,
    data: ScenarioStepCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ScenarioStepResponse:
    """创建/更新测试步骤 (6.6)"""
    # 验证场景存在
    scenario = await session.get(Scenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")

    # 检查是否已存在相同 sort_order 的步骤
    existing_statement = select(ScenarioStep).where(
        ScenarioStep.scenario_id == scenario_id,
        ScenarioStep.sort_order == data.sort_order,
    )
    existing_result = await session.execute(existing_statement)
    existing_step = existing_result.scalar_one_or_none()

    if existing_step:
        # 更新现有步骤
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(existing_step, key, value)
        await session.commit()
        await session.refresh(existing_step)
        return ScenarioStepResponse.model_validate(existing_step)
    else:
        # 创建新步骤
        step_id = str(uuid.uuid4())
        step = ScenarioStep(
            id=step_id,
            scenario_id=scenario_id,
            description=data.description,
            keyword_type=data.keyword_type,
            keyword_name=data.keyword_name,
            parameters=data.parameters,
            sort_order=data.sort_order,
        )
        session.add(step)
        await session.commit()
        await session.refresh(step)
        return ScenarioStepResponse.model_validate(step)


@router.put("/{scenario_id}/steps/reorder", response_model=List[ScenarioStepResponse])
async def reorder_steps(
    scenario_id: str,
    data: ReorderStepsRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> List[ScenarioStepResponse]:
    """批量更新步骤排序 (6.7)"""
    # 验证场景存在
    scenario = await session.get(Scenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")

    # 查询所有步骤
    statement = select(ScenarioStep).where(ScenarioStep.scenario_id == scenario_id)
    result = await session.execute(statement)
    steps = result.scalars().all()

    # 构建 step_id -> step 的映射
    step_map = {step.id: step for step in steps}

    # 更新排序
    updated_steps = []
    for new_order, step_id in enumerate(data.step_ids):
        if step_id in step_map:
            step = step_map[step_id]
            step.sort_order = new_order
            updated_steps.append(step)

    await session.commit()

    # 返回更新后的步骤列表 (按新排序)
    updated_steps.sort(key=lambda s: s.sort_order)
    for step in updated_steps:
        await session.refresh(step)

    # 转换为 Schema
    return [ScenarioStepResponse.model_validate(s) for s in updated_steps]


@router.delete("/{scenario_id}/steps/{step_id}", status_code=204)
async def delete_step(
    scenario_id: str,
    step_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """删除测试步骤 (6.8)"""
    # 验证场景存在
    scenario = await session.get(Scenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")

    # 查询步骤
    step = await session.get(ScenarioStep, step_id)
    if not step or step.scenario_id != scenario_id:
        raise HTTPException(status_code=404, detail="步骤不存在")

    await session.delete(step)
    await session.commit()


# ========== ========== ========== ========== ========== ==========
# 数据集管理 (6.9 ~ 6.12)
# ========== ========== ========== ========== ========== ==========


@router.get("/{scenario_id}/datasets", response_model=List[DatasetResponse])
async def list_datasets(
    scenario_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> List[DatasetResponse]:
    """获取测试数据集列表 (6.9)"""
    # 验证场景存在
    scenario = await session.get(Scenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")

    # 查询数据集
    statement = select(Dataset).where(Dataset.scenario_id == scenario_id)
    result = await session.execute(statement)
    datasets = result.scalars().all()

    # 转换为 Schema
    return [DatasetResponse.model_validate(d) for d in datasets]


@router.post("/{scenario_id}/datasets", response_model=DatasetResponse, status_code=201)
async def create_dataset(
    scenario_id: str,
    data: DatasetCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DatasetResponse:
    """创建测试数据集 (6.10)"""
    # 验证场景存在
    scenario = await session.get(Scenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")

    # 创建数据集
    dataset_id = str(uuid.uuid4())
    dataset = Dataset(
        id=dataset_id,
        project_id=scenario.project_id,
        scenario_id=scenario_id,
        name=data.name,
        csv_data=data.csv_data,
    )

    session.add(dataset)
    await session.commit()
    await session.refresh(dataset)

    return DatasetResponse.model_validate(dataset)


@router.post("/{scenario_id}/datasets/import", response_model=ImportCsvResponse)
async def import_csv(
    scenario_id: str,
    dataset_id: str,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ImportCsvResponse:
    """导入 CSV (6.11)"""
    # 验证数据集存在
    dataset = await session.get(Dataset, dataset_id)
    if not dataset or dataset.scenario_id != scenario_id:
        raise HTTPException(status_code=404, detail="数据集不存在")

    # 读取 CSV 文件
    content = await file.read()

    # 解析 CSV
    try:
        csv_reader = csv.reader(io.TextIOWrapper(io.BytesIO(content), encoding='utf-8'))
        rows = list(csv_reader)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV 解析失败: {str(e)}")

    if not rows:
        raise HTTPException(status_code=400, detail="CSV 文件为空")

    columns = rows[0]
    row_count = len(rows) - 1

    # 更新数据集
    dataset.csv_data = content.decode('utf-8')
    await session.commit()
    await session.refresh(dataset)

    return ImportCsvResponse(
        id=dataset.id,
        name=dataset.name,
        row_count=row_count,
        columns=columns,
    )


@router.get("/{scenario_id}/datasets/{dataset_id}/export")
async def export_csv(
    scenario_id: str,
    dataset_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """导出 CSV (6.12)"""
    # 验证数据集存在
    dataset = await session.get(Dataset, dataset_id)
    if not dataset or dataset.scenario_id != scenario_id:
        raise HTTPException(status_code=404, detail="数据集不存在")

    # 返回 CSV 文件
    from fastapi.responses import Response

    return Response(
        content=dataset.csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{dataset.name}.csv"',
        },
    )


# ========== ========== ========== ========== ========== ==========
# 场景调试 (6.13)
# ========== ========== ========== ========== ========== ==========


def _generate_scenario_yaml(
    scenario: Scenario,
    steps: List[ScenarioStep],
    env_vars: Optional[Dict[str, str]] = None,
    dataset_vars: Optional[Dict[str, Any]] = None,
    override_vars: Optional[Dict[str, Any]] = None,
) -> str:
    """生成场景测试的 YAML 内容

    Args:
        scenario: 场景对象
        steps: 场景步骤列表
        env_vars: 环境变量
        dataset_vars: 数据集变量
        override_vars: 覆盖变量

    Returns:
        YAML 字符串
    """
    # 合并变量（优先级：override > dataset > environment > scenario）
    variables = {}

    # 1. 场景级变量
    if scenario.variables:
        variables.update(scenario.variables)

    # 2. 环境变量
    if env_vars:
        variables.update(env_vars)

    # 3. 数据集变量
    if dataset_vars:
        variables.update(dataset_vars)

    # 4. 覆盖变量（最高优先级）
    if override_vars:
        variables.update(override_vars)

    # 构建测试步骤
    teststeps = []
    for step in sorted(steps, key=lambda s: s.sort_order):
        step_dict = _convert_step_to_yaml(step)
        if step_dict:
            teststeps.append(step_dict)

    # 构建 YAML 结构
    yaml_dict = {
        "config": {
            "name": scenario.name,
            "variables": variables,
        }
    }

    if teststeps:
        yaml_dict["teststeps"] = teststeps

    # 生成 YAML
    return yaml.dump(yaml_dict, allow_unicode=True, sort_keys=False, default_flow_style=False)


def _convert_step_to_yaml(step: ScenarioStep) -> Optional[Dict[str, Any]]:
    """将场景步骤转换为 YAML 格式

    Args:
        step: 场景步骤对象

    Returns:
        YAML 步骤字典，如果不支持的类型返回 None
    """
    keyword_type = step.keyword_type
    keyword_name = step.keyword_name
    parameters = step.parameters or {}

    if keyword_type == "request":
        # HTTP 请求步骤
        teststep = {
            "name": step.description or keyword_name,
            "request": {
                "method": parameters.get("method", "GET"),
                "url": parameters.get("url", ""),
            }
        }

        # 添加可选参数
        if "headers" in parameters and parameters["headers"]:
            teststep["request"]["headers"] = parameters["headers"]

        if "params" in parameters and parameters["params"]:
            teststep["request"]["params"] = parameters["params"]

        if "json" in parameters and parameters["json"]:
            teststep["request"]["json"] = parameters["json"]

        if "body" in parameters and parameters["body"]:
            teststep["request"]["json"] = parameters["body"]

        # 添加验证规则
        if "validate" in parameters and parameters["validate"]:
            teststep["validate"] = parameters["validate"]

        # 添加提取规则
        if "extract" in parameters and parameters["extract"]:
            teststep["extract"] = parameters["extract"]

        return teststep

    elif keyword_type == "database":
        # 数据库操作步骤
        teststep = {
            "name": step.description or keyword_name,
            "testcase": keyword_name,
            "parameters": parameters,
        }
        return teststep

    elif keyword_type == "custom":
        # 自定义关键字步骤
        teststep = {
            "name": step.description or keyword_name,
            "testcase": keyword_name,
            "parameters": parameters,
        }
        return teststep

    elif keyword_type == "wait":
        # 等待步骤
        wait_seconds = parameters.get("seconds", 1)
        teststep = {
            "name": step.description or f"Wait {wait_seconds}s",
            "variables": {"sleep_time": wait_seconds},
            "testcase": "wait_step",
        }
        return teststep

    else:
        # 不支持的步骤类型
        return None


@router.post("/{scenario_id}/debug", response_model=DebugScenarioResponse)
async def debug_scenario(
    scenario_id: str,
    data: DebugScenarioRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DebugScenarioResponse:
    """调试场景 (6.13)

    执行场景测试并返回结果：
    1. 根据场景生成 YAML 测试文件
    2. 调用 sisyphus-api-engine 执行测试
    3. 收集执行结果和步骤详情
    4. 生成 Allure 报告 URL
    """
    # 1. 验证场景存在
    scenario = await session.get(Scenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="场景不存在")

    # 2. 查询场景步骤（按排序顺序）
    statement = (
        select(ScenarioStep)
        .where(ScenarioStep.scenario_id == scenario_id)
        .order_by(ScenarioStep.sort_order)
    )
    result = await session.execute(statement)
    steps = result.scalars().all()

    if not steps:
        raise HTTPException(status_code=400, detail="场景没有步骤，无法调试")

    # 3. 获取环境变量（如果指定了环境）
    env_vars = {}
    if data.environment_id:
        env = await session.get(ProjectEnvironment, data.environment_id)
        if not env:
            raise HTTPException(status_code=404, detail="环境不存在")

        # 查询环境变量
        var_statement = select(EnvVariable).where(
            EnvVariable.environment_id == data.environment_id
        )
        var_result = await session.execute(var_statement)
        env_variables = var_result.scalars().all()

        for var in env_variables:
            env_vars[var.name] = var.value

    # 4. 获取数据集变量（如果指定了数据集）
    dataset_vars = {}
    if data.dataset_id:
        dataset = await session.get(Dataset, data.dataset_id)
        if not dataset:
            raise HTTPException(status_code=404, detail="数据集不存在")

        # TODO: 解析 CSV 数据并提取第一行作为测试数据
        # 这里简化处理，直接跳过
        pass

    # 5. 生成 YAML 测试文件
    yaml_content = _generate_scenario_yaml(
        scenario=scenario,
        steps=list(steps),
        env_vars=env_vars if env_vars else None,
        dataset_vars=dataset_vars if dataset_vars else None,
        override_vars=data.variables,
    )

    # 6. 调用引擎执行测试
    executor = EngineExecutor()
    execution_result = executor.execute(yaml_content, timeout=300)

    # 7. 生成执行 ID
    execution_id = str(uuid.uuid4())

    # 8. 解析执行结果
    results = []
    if execution_result["success"]:
        # 从引擎输出中提取步骤结果
        engine_output = execution_result.get("result", {})
        teststeps = engine_output.get("teststeps", [])

        for idx, step_result in enumerate(teststeps):
            # 根据引擎返回的结果构建步骤结果
            step_data = steps[idx] if idx < len(steps) else None
            step_id = step_data.id if step_data else str(uuid.uuid4())

            # 判断步骤状态（根据引擎输出）
            status = "passed"
            error = None
            duration = 0.0

            if isinstance(step_result, dict):
                # 提取状态信息
                if "success" in step_result and not step_result["success"]:
                    status = "failed"
                    error = step_result.get("error", "未知错误")

                # 提取耗时信息
                if "duration" in step_result:
                    duration = step_result["duration"]
            elif isinstance(step_result, str) and step_result == "failed":
                status = "failed"
                error = "步骤执行失败"

            results.append(
                DebugScenarioStepResult(
                    step_id=step_id,
                    status=status,
                    duration=duration,
                    error=error,
                )
            )
    else:
        # 执行失败，返回错误信息
        error_msg = execution_result.get("error", "未知错误")
        results.append(
            DebugScenarioStepResult(
                step_id=str(uuid.uuid4()),
                status="failed",
                duration=0.0,
                error=error_msg,
            )
        )

    # 9. 生成 Allure 报告 URL
    report_url = f"/reports/{execution_id}/allure"

    # 10. 返回调试结果
    return DebugScenarioResponse(
        execution_id=execution_id,
        report_url=report_url,
        results=results,
    )
