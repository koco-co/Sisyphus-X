# Phase 8: 辅助模块 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现辅助模块，包括关键字管理和全局参数（辅助函数）管理。

**Architecture:** 后端使用 FastAPI + SQLAlchemy 2.0 async，前端使用 React + React Query。关键字支持内置和自定义，全局参数用于测试执行中的辅助函数。

**Tech Stack:** FastAPI, Pydantic v2, SQLAlchemy 2.0, React, React Query, shadcn/ui

---

## 前置条件

- Phase 1-7 已完成
- 数据库模型已定义 (Keyword, GlobalParam)

---

## Task 1: 关键字服务层

**Files:**
- Create: `backend/app/modules/keyword/schemas.py`
- Create: `backend/app/modules/keyword/service.py`

**实现 schemas.py:**

```python
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional, List, Dict, Any

# 关键字类型枚举
# request, assertion, extract, sql, wait, custom

class KeywordCreate(BaseModel):
    """创建关键字请求"""
    keyword_type: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    method_name: str = Field(..., min_length=1, max_length=100)
    code: Optional[str] = None
    params_schema: Optional[Dict[str, Any]] = None
    is_enabled: bool = True

class KeywordUpdate(BaseModel):
    """更新关键字请求"""
    keyword_type: Optional[str] = Field(None, min_length=1, max_length=100)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    method_name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = None
    params_schema: Optional[Dict[str, Any]] = None
    is_enabled: Optional[bool] = None

class KeywordResponse(BaseModel):
    """关键字响应"""
    id: UUID
    keyword_type: str
    name: str
    method_name: str
    code: Optional[str]
    params_schema: Optional[Dict[str, Any]]
    is_builtin: bool
    is_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True

class KeywordListResponse(BaseModel):
    """关键字列表响应"""
    items: List[KeywordResponse]
    total: int
```

**实现 service.py:**

KeywordService 类:
- list(keyword_type, is_enabled, page, page_size) -> Tuple[List[Keyword], int]
- get(keyword_id) -> Keyword
- create(data) -> Keyword
- update(keyword_id, data) -> Keyword
- delete(keyword_id) -> None (不允许删除内置关键字)
- get_by_type(keyword_type) -> List[Keyword]

---

## Task 2: 关键字路由

**Files:**
- Create: `backend/app/modules/keyword/routes.py`
- Modify: `backend/app/main.py`

**实现路由 (prefix="/keywords"):**

- GET / - 关键字列表
- GET /types - 关键字类型列表
- POST / - 创建关键字
- GET /{keyword_id} - 关键字详情
- PUT /{keyword_id} - 更新关键字
- DELETE /{keyword_id} - 删除关键字

---

## Task 3: 全局参数服务层

**Files:**
- Create: `backend/app/modules/setting/global_param_service.py` (或独立模块)

**实现 GlobalParamService:**
- list(page, page_size) -> Tuple[List[GlobalParam], int]
- get(param_id) -> GlobalParam
- create(data) -> GlobalParam
- update(param_id, data) -> GlobalParam
- delete(param_id) -> None

---

## Task 4: 全局参数路由

**Files:**
- Create/Modify: `backend/app/modules/setting/global_param_routes.py`

**实现路由 (prefix="/global-params"):**

- GET / - 全局参数列表
- POST / - 创建全局参数
- GET /{param_id} - 全局参数详情
- PUT /{param_id} - 更新全局参数
- DELETE /{param_id} - 删除全局参数

---

## Task 5: 前端关键字和全局参数 API

**Files:**
- Create: `frontend/src/features/keyword/types.ts`
- Create: `frontend/src/features/keyword/api.ts`
- Create: `frontend/src/features/setting/globalParamTypes.ts`
- Create: `frontend/src/features/setting/globalParamApi.ts`

---

## Task 6: 集成测试与验证

**验证步骤:**
1. 验证后端路由注册
2. 运行 lint 检查
3. 提交最终代码

---

## Phase 8 完成检查清单

- [ ] 关键字服务层 (CRUD, 类型过滤)
- [ ] 关键字路由 (API 端点)
- [ ] 全局参数服务层 (CRUD)
- [ ] 全局参数路由 (API 端点)
- [ ] 前端 API 和类型
- [ ] 集成测试验证

---

> **文档结束** — Phase 8: 辅助模块实施计划
