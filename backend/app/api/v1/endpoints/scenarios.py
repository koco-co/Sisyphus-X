import asyncio
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import func, select

from app.core.db import get_session
from app.models.report import TestReport, TestReportDetail
from app.models.scenario import TestScenario
from app.schemas.pagination import PageResponse

router = APIRouter()

# --- Scenario CRUD ---


class ScenarioCreate(BaseModel):
    project_id: int
    name: str
    cron_expression: str | None = None
    graph_data: dict = {}


@router.get("/", response_model=PageResponse[TestScenario])
async def list_scenarios(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    project_id: int = Query(None),
    session: AsyncSession = Depends(get_session),
):
    skip = (page - 1) * size
    statement = select(TestScenario)
    count_statement = select(func.count()).select_from(TestScenario)

    if project_id:
        statement = statement.where(TestScenario.project_id == project_id)
        count_statement = count_statement.where(TestScenario.project_id == project_id)

    total = (await session.execute(count_statement)).scalar()
    result = await session.execute(statement.offset(skip).limit(size))
    scenarios = result.scalars().all()

    pages = (total + size - 1) // size

    return PageResponse(items=scenarios, total=total, page=page, size=size, pages=pages)


@router.post("/", response_model=TestScenario)
async def create_scenario(data: ScenarioCreate, session: AsyncSession = Depends(get_session)):
    scenario = TestScenario(**data.model_dump())
    session.add(scenario)
    await session.commit()
    await session.refresh(scenario)
    return scenario


@router.get("/{scenario_id}", response_model=TestScenario)
async def get_scenario(scenario_id: int, session: AsyncSession = Depends(get_session)):
    scenario = await session.get(TestScenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@router.put("/{scenario_id}", response_model=TestScenario)
async def update_scenario(
    scenario_id: int, data: ScenarioCreate, session: AsyncSession = Depends(get_session)
):
    scenario = await session.get(TestScenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    for key, value in data.model_dump().items():
        setattr(scenario, key, value)
    await session.commit()
    await session.refresh(scenario)
    return scenario


@router.delete("/{scenario_id}")
async def delete_scenario(scenario_id: int, session: AsyncSession = Depends(get_session)):
    scenario = await session.get(TestScenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    await session.delete(scenario)
    await session.commit()
    return {"deleted": scenario_id}


# --- Scenario Execution Engine ---


class NodeResult(BaseModel):
    node_id: str
    status: str  # 'success', 'failed', 'skipped'
    response: Any = None
    error: str | None = None
    elapsed: float = 0.0


class ScenarioRunRequest(BaseModel):
    graph_data: dict  # { nodes: [...], edges: [...] }


class ScenarioRunResponse(BaseModel):
    status: str
    results: list[NodeResult]
    total_elapsed: float


async def execute_node(node: dict, context: dict) -> NodeResult:
    """Execute a single node in the scenario graph."""
    node_id = node.get("id")
    node_type = node.get("type", "default")
    data = node.get("data", {})

    import time

    start = time.time()

    try:
        if node_type == "input":
            # Start node - just pass through
            return NodeResult(node_id=node_id, status="success", elapsed=0.0)

        elif node_type == "output":
            # End node - just pass through
            return NodeResult(node_id=node_id, status="success", elapsed=0.0)

        else:
            # Default: treat as API request node
            label = data.get("label", "")
            # In a real implementation, we'd look up the interface details
            # For now, simulate a request
            async with httpx.AsyncClient() as client:
                # Simulated request - in production, extract URL/method from node data
                if "url" in data:
                    response = await client.request(
                        method=data.get("method", "GET"), url=data["url"], timeout=10
                    )
                    elapsed = time.time() - start
                    return NodeResult(
                        node_id=node_id,
                        status="success" if response.status_code < 400 else "failed",
                        response={"status_code": response.status_code, "body": response.text[:500]},
                        elapsed=elapsed,
                    )
                else:
                    # Simulated delay node for demo
                    await asyncio.sleep(0.5)
                    elapsed = time.time() - start
                    return NodeResult(
                        node_id=node_id,
                        status="success",
                        response={"message": f"Executed: {label}"},
                        elapsed=elapsed,
                    )
    except Exception as e:
        elapsed = time.time() - start
        return NodeResult(node_id=node_id, status="failed", error=str(e), elapsed=elapsed)


def topological_sort(nodes: list, edges: list) -> list:
    """Sort nodes in execution order based on edges."""
    # Build adjacency list
    graph = {n["id"]: [] for n in nodes}
    in_degree = {n["id"]: 0 for n in nodes}

    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        graph[source].append(target)
        in_degree[target] += 1

    # Find nodes with no incoming edges
    queue = [n["id"] for n in nodes if in_degree[n["id"]] == 0]
    sorted_nodes = []

    while queue:
        node_id = queue.pop(0)
        sorted_nodes.append(node_id)
        for neighbor in graph.get(node_id, []):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return sorted_nodes


@router.post("/run", response_model=ScenarioRunResponse)
async def run_scenario(request: ScenarioRunRequest, session: AsyncSession = Depends(get_session)):
    """Execute a scenario graph and return results."""
    import time

    start = time.time()

    nodes = request.graph_data.get("nodes", [])
    edges = request.graph_data.get("edges", [])

    # Sort nodes in execution order
    execution_order = topological_sort(nodes, edges)

    # Create node lookup
    node_map = {n["id"]: n for n in nodes}

    # Execute nodes in order
    results = []
    context = {}

    for node_id in execution_order:
        node = node_map.get(node_id)
        if node:
            result = await execute_node(node, context)
            results.append(result)
            context[node_id] = result

    total_elapsed = time.time() - start

    # Determine overall status
    failed = any(r.status == "failed" for r in results)
    overall_status = "failed" if failed else "success"

    # 创建测试报告
    success_count = sum(1 for r in results if r.status == "success")
    failed_count = sum(1 for r in results if r.status == "failed")

    # 格式化执行时长
    if total_elapsed < 1:
        duration_str = f"{int(total_elapsed * 1000)}ms"
    elif total_elapsed < 60:
        duration_str = f"{int(total_elapsed)}s"
    else:
        minutes = int(total_elapsed // 60)
        seconds = int(total_elapsed % 60)
        duration_str = f"{minutes}m {seconds}s"

    from datetime import datetime

    report = TestReport(
        scenario_id=None,  # TODO: 如果有 scenario_id 可以传入
        name=f"场景执行报告_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        status=overall_status,
        total=len(results),
        success=success_count,
        failed=failed_count,
        duration=duration_str,
        start_time=datetime.utcnow(),
        end_time=datetime.utcnow(),
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)

    # 创建报告详情
    for result in results:
        detail = TestReportDetail(
            report_id=report.id,
            node_id=result.node_id,
            node_name=result.node_id,  # TODO: 从 node 数据获取 label
            status=result.status,
            request_data=None,
            response_data=result.response if isinstance(result.response, dict) else None,
            error_msg=result.error,
            elapsed=result.elapsed,
        )
        session.add(detail)

    await session.commit()

    return ScenarioRunResponse(status=overall_status, results=results, total_elapsed=total_elapsed)
