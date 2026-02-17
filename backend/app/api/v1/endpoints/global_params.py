"""全局参数管理接口

按照 docs/接口定义.md §9 定义
支持 Google docstring 自动解析
"""

import ast
import re
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_session
from app.models.global_param import GlobalParam
from app.models.user import User
from app.schemas.global_param import (
    GlobalParamCreate,
    GlobalParamList,
    GlobalParamResponse,
    GlobalParamUpdate,
)

router = APIRouter()


# ============================================================================
# Google Docstring 解析器
# ============================================================================


class GoogleDocstringParser:
    """Google 风格 docstring 解析器"""

    # 正则表达式模式
    CLASS_PATTERN = r"^class\s+(\w+)\s*[:\(]"
    METHOD_PATTERN = r"^\s*def\s+(\w+)\s*\((.*?)\)\s*->"
    PARAM_PATTERN = r":param\s+(\w+):\s*(.*)"
    TYPE_PATTERN = r":type\s+(\w+):\s*(.*)"
    RETURN_PATTERN = r":return:\s*(.*)"
    RTYPE_PATTERN = r":rtype:\s*(.*)"

    @staticmethod
    def parse_code(code: str) -> dict[str, Any]:
        """解析 Python 代码，提取类名、方法名和 docstring

        Args:
            code: Python 代码字符串

        Returns:
            包含 class_name, method_name, description, parameters, return_value 的字典

        Raises:
            ValueError: 代码格式错误或无法解析
        """
        try:
            # 解析 AST
            tree = ast.parse(code)
        except SyntaxError as e:
            raise ValueError(f"代码语法错误: {e}")

        # 查找类定义和方法定义
        class_name = None
        method_name = None
        docstring = None

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                class_name = node.name
                # 获取类 docstring
                if ast.get_docstring(node):
                    docstring = ast.get_docstring(node)

                # 查找方法
                for item in node.body:
                    if isinstance(item, ast.FunctionDef):
                        method_name = item.name
                        # 如果方法有 docstring，使用方法的 docstring
                        if ast.get_docstring(item):
                            docstring = ast.get_docstring(item)
                        break
                break

        if not class_name:
            raise ValueError("未找到类定义")
        if not method_name:
            raise ValueError("未找到方法定义")

        # 解析 docstring
        parsed = GoogleDocstringParser.parse_docstring(docstring or "")

        return {
            "class_name": class_name,
            "method_name": method_name,
            "description": parsed.get("description"),
            "parameters": parsed.get("parameters", []),
            "return_value": parsed.get("return_value"),
        }

    @staticmethod
    def parse_docstring(docstring: str) -> dict[str, Any]:
        """解析 Google 风格 docstring

        Args:
            docstring: docstring 字符串

        Returns:
            包含 description, parameters, return_value 的字典
        """
        result: dict[str, Any] = {
            "description": None,
            "parameters": [],
            "return_value": None,
        }

        if not docstring:
            return result

        lines = docstring.split("\n")
        description_lines: list[str] = []
        current_param: dict[str, str] | None = None
        in_args_section = False
        in_returns_section = False
        in_raises_section = False

        i = 0
        while i < len(lines):
            line = lines[i].rstrip()

            # 检测段落标题
            if line.strip() in ["Args:", "Arguments:", "Parameters:", "参数:"]:
                in_args_section = True
                in_returns_section = False
                in_raises_section = False
                i += 1
                continue

            if line.strip() in ["Returns:", "Return:", "返回:", "出参:"]:
                in_returns_section = True
                in_args_section = False
                in_raises_section = False
                i += 1
                continue

            if line.strip() in ["Raises:", "Raises:", "异常:", "抛出:"]:
                in_raises_section = True
                in_args_section = False
                in_returns_section = False
                i += 1
                continue

            # 解析 Args 部分 (Google 风格:  param_name (type): description)
            if in_args_section:
                # Google 风格:   text (str): 输入文本
                param_match = re.match(r"^\s+(\w+)\s*(?:\(([^)]*)\))?:\s*(.*)$", line)
                if param_match:
                    if current_param:
                        result["parameters"].append(current_param)
                    current_param = {
                        "name": param_match.group(1),
                        "type": param_match.group(2).strip() if param_match.group(2) else None,
                        "description": param_match.group(3).strip(),
                        "required": True,
                        "default": None,
                    }
                elif current_param and (line.startswith("    ") or line.strip() == ""):
                    # 继续参数描述（任何缩进行）
                    if line.strip():
                        current_param["description"] += " " + line.strip()
                i += 1
                continue

            # 解析 Returns 部分
            if in_returns_section and line.strip():
                # 尝试匹配:  type: description
                return_match = re.match(r"^\s*(.+?)\s*:\s*(.*)$", line.strip())
                if return_match:
                    # 第一行可能是类型
                    if not result["return_value"]:
                        result["return_value"] = {
                            "type": return_match.group(1).strip(),
                            "description": return_match.group(2).strip(),
                        }
                    else:
                        # 已有返回值，追加描述
                        if result["return_value"]["type"] == "None":
                            result["return_value"]["type"] = return_match.group(1).strip()
                        result["return_value"]["description"] += " " + return_match.group(2).strip()
                else:
                    # 纯描述行
                    if not result["return_value"]:
                        result["return_value"] = {
                            "type": None,
                            "description": line.strip(),
                        }
                    else:
                        result["return_value"]["description"] += " " + line.strip()
                i += 1
                continue

            # 描述行（在任何段落之前）
            if not in_args_section and not in_returns_section and not in_raises_section:
                if line.strip():
                    description_lines.append(line.strip())

            i += 1

        # 保存最后一个参数
        if current_param:
            result["parameters"].append(current_param)

        # 合并描述行
        if description_lines:
            result["description"] = "\n".join(description_lines).strip()

        return result


# ============================================================================
# API 端点
# ============================================================================


@router.get("/", response_model=GlobalParamList)
async def list_global_params(
    class_name: str | None = Query(None, description="按类名筛选"),
    page: int = Query(1, ge=1, description="页码"),
    limit: int = Query(10, ge=1, le=100, description="每页条数"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> GlobalParamList:
    """获取全局参数列表（9.1）"""
    query = select(GlobalParam)

    # 按类名筛选
    if class_name:
        query = query.where(GlobalParam.class_name == class_name)

    # 获取总数
    from sqlalchemy import func

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar()

    # 分页
    query = query.order_by(GlobalParam.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    result = await session.execute(query)
    items = result.scalars().all()

    # 转换为响应格式
    return GlobalParamList(
        total=total,
        items=[GlobalParamResponse.model_validate(item) for item in items],
    )


@router.post("/", response_model=GlobalParamResponse, status_code=201)
async def create_global_param(
    data: GlobalParamCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> GlobalParamResponse:
    """创建全局参数（9.2）

    自动解析 Google docstring 提取元数据
    """
    # 解析代码
    try:
        parsed = GoogleDocstringParser.parse_code(data.code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"代码解析失败: {e}")

    # 检查是否已存在
    existing = await session.execute(
        select(GlobalParam).where(
            GlobalParam.class_name == parsed["class_name"],
            GlobalParam.method_name == parsed["method_name"],
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"方法 {parsed['class_name']}.{parsed['method_name']} 已存在",
        )

    # 创建全局参数
    global_param = GlobalParam(
        id=str(uuid.uuid4()),
        class_name=parsed["class_name"],
        method_name=parsed["method_name"],
        code=data.code,
        description=parsed.get("description"),
        parameters=parsed.get("parameters"),
        return_value=parsed.get("return_value"),
        created_by=current_user.id,
    )

    session.add(global_param)
    await session.commit()
    await session.refresh(global_param)

    return GlobalParamResponse.model_validate(global_param)


@router.get("/{param_id}", response_model=GlobalParamResponse)
async def get_global_param(
    param_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> GlobalParamResponse:
    """获取全局参数详情（9.3）"""
    result = await session.execute(select(GlobalParam).where(GlobalParam.id == param_id))
    global_param = result.scalar_one_or_none()

    if not global_param:
        raise HTTPException(status_code=404, detail="全局参数不存在")

    return GlobalParamResponse.model_validate(global_param)


@router.put("/{param_id}", response_model=GlobalParamResponse)
async def update_global_param(
    param_id: str,
    data: GlobalParamUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> GlobalParamResponse:
    """更新全局参数（9.4）"""
    result = await session.execute(select(GlobalParam).where(GlobalParam.id == param_id))
    global_param = result.scalar_one_or_none()

    if not global_param:
        raise HTTPException(status_code=404, detail="全局参数不存在")

    # 如果更新了代码，重新解析
    if data.code:
        try:
            parsed = GoogleDocstringParser.parse_code(data.code)
            global_param.class_name = parsed["class_name"]
            global_param.method_name = parsed["method_name"]
            global_param.code = data.code
            global_param.description = parsed.get("description")
            global_param.parameters = parsed.get("parameters")
            global_param.return_value = parsed.get("return_value")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"代码解析失败: {e}")
    else:
        # 仅更新元数据
        if data.description is not None:
            global_param.description = data.description
        if data.parameters is not None:
            global_param.parameters = [p.model_dump() for p in data.parameters]
        if data.return_value is not None:
            global_param.return_value = data.return_value.model_dump()

    await session.commit()
    await session.refresh(global_param)

    return GlobalParamResponse.model_validate(global_param)


@router.delete("/{param_id}", status_code=204)
async def delete_global_param(
    param_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> None:
    """删除全局参数（9.5）"""
    result = await session.execute(select(GlobalParam).where(GlobalParam.id == param_id))
    global_param = result.scalar_one_or_none()

    if not global_param:
        raise HTTPException(status_code=404, detail="全局参数不存在")

    await session.delete(global_param)
    await session.commit()


@router.get("/by-class/{class_name}", response_model=GlobalParamList)
async def list_global_params_by_class(
    class_name: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> GlobalParamList:
    """按类名获取全局参数（扩展接口）"""
    query = select(GlobalParam).where(GlobalParam.class_name == class_name)
    query = query.order_by(GlobalParam.method_name)

    result = await session.execute(query)
    items = result.scalars().all()

    return GlobalParamList(
        total=len(items),
        items=[GlobalParamResponse.model_validate(item) for item in items],
    )
