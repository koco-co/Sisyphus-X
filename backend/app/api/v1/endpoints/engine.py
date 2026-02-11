"""
Engine API - 调用核心执行器 (api-engine)
"""

import json
import os
import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Sisyphus-api-engine 路径
ENGINE_PATH = Path(__file__).parent.parent.parent.parent.parent / "engines" / "Sisyphus-api-engine"


class RunRequest(BaseModel):
    """执行请求"""

    yaml_content: str  # YAML 内容
    base_url: str | None = None
    timeout: int | None = None


class RunResponse(BaseModel):
    """执行响应"""

    success: bool
    result: dict
    error: str | None = None


@router.post("/run", response_model=RunResponse)
async def run_engine(request: RunRequest):
    """
    执行 api-engine 测试

    接收 YAML 内容，调用 api-engine 执行，返回 JSON 结果
    """
    try:
        # 创建临时 YAML 文件
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".yaml", delete=False, encoding="utf-8"
        ) as f:
            f.write(request.yaml_content)
            yaml_path = f.name

        try:
            # 构建命令
            cmd = ["python", str(ENGINE_PATH / "main.py"), "run", "-f", yaml_path]

            if request.base_url:
                cmd.extend(["--base-url", request.base_url])
            if request.timeout:
                cmd.extend(["--timeout", str(request.timeout)])

            # 执行
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5 分钟超时
                cwd=str(ENGINE_PATH),
            )

            # 解析输出
            if result.stdout:
                try:
                    output = json.loads(result.stdout)
                    return RunResponse(
                        success=output.get("summary", {}).get("status") == "success", result=output
                    )
                except json.JSONDecodeError:
                    return RunResponse(
                        success=False, result={}, error=f"输出解析失败: {result.stdout[:500]}"
                    )
            else:
                return RunResponse(success=False, result={}, error=result.stderr or "执行无输出")

        finally:
            # 清理临时文件
            os.unlink(yaml_path)

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="执行超时")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_yaml(request: RunRequest):
    """
    验证 YAML 格式
    """
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".yaml", delete=False, encoding="utf-8"
        ) as f:
            f.write(request.yaml_content)
            yaml_path = f.name

        try:
            cmd = ["python", str(ENGINE_PATH / "main.py"), "validate", "-f", yaml_path]

            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=30, cwd=str(ENGINE_PATH)
            )

            return {
                "valid": result.returncode == 0,
                "message": result.stdout.strip()
                if result.returncode == 0
                else result.stderr.strip(),
            }

        finally:
            os.unlink(yaml_path)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
