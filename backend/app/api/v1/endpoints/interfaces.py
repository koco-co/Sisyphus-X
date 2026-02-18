import time
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, func, select

from app.core.db import get_session, sync_session_maker
from app.core.storage import MINIO_BUCKET, get_minio_client
from app.models.project import Interface, InterfaceFolder
from app.schemas.interface import (
    EngineExecuteRequest,
    EngineExecuteResponse,
    ImportFromCurlRequest,
    InterfaceCreate,
    InterfaceResponse,
    InterfaceSendRequest,
    InterfaceSendResponse,
    FolderCreate,
    FolderResponse,
)
from app.schemas.interface_test_case import (
    GenerateTestCaseRequest,
    GenerateTestCaseResponse,
    PreviewYamlRequest,
    PreviewYamlResponse,
)
from app.schemas.pagination import PageResponse
from app.services.curl_parser import parse_curl_command
from app.services.test_case_generator import TestCaseGenerator

router = APIRouter()


@router.get("/", response_model=PageResponse[InterfaceResponse])
async def read_interfaces(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    project_id: int | None = Query(None),
    folder_id: int | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    skip = (page - 1) * size

    statement = select(Interface)
    count_statement = select(func.count()).select_from(Interface)

    if project_id is not None:
        statement = statement.where(col(Interface.project_id) == project_id)
        count_statement = count_statement.where(col(Interface.project_id) == project_id)

    if folder_id is not None:
        statement = statement.where(col(Interface.folder_id) == folder_id)
        count_statement = count_statement.where(col(Interface.folder_id) == folder_id)

    total = int((await session.execute(count_statement)).scalar_one() or 0)
    result = await session.execute(statement.offset(skip).limit(size))
    interfaces = list(result.scalars().all())

    pages = (total + size - 1) // size

    return PageResponse(items=interfaces, total=total, page=page, size=size, pages=pages)


@router.post("/", response_model=InterfaceResponse)
async def create_interface(
    data: InterfaceCreate, session: AsyncSession = Depends(get_session)
):
    interface = Interface(**data.model_dump())
    session.add(interface)
    await session.commit()
    await session.refresh(interface)
    return interface


# === 接口文件夹管理 ===


@router.get("/folders", response_model=list[FolderResponse])
async def list_folders(
    project_id: int | None = Query(None), session: AsyncSession = Depends(get_session)
):
    """获取接口文件夹树"""
    statement = select(InterfaceFolder)
    if project_id is not None:
        statement = statement.where(col(InterfaceFolder.project_id) == project_id)

    result = await session.execute(statement)
    folders = result.scalars().all()
    return folders


@router.post("/folders", response_model=FolderResponse)
async def create_folder(
    data: FolderCreate, session: AsyncSession = Depends(get_session)
):
    """创建接口文件夹"""
    folder = InterfaceFolder(**data.model_dump())
    session.add(folder)
    await session.commit()
    await session.refresh(folder)
    return folder


@router.delete("/folders/{folder_id}")
async def delete_folder(folder_id: int, session: AsyncSession = Depends(get_session)):
    """删除接口文件夹"""
    folder = await session.get(InterfaceFolder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # 检查是否有子文件夹或接口
    child_folders_stmt = (
        select(func.count())
        .select_from(InterfaceFolder)
        .where(col(InterfaceFolder.parent_id) == folder_id)
    )
    child_count = int((await session.execute(child_folders_stmt)).scalar_one() or 0)

    interfaces_stmt = (
        select(func.count()).select_from(Interface).where(col(Interface.folder_id) == folder_id)
    )
    interface_count = int((await session.execute(interfaces_stmt)).scalar_one() or 0)

    if child_count > 0 or interface_count > 0:
        raise HTTPException(
            status_code=400, detail="Cannot delete folder with children or interfaces"
        )

    await session.delete(folder)
    await session.commit()
    return {"deleted": folder_id}


@router.post("/import-from-curl", response_model=InterfaceResponse)
async def import_from_curl(
    request: ImportFromCurlRequest,
    session: AsyncSession = Depends(get_session),
) -> InterfaceResponse:
    """从 cURL 命令导入接口"""
    # 解析 cURL 命令
    try:
        parsed = parse_curl_command(request.curl_command)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"cURL 解析失败: {str(e)}")

    # 从解析结果创建接口
    interface = Interface(
        project_id="",  # 将从folder获取project_id
        folder_id=request.folder_id,
        name=request.name or f"从 cURL 导入 {parsed['method']}",
        url=parsed["url"],
        method=parsed["method"],
        status="draft",
        description="从 cURL 命令导入",
        headers=parsed.get("headers", {}),
        params=parsed.get("params", {}),
        body=parsed.get("body", {}),
        body_type=parsed.get("body_type", "json"),
        cookies={},
        order=0,
        auth_config=parsed.get("auth", {}),
    )

    # 如果提供了folder_id,获取project_id
    if request.folder_id:
        folder = await session.get(InterfaceFolder, request.folder_id)
        if folder:
            interface.project_id = folder.project_id

    session.add(interface)
    await session.commit()
    await session.refresh(interface)

    return interface


@router.get("/{interface_id}", response_model=InterfaceResponse)
async def read_interface(interface_id: str, session: AsyncSession = Depends(get_session)):
    interface = await session.get(Interface, interface_id)
    if not interface:
        raise HTTPException(status_code=404, detail="Interface not found")
    return interface


@router.put("/{interface_id}", response_model=InterfaceResponse)
async def update_interface(
    interface_id: str, data: dict, session: AsyncSession = Depends(get_session)
):
    """更新接口"""
    from datetime import datetime

    interface = await session.get(Interface, interface_id)
    if not interface:
        raise HTTPException(status_code=404, detail="Interface not found")

    # 允许更新的字段
    allowed_fields = [
        "name",
        "url",
        "method",
        "status",
        "description",
        "headers",
        "params",
        "body",
        "body_type",
        "cookies",
        "folder_id",
    ]
    for key, value in data.items():
        if key in allowed_fields:
            setattr(interface, key, value)

    interface.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(interface)
    return interface


@router.delete("/{interface_id}")
async def delete_interface(interface_id: str, session: AsyncSession = Depends(get_session)):
    """删除接口"""
    interface = await session.get(Interface, interface_id)
    if not interface:
        raise HTTPException(status_code=404, detail="Interface not found")

    await session.delete(interface)
    await session.commit()
    return {"deleted": interface_id}



@router.post("/debug/send", response_model=InterfaceSendResponse)
async def send_interface_request(request: InterfaceSendRequest):
    """Send interface request using sisyphus-api-engine.

    This endpoint now uses YAML engine for all requests to ensure:
    - YAML files are generated for audit/trail
    - Requests can be replayed via engine
    - Consistent with sisyphus-api-engine integration
    """
    from app.services.engine_executor import EngineExecutor
    from app.services.variable_replacer import VariableReplacer
    from app.services.yaml_generator import YAMLGenerator
    from app.models.project import ProjectEnvironment

    # Get interface from database
    async with get_session() as session:
        interface = await session.get(Interface, request.interface_id)
        if not interface:
            raise HTTPException(status_code=404, detail="Interface not found")

        # Get environment if specified
        environment = None
        if request.environment_id:
            environment = await session.get(ProjectEnvironment, request.environment_id)
            if not environment:
                raise HTTPException(status_code=404, detail="Environment not found")

        # Generate YAML from interface
        generator = YAMLGenerator()

        # Build step config
        step_config = {
            "name": interface.name or "API Request",
            "type": "request",
            "method": interface.method,
            "url": interface.url,
        }

        # Add headers
        if interface.headers:
            step_config["headers"] = interface.headers
        if environment and environment.headers:
            merged_headers = {**(environment.headers or {}), **step_config.get("headers", {})}
            step_config["headers"] = merged_headers

        # Add params
        if interface.params:
            step_config["params"] = interface.params

        # Add body
        if interface.body and interface.body_type != "none":
            if interface.body_type == "json":
                step_config["json"] = interface.body
            elif interface.body_type == "x-www-form-urlencoded":
                step_config["data"] = interface.body
            else:
                step_config["body"] = interface.body

        # Add cookies
        if interface.cookies:
            step_config["cookies"] = interface.cookies

        # Add auth config if exists
        if interface.auth_config:
            step_config["auth"] = interface.auth_config

        # Replace variables if environment provided
        if (request.variables or (environment and environment.variables)):
            all_vars = {**(request.variables or {}), **(environment.variables or {})}
            replacer = VariableReplacer()

            # Replace in URL
            if step_config.get("url"):
                step_config["url"], _ = replacer.replace(
                    step_config["url"],
                    all_vars,
                )

            # Replace in headers
            if step_config.get("headers"):
                step_config["headers"], _ = replacer.replace_dict(
                    step_config["headers"],
                    all_vars,
                )

            # Replace in params
            if step_config.get("params"):
                step_config["params"], _ = replacer.replace_dict(
                    step_config["params"],
                    all_vars,
                )

            # Replace in body
            if step_config.get("json"):
                import json as json_lib
                body_str = json_lib.dumps(step_config["json"])
                replaced, _ = replacer.replace(body_str, all_vars)
                step_config["json"] = json_lib.loads(replaced)
            elif step_config.get("data"):
                step_config["data"], _ = replacer.replace_dict(
                    step_config["data"],
                    all_vars,
                )

        # Add environment base_url if available
        base_url = None
        if environment and environment.domain:
            base_url = environment.domain

        # Build test case config
        test_case_config = {
            "name": interface.name or "API Request",
            "description": interface.description or "",
            "config": {
                "timeout": request.timeout,
            },
            "steps": [step_config],
        }

        if base_url:
            test_case_config["config"]["base_url"] = base_url

        # Generate YAML
        yaml_content = generator.generate_yaml(test_case_config)

        # Execute with engine
        executor = EngineExecutor()

        start_time = time.time()
        result = executor.execute(
            yaml_content=yaml_content,
            base_url=base_url,
            timeout=request.timeout,
        )
        elapsed = time.time() - start_time

        # Return result in same format as before
        if result["success"]:
            return InterfaceSendResponse(
                status_code=result.get("status_code", 200),
                headers=result.get("headers", {}),
                body=result.get("body", {}),
                elapsed=elapsed,
            )
        else:
            # If execution failed, return error response
            raise HTTPException(
                status_code=500,
                detail=f"Engine execution failed: {result.get('error', 'Unknown error')}",
            )


@router.post("/parse-curl")
async def parse_curl(data: dict[str, str]) -> dict[str, Any]:
    """Parse cURL command into structured request data.

    Args:
        data: Dictionary with curl_command key

    Returns:
        Parsed request data

    Raises:
        HTTPException: If cURL command is invalid
    """
    curl_command = data.get("curl_command", "")
    if not curl_command:
        raise HTTPException(status_code=400, detail="curl_command is required")

    try:
        return parse_curl_command(curl_command)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{interface_id}/generate-test-case", response_model=GenerateTestCaseResponse)
async def generate_test_case(
    interface_id: int,
    data: GenerateTestCaseRequest,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Generate test case from interface.

    Args:
        interface_id: Interface ID
        data: Test case generation request
        session: Database session

    Returns:
        Generated test case with YAML content

    Raises:
        HTTPException: If interface or environment not found
    """
    with sync_session_maker() as sync_session:
        generator = TestCaseGenerator(sync_session)
        try:
            return generator.generate(
                interface_id=interface_id,
                case_name=data.case_name,
                keyword_name=data.keyword_name,
                environment_id=data.environment_id,
                scenario_id=data.scenario_id,
                auto_assertion=data.auto_assertion,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))


@router.post("/{interface_id}/preview-yaml", response_model=PreviewYamlResponse)
async def preview_yaml(
    interface_id: int,
    data: PreviewYamlRequest,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Preview generated YAML without saving.

    Args:
        interface_id: Interface ID
        data: Preview request
        session: Database session

    Returns:
        YAML content string

    Raises:
        HTTPException: If interface or environment not found
    """
    with sync_session_maker() as sync_session:
        generator = TestCaseGenerator(sync_session)
        try:
            yaml_content = generator.preview(
                interface_id=interface_id,
                environment_id=data.environment_id,
                auto_assertion=data.auto_assertion,
            )
            return PreviewYamlResponse(yaml_content=yaml_content)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))


@router.put("/{interface_id}/move", response_model=InterfaceResponse)
async def move_interface(
    interface_id: str,
    data: dict[str, str],
    session: AsyncSession = Depends(get_session),
) -> InterfaceResponse:
    """Move interface to another folder.

    Args:
        interface_id: Interface ID
        data: Dictionary with target_folder_id
        session: Database session

    Returns:
        Updated interface

    Raises:
        HTTPException: If interface not found
    """
    interface = await session.get(Interface, interface_id)
    if not interface:
        raise HTTPException(status_code=404, detail="Interface not found")

    target_folder_id = data.get("target_folder_id")
    interface.folder_id = target_folder_id

    await session.commit()
    await session.refresh(interface)

    return interface


@router.post("/{interface_id}/copy", response_model=InterfaceResponse)
async def copy_interface(
    interface_id: int,
    data: dict[str, str],
    session: AsyncSession = Depends(get_session),
) -> InterfaceResponse:
    """Copy interface.

    Args:
        interface_id: Source interface ID
        data: Dictionary with name and optional target_folder_id
        session: Database session

    Returns:
        New interface

    Raises:
        HTTPException: If interface not found
    """
    source = await session.get(Interface, interface_id)
    if not source:
        raise HTTPException(status_code=404, detail="Interface not found")

    # Create copy
    new_interface = Interface(
        project_id=source.project_id,
        folder_id=data.get("target_folder_id", source.folder_id),
        name=data.get("name", f"{source.name} - 副本"),
        url=source.url,
        method=source.method,
        status=source.status,
        description=source.description,
        headers=source.headers.copy() if source.headers else {},
        params=source.params.copy() if source.params else {},
        body=source.body.copy() if source.body else {},
        body_type=source.body_type,
        cookies=source.cookies.copy() if source.cookies else {},
        order=source.order,
        auth_config=source.auth_config.copy() if source.auth_config else {},
    )

    session.add(new_interface)
    await session.commit()
    await session.refresh(new_interface)

    return new_interface


@router.get("/search", response_model=PageResponse[InterfaceResponse])
async def search_interfaces(
    project_id: int,
    q: str | None = Query(None, description="Search query"),
    method: str | None = Query(None, description="Filter by method"),
    folder_id: int | None = Query(None, description="Filter by folder"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> PageResponse[InterfaceResponse]:
    """Search and filter interfaces.

    Args:
        project_id: Project ID
        q: Search query (name/URL)
        method: Filter by HTTP method
        folder_id: Filter by folder ID
        page: Page number
        size: Page size
        session: Database session

    Returns:
        Paginated interface list
    """
    skip = (page - 1) * size

    statement = select(Interface).where(col(Interface.project_id) == project_id)
    count_statement = select(func.count()).select_from(Interface).where(
        col(Interface.project_id) == project_id
    )

    if q:
        search_pattern = f"%{q}%"
        statement = statement.where(
            (col(Interface.name).ilike(search_pattern))
            | (col(Interface.url).ilike(search_pattern))
        )
        count_statement = count_statement.where(
            (col(Interface.name).ilike(search_pattern))
            | (col(Interface.url).ilike(search_pattern))
        )

    if method:
        statement = statement.where(col(Interface.method) == method.upper())
        count_statement = count_statement.where(col(Interface.method) == method.upper())

    if folder_id is not None:
        statement = statement.where(col(Interface.folder_id) == folder_id)
        count_statement = count_statement.where(col(Interface.folder_id) == folder_id)

    total = int((await session.execute(count_statement)).scalar_one() or 0)
    result = await session.execute(statement.offset(skip).limit(size))
    interfaces = list(result.scalars().all())

    pages = (total + size - 1) // size

    return PageResponse(items=interfaces, total=total, page=page, size=size, pages=pages)


@router.post("/debug/execute-engine", response_model=EngineExecuteResponse)
async def execute_with_engine(
    request: EngineExecuteRequest,
    session: AsyncSession = Depends(get_session),
) -> EngineExecuteResponse:
    """Execute interface using sisyphus-api-engine.

    Args:
        request: Execute request with interface_id or yaml_content
        session: Database session

    Returns:
        Execution result with success status

    Raises:
        HTTPException: If interface/environment not found or execution fails
    """
    from app.services.engine_executor import EngineExecutor
    from app.services.variable_replacer import VariableReplacer
    from app.services.yaml_generator import YAMLGenerator

    # Get YAML content
    yaml_content = request.yaml_content

    # If interface_id and environment_id provided, generate YAML from database
    if request.interface_id and not yaml_content:
        interface = await session.get(Interface, request.interface_id)
        if not interface:
            raise HTTPException(status_code=404, detail="Interface not found")

        # Get environment if specified
        environment = None
        if request.environment_id:
            from app.models.project import ProjectEnvironment
            environment = await session.get(ProjectEnvironment, request.environment_id)
            if not environment:
                raise HTTPException(status_code=404, detail="Environment not found")

        # Generate YAML from interface
        generator = YAMLGenerator()

        # Build step config
        step_config = {
            "name": interface.name or "API Request",
            "type": "request",
            "method": interface.method,
            "url": interface.url,
        }

        # Add headers
        if interface.headers:
            step_config["headers"] = interface.headers
        if environment and environment.headers:
            merged_headers = {**(environment.headers or {}), **step_config.get("headers", {})}
            step_config["headers"] = merged_headers

        # Add params
        if interface.params:
            step_config["params"] = interface.params

        # Add body
        if interface.body and interface.body_type != "none":
            if interface.body_type == "json":
                step_config["json"] = interface.body
            elif interface.body_type == "x-www-form-urlencoded":
                step_config["data"] = interface.body
            else:
                step_config["body"] = interface.body

        # Add cookies
        if interface.cookies:
            step_config["cookies"] = interface.cookies

        # Replace variables if environment provided
        if request.variables or (environment and environment.variables):
            all_vars = {**(request.variables or {}), **(environment.variables or {})}
            replacer = VariableReplacer()

            # Replace in URL
            if step_config.get("url"):
                step_config["url"], _ = replacer.replace(
                    step_config["url"], all_vars
                )

            # Replace in headers
            if step_config.get("headers"):
                for key, value in step_config["headers"].items():
                    replaced, _ = replacer.replace(str(value), all_vars)
                    step_config["headers"][key] = replaced

            # Replace in params
            if step_config.get("params"):
                for key, value in step_config["params"].items():
                    replaced, _ = replacer.replace(str(value), all_vars)
                    step_config["params"][key] = replaced

            # Replace in body
            if step_config.get("json"):
                import json as json_lib
                body_str = json_lib.dumps(step_config["json"])
                replaced, _ = replacer.replace(body_str, all_vars)
                step_config["json"] = json_lib.loads(replaced)

        # Build test case config
        test_case_config = {
            "name": interface.name or "API Test",
            "description": interface.description or "",
            "config": {
                "timeout": request.timeout,
            },
            "steps": [step_config],
        }

        # Add environment base_url if available
        if environment and environment.domain:
            test_case_config["config"]["base_url"] = environment.domain

        # Generate YAML
        yaml_content = generator.generate_yaml(test_case_config)

    if not yaml_content:
        raise HTTPException(
            status_code=400,
            detail="Must provide either interface_id or yaml_content"
        )

    # Execute with engine
    executor = EngineExecutor()

    # Get base URL from environment if provided
    base_url = None
    if request.environment_id:
        from app.models.project import ProjectEnvironment
        environment = await session.get(ProjectEnvironment, request.environment_id)
        if environment:
            base_url = environment.domain

    result = executor.execute(
        yaml_content=yaml_content,
        base_url=base_url,
        timeout=request.timeout,
    )

    return EngineExecuteResponse(**result)
