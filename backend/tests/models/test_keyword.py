"""关键字模型单元测试

测试 Keyword 模型的 CRUD 操作和字段验证
遵循 TDD 流程: RED → GREEN → REFACTOR

数据库设计参考: docs/数据库设计.md §3.4 关键字表
"""
import pytest
import uuid
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.keyword import Keyword
from app.models.project import Project


@pytest.mark.asyncio
class TestKeywordModel:
    """关键字模型测试类 - 完整覆盖所有字段和约束"""

    async def test_create_keyword_minimal(self, db_session, sample_project):
        """测试创建最小字段关键字"""
        keyword = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="HTTP请求",
            class_name="HttpRequestKeyword",
            method_name="http_request",
            code="def http_request():\n    pass",
        )
        db_session.add(keyword)
        await db_session.commit()
        await db_session.refresh(keyword)

        assert keyword.id is not None
        assert keyword.name == "HTTP请求"
        assert keyword.class_name == "HttpRequestKeyword"
        assert keyword.method_name == "http_request"
        assert keyword.code == "def http_request():\n    pass"
        assert keyword.is_built_in is False  # 默认值
        assert keyword.is_enabled is True  # 默认值
        assert keyword.created_at is not None
        assert keyword.updated_at is not None

    async def test_create_keyword_all_fields(self, db_session, sample_project):
        """测试创建完整字段关键字"""
        keyword_id = str(uuid.uuid4())
        keyword = Keyword(
            id=keyword_id,
            project_id=sample_project.id,
            name="HTTP请求",
            class_name="HttpRequestKeyword",
            method_name="http_request",
            description="发送HTTP请求的关键字",
            code="def http_request(url, method='GET'):\n    return {'status': 200}",
            parameters='[{"name": "url", "type": "str", "required": true}]',
            return_type="dict",
            is_built_in=False,
            is_enabled=True,
        )
        db_session.add(keyword)
        await db_session.commit()
        await db_session.refresh(keyword)

        assert keyword.id == keyword_id
        assert keyword.description == "发送HTTP请求的关键字"
        assert keyword.parameters == '[{"name": "url", "type": "str", "required": true}]'
        assert keyword.return_type == "dict"
        assert keyword.is_built_in is False
        assert keyword.is_enabled is True

    async def test_keyword_unique_constraint(self, db_session, sample_project):
        """测试 class_name + method_name 唯一性约束"""
        keyword1 = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="关键字1",
            class_name="TestClass",
            method_name="test_method",
            code="def test_method():\n    pass",
        )
        keyword2 = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="关键字2",
            class_name="TestClass",
            method_name="test_method",  # 相同的 class_name + method_name
            code="def test_method():\n    pass",
        )

        db_session.add(keyword1)
        await db_session.commit()

        db_session.add(keyword2)
        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_update_keyword(self, db_session, sample_project):
        """测试更新关键字"""
        keyword = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="旧名称",
            class_name="OldClass",
            method_name="old_method",
            description="旧描述",
            code="def old_method():\n    pass",
        )
        db_session.add(keyword)
        await db_session.commit()
        await db_session.refresh(keyword)

        # 更新字段
        keyword.name = "新名称"
        keyword.class_name = "NewClass"
        keyword.method_name = "new_method"
        keyword.description = "新描述"
        keyword.code = "def new_method():\n    return 'updated'"
        keyword.is_enabled = False

        await db_session.commit()
        await db_session.refresh(keyword)

        assert keyword.name == "新名称"
        assert keyword.class_name == "NewClass"
        assert keyword.method_name == "new_method"
        assert keyword.description == "新描述"
        assert keyword.code == "def new_method():\n    return 'updated'"
        assert keyword.is_enabled is False

    async def test_delete_keyword(self, db_session, sample_project):
        """测试删除关键字"""
        keyword = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="待删除",
            class_name="ToDelete",
            method_name="delete_me",
            code="def delete_me():\n    pass",
        )
        db_session.add(keyword)
        await db_session.commit()
        await db_session.refresh(keyword)

        keyword_id = keyword.id

        await db_session.delete(keyword)
        await db_session.commit()

        result = await db_session.execute(
            select(Keyword).where(Keyword.id == keyword_id)
        )
        assert result.scalar_one_or_none() is None

    async def test_query_keywords_by_class(self, db_session, sample_project):
        """测试按类名查询关键字"""
        keyword1 = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="方法1",
            class_name="TestClass",
            method_name="method1",
            code="def method1():\n    pass",
        )
        keyword2 = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="方法2",
            class_name="TestClass",
            method_name="method2",
            code="def method2():\n    pass",
        )
        keyword3 = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="方法3",
            class_name="OtherClass",
            method_name="method3",
            code="def method3():\n    pass",
        )

        db_session.add_all([keyword1, keyword2, keyword3])
        await db_session.commit()

        result = await db_session.execute(
            select(Keyword).where(Keyword.class_name == "TestClass")
        )
        test_class_keywords = result.scalars().all()

        assert len(test_class_keywords) == 2
        assert all(kw.class_name == "TestClass" for kw in test_class_keywords)

    async def test_query_built_in_keywords(self, db_session, sample_project):
        """测试查询内置关键字"""
        # 内置关键字 (project_id=NULL, is_built_in=True)
        built_in_kw = Keyword(
            id=str(uuid.uuid4()),
            project_id=None,  # 内置关键字 project_id 为 NULL
            name="内置关键字",
            class_name="BuiltInClass",
            method_name="built_in_method",
            code="def built_in_method():\n    pass",
            is_built_in=True,
            is_enabled=True,
        )

        # 自定义关键字
        custom_kw = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="自定义关键字",
            class_name="CustomClass",
            method_name="custom_method",
            code="def custom_method():\n    pass",
            is_built_in=False,
            is_enabled=True,
        )

        db_session.add_all([built_in_kw, custom_kw])
        await db_session.commit()

        result = await db_session.execute(
            select(Keyword).where(Keyword.is_built_in == True)  # noqa: E712
        )
        built_in_keywords = result.scalars().all()

        assert len(built_in_keywords) == 1
        assert built_in_keywords[0].is_built_in is True
        assert built_in_keywords[0].project_id is None

    async def test_query_enabled_keywords(self, db_session, sample_project):
        """测试查询启用的关键字"""
        enabled_kw1 = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="启用关键字1",
            class_name="EnabledClass",
            method_name="enabled1",
            code="def enabled1():\n    pass",
            is_enabled=True,
        )
        enabled_kw2 = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="启用关键字2",
            class_name="EnabledClass",
            method_name="enabled2",
            code="def enabled2():\n    pass",
            is_enabled=True,
        )
        disabled_kw = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="禁用关键字",
            class_name="DisabledClass",
            method_name="disabled",
            code="def disabled():\n    pass",
            is_enabled=False,
        )

        db_session.add_all([enabled_kw1, enabled_kw2, disabled_kw])
        await db_session.commit()

        result = await db_session.execute(
            select(Keyword).where(
                Keyword.project_id == sample_project.id,
                Keyword.is_enabled == True  # noqa: E712
            )
        )
        enabled_keywords = result.scalars().all()

        assert len(enabled_keywords) == 2
        assert all(kw.is_enabled for kw in enabled_keywords)

    async def test_keyword_not_nullable_fields(self, db_session, sample_project):
        """测试必填字段约束"""
        # 缺少必填字段应该报错
        keyword = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            # name 缺失
            # class_name 缺失
            # method_name 缺失
            # code 缺失
        )

        db_session.add(keyword)
        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_keyword_name_max_length(self, db_session, sample_project):
        """测试名称最大长度 (100 字符)"""
        # 注意: SQLite 不强制 VARCHAR 长度限制
        # 但 PostgreSQL 会强制执行,此测试验证字段定义
        max_name = "a" * 100  # 最大 100 字符
        keyword = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name=max_name,
            class_name="TestClass",
            method_name="test_method",
            code="def test_method():\n    pass",
        )

        db_session.add(keyword)
        await db_session.commit()
        await db_session.refresh(keyword)

        assert len(keyword.name) == 100
        assert keyword.name == max_name

    async def test_keyword_parameters_json(self, db_session, sample_project):
        """测试参数 JSON 序列化"""
        parameters_json = '[{"name": "url", "type": "str", "required": true}, {"name": "timeout", "type": "int", "default": 30}]'

        keyword = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="HTTP请求",
            class_name="HttpRequestKeyword",
            method_name="http_request",
            code="def http_request(url, timeout=30):\n    pass",
            parameters=parameters_json,
            return_type="dict",
        )

        db_session.add(keyword)
        await db_session.commit()
        await db_session.refresh(keyword)

        assert keyword.parameters == parameters_json
        assert "url" in keyword.parameters
        assert "timeout" in keyword.parameters
        assert keyword.return_type == "dict"

    async def test_toggle_is_enabled(self, db_session, sample_project):
        """测试切换启用状态"""
        keyword = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="测试关键字",
            class_name="TestClass",
            method_name="test_method",
            code="def test_method():\n    pass",
            is_enabled=True,
        )

        db_session.add(keyword)
        await db_session.commit()
        await db_session.refresh(keyword)

        assert keyword.is_enabled is True

        # 切换到禁用
        keyword.is_enabled = False
        await db_session.commit()
        await db_session.refresh(keyword)

        assert keyword.is_enabled is False

        # 切换回启用
        keyword.is_enabled = True
        await db_session.commit()
        await db_session.refresh(keyword)

        assert keyword.is_enabled is True

    async def test_keyword_timestamps_auto_update(self, db_session, sample_project):
        """测试时间戳自动更新"""
        keyword = Keyword(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="时间戳测试",
            class_name="TimestampTest",
            method_name="test_timestamp",
            code="def test_timestamp():\n    pass",
        )

        db_session.add(keyword)
        await db_session.commit()
        await db_session.refresh(keyword)

        assert keyword.created_at is not None
        assert keyword.updated_at is not None
        assert isinstance(keyword.created_at, datetime)
        assert isinstance(keyword.updated_at, datetime)

        # 等待一小段时间确保时间戳不同
        import asyncio
        await asyncio.sleep(0.01)

        # 更新记录
        keyword.description = "更新描述"
        await db_session.commit()
        await db_session.refresh(keyword)

        # updated_at 应该被自动更新
        assert keyword.updated_at > keyword.created_at

    async def test_cascade_delete_project(self, db_session, sample_user):
        """测试删除项目时级联删除关键字"""
        # 注意: SQLite 默认不强制外键约束,需要手动启用
        # 在生产环境 (PostgreSQL) 中会自动执行级联删除
        from sqlalchemy import text
        await db_session.execute(text("PRAGMA foreign_keys = ON"))
        await db_session.commit()

        project = Project(
            id=str(uuid.uuid4()),
            name="测试项目",
            created_by=sample_user.id,
            description="待删除的项目",
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        keyword = Keyword(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="项目关键字",
            class_name="ProjectKeyword",
            method_name="project_method",
            code="def project_method():\n    pass",
        )

        db_session.add(keyword)
        await db_session.commit()
        await db_session.refresh(keyword)

        keyword_id = keyword.id

        # 删除项目
        await db_session.delete(project)
        await db_session.commit()

        # 验证关键字已被级联删除
        result = await db_session.execute(
            select(Keyword).where(Keyword.id == keyword_id)
        )
        assert result.scalar_one_or_none() is None
