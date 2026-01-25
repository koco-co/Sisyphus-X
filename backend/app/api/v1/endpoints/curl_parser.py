"""
curl 命令解析模块
"""
import re
import shlex
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_session
from app.models.project import Interface

router = APIRouter()


def parse_curl_command(curl_command: str) -> Dict[str, Any]:
    """
    解析 curl 命令，提取请求信息
    
    支持的选项:
    - -X, --request: HTTP 方法
    - -H, --header: 请求头
    - -d, --data: 请求体
    - --data-raw: 原始请求体
    - -b, --cookie: Cookie
    """
    result = {
        "method": "GET",
        "url": "",
        "headers": {},
        "body": "",
        "body_type": "json",
        "cookies": {},
        "params": {}
    }
    
    # 规范化 curl 命令
    curl_command = curl_command.strip()
    if curl_command.startswith("curl "):
        curl_command = curl_command[5:]
    
    # 处理多行命令 (反斜杠续行)
    curl_command = re.sub(r'\\\s*\n\s*', ' ', curl_command)
    
    try:
        tokens = shlex.split(curl_command)
    except ValueError:
        # 如果解析失败，尝试简单分割
        tokens = curl_command.split()
    
    i = 0
    while i < len(tokens):
        token = tokens[i]
        
        # HTTP 方法
        if token in ('-X', '--request'):
            if i + 1 < len(tokens):
                result["method"] = tokens[i + 1].upper()
                i += 2
                continue
        
        # 请求头
        elif token in ('-H', '--header'):
            if i + 1 < len(tokens):
                header = tokens[i + 1]
                if ':' in header:
                    key, value = header.split(':', 1)
                    result["headers"][key.strip()] = value.strip()
                i += 2
                continue
        
        # 请求体
        elif token in ('-d', '--data', '--data-raw', '--data-binary'):
            if i + 1 < len(tokens):
                result["body"] = tokens[i + 1]
                result["method"] = result["method"] if result["method"] != "GET" else "POST"
                i += 2
                continue
        
        # Cookie
        elif token in ('-b', '--cookie'):
            if i + 1 < len(tokens):
                cookie_str = tokens[i + 1]
                for part in cookie_str.split(';'):
                    if '=' in part:
                        key, value = part.split('=', 1)
                        result["cookies"][key.strip()] = value.strip()
                i += 2
                continue
        
        # URL (不以 - 开头的参数)
        elif not token.startswith('-') and (token.startswith('http://') or token.startswith('https://') or token.startswith('/')):
            result["url"] = token
            i += 1
            continue
        
        i += 1
    
    # 解析 URL 中的 query 参数
    if '?' in result["url"]:
        url_parts = result["url"].split('?', 1)
        result["url"] = url_parts[0]
        query_string = url_parts[1]
        for param in query_string.split('&'):
            if '=' in param:
                key, value = param.split('=', 1)
                result["params"][key] = value
    
    # 检测 body 类型
    content_type = result["headers"].get("Content-Type", result["headers"].get("content-type", ""))
    if "application/json" in content_type:
        result["body_type"] = "json"
    elif "application/x-www-form-urlencoded" in content_type:
        result["body_type"] = "x-www-form-urlencoded"
    elif "multipart/form-data" in content_type:
        result["body_type"] = "form-data"
    
    return result


@router.post("/import/curl")
async def import_curl(
    project_id: int = Body(..., embed=True),
    curl_command: str = Body(..., embed=True),
    name: Optional[str] = Body(None, embed=True),
    session: AsyncSession = Depends(get_session)
):
    """导入 curl 命令创建接口"""
    
    try:
        parsed = parse_curl_command(curl_command)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"解析 curl 命令失败: {e}")
    
    if not parsed["url"]:
        raise HTTPException(status_code=400, detail="未能解析出 URL")
    
    # 创建接口
    interface = Interface(
        project_id=project_id,
        name=name or f"{parsed['method']} {parsed['url'][:50]}",
        url=parsed["url"],
        method=parsed["method"],
        status="draft",
        headers=parsed["headers"],
        params=parsed["params"],
        body=parsed["body"] if isinstance(parsed["body"], dict) else {},
        body_type=parsed["body_type"],
        cookies=parsed["cookies"]
    )
    
    session.add(interface)
    await session.commit()
    await session.refresh(interface)
    
    return {
        "success": True,
        "message": "curl 命令导入成功",
        "interface_id": interface.id,
        "parsed": parsed
    }
