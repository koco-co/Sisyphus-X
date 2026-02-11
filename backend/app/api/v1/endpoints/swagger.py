"""
Swagger/OpenAPI 导入解析模块
"""

import json
from typing import Any

import yaml
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models.project import Interface

router = APIRouter()


def parse_openapi_spec(spec: dict[str, Any], project_id: int) -> list[dict]:
    """解析 OpenAPI/Swagger 规范，提取接口信息"""
    interfaces = []

    # 获取 basePath (Swagger 2.0) 或 servers (OpenAPI 3.0)
    base_path = ""
    if "basePath" in spec:
        base_path = spec.get("basePath", "")
    elif "servers" in spec and len(spec["servers"]) > 0:
        # OpenAPI 3.0 - 从 servers[0].url 提取 path
        server_url = spec["servers"][0].get("url", "")
        if server_url.startswith("/"):
            base_path = server_url

    paths = spec.get("paths", {})

    for path, path_item in paths.items():
        full_path = base_path + path if base_path else path

        for method in ["get", "post", "put", "delete", "patch", "options", "head"]:
            if method not in path_item:
                continue

            operation = path_item[method]

            # 提取接口信息
            interface_data = {
                "project_id": project_id,
                "name": operation.get("summary")
                or operation.get("operationId")
                or f"{method.upper()} {path}",
                "url": full_path,
                "method": method.upper(),
                "description": operation.get("description", ""),
                "status": "draft",
                "headers": {},
                "params": {},
                "body": {},
                "body_type": "json",
                "schema_snapshot": operation,  # 保存原始定义
            }

            # 提取参数
            parameters = operation.get("parameters", []) + path_item.get("parameters", [])
            for param in parameters:
                param_in = param.get("in")
                param_name = param.get("name")

                if param_in == "query":
                    interface_data["params"][param_name] = param.get("default", "")
                elif param_in == "header":
                    interface_data["headers"][param_name] = param.get("default", "")

            # 提取请求体 (OpenAPI 3.0)
            if "requestBody" in operation:
                request_body = operation["requestBody"]
                content = request_body.get("content", {})
                if "application/json" in content:
                    interface_data["body_type"] = "json"
                    schema = content["application/json"].get("schema", {})
                    interface_data["body"] = schema.get("example", {})
                elif "multipart/form-data" in content:
                    interface_data["body_type"] = "form-data"
                elif "application/x-www-form-urlencoded" in content:
                    interface_data["body_type"] = "x-www-form-urlencoded"

            interfaces.append(interface_data)

    return interfaces


@router.post("/import/swagger")
async def import_swagger(
    project_id: int = Form(...),
    file: UploadFile = File(None),
    url: str = Form(None),
    session: AsyncSession = Depends(get_session),
):
    """导入 Swagger/OpenAPI 文档"""
    import httpx

    spec = None

    # 从文件读取
    if file:
        content = await file.read()
        try:
            if file.filename.endswith((".yaml", ".yml")):
                spec = yaml.safe_load(content)
            else:
                spec = json.loads(content)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"解析文件失败: {e}")

    # 从 URL 读取
    elif url:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                response.raise_for_status()
                content_type = response.headers.get("content-type", "")
                if "yaml" in content_type or url.endswith((".yaml", ".yml")):
                    spec = yaml.safe_load(response.text)
                else:
                    spec = response.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"获取 URL 失败: {e}")

    else:
        raise HTTPException(status_code=400, detail="请提供文件或 URL")

    # 解析接口
    try:
        interfaces_data = parse_openapi_spec(spec, project_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"解析 OpenAPI 文档失败: {e}")

    # 创建接口记录
    created_count = 0
    for data in interfaces_data:
        interface = Interface(**data)
        session.add(interface)
        created_count += 1

    await session.commit()

    return {"success": True, "message": f"成功导入 {created_count} 个接口", "count": created_count}
