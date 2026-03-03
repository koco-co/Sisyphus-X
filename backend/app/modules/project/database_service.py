"""数据库配置服务层"""
import asyncio
from datetime import datetime
from typing import List

import aiomysql
import asyncpg
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundException, ValidationException
from app.models_new.database_config import DatabaseConfig
from app.modules.project.database_schemas import (
    ConnectionTestResult,
    DatabaseConfigCreate,
    DatabaseConfigResponse,
    DatabaseConfigUpdate,
)


class DatabaseConfigService:
    """数据库配置服务"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_by_project(self, project_id: str) -> List[DatabaseConfig]:
        """获取项目的所有数据库配置"""
        result = await self.session.execute(
            select(DatabaseConfig)
            .where(DatabaseConfig.project_id == project_id)
            .order_by(DatabaseConfig.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, db_config_id: str) -> DatabaseConfig:
        """获取数据库配置详情"""
        result = await self.session.execute(
            select(DatabaseConfig).where(DatabaseConfig.id == db_config_id)
        )
        config = result.scalar_one_or_none()

        if not config:
            raise ResourceNotFoundException("数据库配置不存在")

        return config

    async def create(self, project_id: str, data: DatabaseConfigCreate) -> DatabaseConfig:
        """创建数据库配置"""
        # 检查引用变量是否重复
        result = await self.session.execute(
            select(DatabaseConfig).where(
                DatabaseConfig.project_id == project_id,
                DatabaseConfig.reference_var == data.reference_var,
            )
        )
        if result.scalar_one_or_none():
            raise ValidationException(f"引用变量 '{data.reference_var}' 已存在")

        config = DatabaseConfig(
            project_id=project_id,
            name=data.name,
            reference_var=data.reference_var,
            db_type=data.db_type,
            host=data.host,
            port=data.port,
            database=data.database,
            username=data.username,
            password=data.password,  # TODO: 加密存储
            connection_status="unknown",
            is_enabled=True,
        )
        self.session.add(config)
        await self.session.commit()
        await self.session.refresh(config)

        return config

    async def update(self, db_config_id: str, data: DatabaseConfigUpdate) -> DatabaseConfig:
        """更新数据库配置"""
        config = await self.get(db_config_id)

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(config, field, value)

        # 如果连接参数变更，重置连接状态
        connection_fields = {"host", "port", "database", "username", "password", "db_type"}
        if any(field in update_data for field in connection_fields):
            config.connection_status = "unknown"

        await self.session.commit()
        await self.session.refresh(config)

        return config

    async def delete(self, db_config_id: str) -> None:
        """删除数据库配置"""
        config = await self.get(db_config_id)
        await self.session.delete(config)
        await self.session.commit()

    async def test_connection(self, db_config_id: str) -> ConnectionTestResult:
        """测试数据库连接"""
        config = await self.get(db_config_id)

        try:
            if config.db_type == "PostgreSQL":
                conn = await asyncpg.connect(
                    host=config.host,
                    port=config.port,
                    database=config.database,
                    user=config.username,
                    password=config.password,
                    timeout=10,
                )
                await conn.close()
            elif config.db_type == "MySQL":
                conn = await aiomysql.connect(
                    host=config.host,
                    port=config.port,
                    db=config.database,
                    user=config.username,
                    password=config.password,
                    connect_timeout=10,
                )
                conn.close()
            else:
                raise ValidationException(f"不支持的数据库类型: {config.db_type}")

            # 更新连接状态
            config.connection_status = "connected"
            config.last_check_at = datetime.utcnow()
            await self.session.commit()

            return ConnectionTestResult(
                success=True,
                message="连接成功",
                tested_at=datetime.utcnow(),
            )

        except Exception as e:
            # 更新连接状态
            config.connection_status = "failed"
            config.last_check_at = datetime.utcnow()
            await self.session.commit()

            return ConnectionTestResult(
                success=False,
                message=f"连接失败: {str(e)}",
                tested_at=datetime.utcnow(),
            )

    async def toggle_enabled(self, db_config_id: str) -> DatabaseConfig:
        """切换启用状态"""
        config = await self.get(db_config_id)
        config.is_enabled = not config.is_enabled
        await self.session.commit()
        await self.session.refresh(config)
        return config
