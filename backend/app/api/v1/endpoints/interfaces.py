import time
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, func, select

from app.api.deps import get_current_user
from app.core.db import get_session, sync_session_maker
from app.core.storage import MINIO_BUCKET, get_minio_client
from app.models.interface_history import InterfaceHistory
from app.models.project import Interface, InterfaceFolder
from app.schemas.interface import InterfaceSendRequest, InterfaceSendResponse
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


@router.get("/", response_model=PageResponse[Interface])
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


@router.post("/", response_model=Interface)
async def create_interface(interface: Interface, session: AsyncSession = Depends(get_session)):
    session.add(interface)
    await session.commit()
    await session.refresh(interface)
    return interface


# === 接口文件夹管理 ===


@router.get("/folders", response_model=list[InterfaceFolder])
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


@router.post("/folders", response_model=InterfaceFolder)
async def create_folder(folder: InterfaceFolder, session: AsyncSession = Depends(get_session)):
    """创建接口文件夹"""
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


@router.get("/{interface_id}", response_model=Interface)
async def read_interface(interface_id: int, session: AsyncSession = Depends(get_session)):
    interface = await session.get(Interface, interface_id)
    if not interface:
        raise HTTPException(status_code=404, detail="Interface not found")
    return interface


@router.put("/{interface_id}", response_model=Interface)
async def update_interface(
    interface_id: int, data: dict, session: AsyncSession = Depends(get_session)
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
async def delete_interface(interface_id: int, session: AsyncSession = Depends(get_session)):
    """删除接口"""
    interface = await session.get(Interface, interface_id)
    if not interface:
        raise HTTPException(status_code=404, detail="Interface not found")

    await session.delete(interface)
    await session.commit()
    return {"deleted": interface_id}


@router.post("/debug/send", response_model=InterfaceSendResponse)
async def send_interface_request(request: InterfaceSendRequest):
    async with httpx.AsyncClient(trust_env=False) as client:
        start_time = time.time()
        try:
            # 处理文件
            files = None
            data = None
            json_body = None

            if request.files:
                minio_client = get_minio_client()
                files = {}
                for field_name, object_name in request.files.items():
                    try:
                        # 从 MinIO 获取文件流
                        response = minio_client.get_object(MINIO_BUCKET, object_name)
                        file_content = response.read()
                        response.close()
                        response.release_conn()

                        # 获取文件名 (假设 object_name 包含扩展名，或者需要从元数据获取)
                        filename = object_name.split("/")[-1]
                        files[field_name] = (filename, file_content)
                    except Exception as e:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Failed to retrieve file {object_name}: {str(e)}",
                        )

            # 处理 Body
            if request.body:
                if files:
                    # 如果有文件，Body 通常作为 form data 发送
                    # 假设 request.body 是字典
                    if isinstance(request.body, dict):
                        data = {k: str(v) for k, v in request.body.items()}
                    else:
                        # 这里的逻辑可能需要根据具体需求调整，如果 body 不是 dict 且有 files，可能不兼容
                        data = {"data": str(request.body)}
                else:
                    json_body = request.body

            response = await client.request(
                method=request.method,
                url=request.url,
                headers=request.headers,
                params=request.params,
                json=json_body,
                data=data,
                files=files,
                timeout=request.timeout,
            )
            elapsed = time.time() - start_time

            try:
                body = response.json()
            except Exception:  # noqa: BLE001 (ignore bare except warning)
                body = response.text

            return InterfaceSendResponse(
                status_code=response.status_code,
                headers=dict(response.headers),
                body=body,
                elapsed=elapsed,
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))


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


@router.put("/{interface_id}/move")
async def move_interface(
    interface_id: int,
    data: dict[str, int],
    session: AsyncSession = Depends(get_session),
) -> Interface:
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


@router.post("/{interface_id}/copy", response_model=Interface)
async def copy_interface(
    interface_id: int,
    data: dict[str, str],
    session: AsyncSession = Depends(get_session),
) -> Interface:
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


@router.get("/search", response_model=PageResponse[Interface])
async def search_interfaces(
    project_id: int,
    q: str | None = Query(None, description="Search query"),
    method: str | None = Query(None, description="Filter by method"),
    folder_id: int | None = Query(None, description="Filter by folder"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> PageResponse[Interface]:
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
