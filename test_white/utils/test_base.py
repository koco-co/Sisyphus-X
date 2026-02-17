"""
白盒测试基类

提供通用的测试基类和辅助方法
"""

import asyncio
from typing import Any, Dict, List, Optional, Type
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from httpx import AsyncClient


class BaseTest:
    """
    测试基类

    提供通用的测试辅助方法
    """

    # ========================================================================
    # 断言辅助方法
    # ========================================================================

    @staticmethod
    def assert_valid_response(response_data: Dict[str, Any], expected_success: bool = True):
        """
        验证 API 响应格式

        Args:
            response_data: API 响应数据
            expected_success: 期望的 success 值
        """
        assert "success" in response_data, "Response missing 'success' field"
        assert response_data["success"] == expected_success, (
            f"Expected success={expected_success}, got {response_data['success']}"
        )

        if expected_success:
            assert "data" in response_data, "Success response missing 'data' field"
        else:
            assert "error" in response_data or "code" in response_data, (
                "Error response missing 'error' or 'code' field"
            )

    @staticmethod
    def assert_response_fields(
        response_data: Dict[str, Any],
        required_fields: List[str],
        optional_fields: Optional[List[str]] = None,
    ):
        """
        验证响应包含必需的字段

        Args:
            response_data: API 响应数据
            required_fields: 必需字段列表
            optional_fields: 可选字段列表（仅用于文档说明）
        """
        data = response_data.get("data", response_data)
        for field in required_fields:
            assert field in data, f"Response missing required field: {field}"

    @staticmethod
    def assert_pagination(
        response_data: Dict[str, Any],
        expected_total: Optional[int] = None,
        expected_page: Optional[int] = None,
        expected_limit: Optional[int] = None,
    ):
        """
        验证分页响应格式

        Args:
            response_data: API 响应数据
            expected_total: 期望的总数
            expected_page: 期望的页码
            expected_limit: 期望的每页条数
        """
        assert "meta" in response_data, "Response missing pagination meta"
        meta = response_data["meta"]

        if expected_total is not None:
            assert meta.get("total") == expected_total, (
                f"Expected total={expected_total}, got {meta.get('total')}"
            )

        if expected_page is not None:
            assert meta.get("page") == expected_page, (
                f"Expected page={expected_page}, got {meta.get('page')}"
            )

        if expected_limit is not None:
            assert meta.get("limit") == expected_limit, (
                f"Expected limit={expected_limit}, got {meta.get('limit')}"
            )

    # ========================================================================
    # 数据库辅助方法
    # ========================================================================

    @staticmethod
    async def get_by_id(
        session: AsyncSession,
        model: Type,
        id: str,
    ) -> Optional[Any]:
        """
        通过 ID 获取记录

        Args:
            session: 数据库会话
            model: 模型类
            id: 记录 ID

        Returns:
            记录对象或 None
        """
        return await session.get(model, id)

    @staticmethod
    async def get_all(
        session: AsyncSession,
        model: Type,
        limit: Optional[int] = None,
    ) -> List[Any]:
        """
        获取所有记录

        Args:
            session: 数据库会话
            model: 模型类
            limit: 限制数量

        Returns:
            记录列表
        """
        stmt = select(model)
        if limit:
            stmt = stmt.limit(limit)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def count(
        session: AsyncSession,
        model: Type,
    ) -> int:
        """
        统计记录数量

        Args:
            session: 数据库会话
            model: 模型类

        Returns:
            记录数量
        """
        from sqlalchemy import func

        stmt = select(func.count()).select_from(model)
        result = await session.execute(stmt)
        return result.scalar_one()

    # ========================================================================
    # API 请求辅助方法
    # ========================================================================

    @staticmethod
    async def create_resource(
        client: AsyncClient,
        endpoint: str,
        data: Dict[str, Any],
        expected_status: int = 201,
    ) -> Dict[str, Any]:
        """
        创建资源

        Args:
            client: HTTP 客户端
            endpoint: API 端点
            data: 请求数据
            expected_status: 期望的 HTTP 状态码

        Returns:
            API 响应数据
        """
        response = await client.post(endpoint, json=data)
        assert response.status_code == expected_status, (
            f"Expected status {expected_status}, got {response.status_code}\n"
            f"Response: {response.text}"
        )
        return response.json()

    @staticmethod
    async def get_resource(
        client: AsyncClient,
        endpoint: str,
        expected_status: int = 200,
    ) -> Dict[str, Any]:
        """
        获取资源

        Args:
            client: HTTP 客户端
            endpoint: API 端点
            expected_status: 期望的 HTTP 状态码

        Returns:
            API 响应数据
        """
        response = await client.get(endpoint)
        assert response.status_code == expected_status, (
            f"Expected status {expected_status}, got {response.status_code}\n"
            f"Response: {response.text}"
        )
        return response.json()

    @staticmethod
    async def update_resource(
        client: AsyncClient,
        endpoint: str,
        data: Dict[str, Any],
        expected_status: int = 200,
    ) -> Dict[str, Any]:
        """
        更新资源

        Args:
            client: HTTP 客户端
            endpoint: API 端点
            data: 请求数据
            expected_status: 期望的 HTTP 状态码

        Returns:
            API 响应数据
        """
        response = await client.put(endpoint, json=data)
        assert response.status_code == expected_status, (
            f"Expected status {expected_status}, got {response.status_code}\n"
            f"Response: {response.text}"
        )
        return response.json()

    @staticmethod
    async def delete_resource(
        client: AsyncClient,
        endpoint: str,
        expected_status: int = 204,
    ):
        """
        删除资源

        Args:
            client: HTTP 客户端
            endpoint: API 端点
            expected_status: 期望的 HTTP 状态码
        """
        response = await client.delete(endpoint)
        assert response.status_code == expected_status, (
            f"Expected status {expected_status}, got {response.status_code}\n"
            f"Response: {response.text}"
        )

    # ========================================================================
    # 测试数据生成器
    # ========================================================================

    @staticmethod
    def generate_user_data(
        email: Optional[str] = None,
        password: str = "testpassword123",
    ) -> Dict[str, str]:
        """
        生成用户数据

        Args:
            email: 邮箱地址
            password: 密码

        Returns:
            用户数据字典
        """
        if email is None:
            email = "test@example.com"
        return {
            "email": email,
            "password": password,
            "password_confirm": password,
        }

    @staticmethod
    def generate_project_data(
        name: str = "Test Project",
        description: str = "Test project description",
    ) -> Dict[str, str]:
        """
        生成项目数据

        Args:
            name: 项目名称
            description: 项目描述

        Returns:
            项目数据字典
        """
        return {
            "name": name,
            "description": description,
        }

    @staticmethod
    def generate_environment_data(
        name: str = "Test Environment",
        base_url: str = "http://localhost:8000",
    ) -> Dict[str, str]:
        """
        生成环境数据

        Args:
            name: 环境名称
            base_url: 基础 URL

        Returns:
            环境数据字典
        """
        return {
            "name": name,
            "base_url": base_url,
        }


class APITestCase(BaseTest):
    """
    API 测试基类

    专门用于 API 端点测试
    """

    async def assert_crud_workflow(
        self,
        client: AsyncClient,
        list_endpoint: str,
        create_endpoint: str,
        create_data: Dict[str, Any],
        update_data: Dict[str, Any],
    ):
        """
        测试完整的 CRUD 工作流

        Args:
            client: HTTP 客户端
            list_endpoint: 列表端点
            create_endpoint: 创建端点
            create_data: 创建数据
            update_data: 更新数据
        """
        # 1. 创建资源
        create_response = await self.create_resource(
            client, create_endpoint, create_data
        )
        self.assert_valid_response(create_response, expected_success=True)
        resource_id = create_response["data"]["id"]

        # 2. 获取资源详情
        detail_response = await self.get_resource(
            client, f"{list_endpoint}/{resource_id}"
        )
        self.assert_valid_response(detail_response, expected_success=True)

        # 3. 更新资源
        update_response = await self.update_resource(
            client, f"{list_endpoint}/{resource_id}", update_data
        )
        self.assert_valid_response(update_response, expected_success=True)

        # 4. 删除资源
        await self.delete_resource(client, f"{list_endpoint}/{resource_id}")

        # 5. 验证删除
        response = await client.get(f"{list_endpoint}/{resource_id}")
        assert response.status_code == 404


class ModelTestCase(BaseTest):
    """
    模型测试基类

    专门用于 SQLAlchemy 模型测试
    """

    async def assert_model_fields(
        self,
        model: Any,
        expected_fields: Dict[str, Any],
    ):
        """
        验证模型字段值

        Args:
            model: 模型实例
            expected_fields: 期望的字段值字典
        """
        for field, expected_value in expected_fields.items():
            actual_value = getattr(model, field, None)
            assert actual_value == expected_value, (
                f"Field '{field}': expected {expected_value}, got {actual_value}"
            )

    async def assert_model_relationships(
        self,
        session: AsyncSession,
        model: Any,
        relationships: Dict[str, Type],
    ):
        """
        验证模型关系

        Args:
            session: 数据库会话
            model: 模型实例
            relationships: 关系字典（字段名 -> 模型类）
        """
        for field_name, related_model in relationships.items():
            related_id = getattr(model, f"{field_name}_id", None)
            if related_id:
                related_obj = await session.get(related_model, related_id)
                assert related_obj is not None, (
                    f"Relationship '{field_name}' failed: "
                    f"{related_model.__name__} with id {related_id} not found"
                )
