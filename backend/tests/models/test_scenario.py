"""场景相关模型单元测试

测试 Scenario, ScenarioStep, Dataset 模型的 CRUD 操作和字段验证
遵循 TDD 流程: RED → GREEN → REFACTOR

数据库设计参考:
- docs/数据库设计.md §3.5 场景表 (test_scenarios)
- docs/数据库设计.md §3.6 场景步骤表 (scenario_steps)
- docs/数据库设计.md §3.12 测试数据集表 (datasets)
"""
import pytest
import uuid
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.scenario import Scenario, ScenarioStep, Dataset
from app.models.project import Project


# ========== Scenario 测试 ==========


@pytest.mark.asyncio
class TestScenarioModel:
    """测试场景模型测试类"""

    async def test_create_scenario_minimal(self, db_session, sample_project):
        """测试创建最小字段场景"""
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="登录场景",
        )
        db_session.add(scenario)
        await db_session.commit()
        await db_session.refresh(scenario)

        assert scenario.id is not None
        assert scenario.name == "登录场景"
        assert scenario.project_id == sample_project.id
        assert scenario.description is None  # 可选字段
        assert scenario.pre_sql is None
        assert scenario.post_sql is None
        assert scenario.created_at is not None
        assert isinstance(scenario.created_at, datetime)

    async def test_create_scenario_all_fields(self, db_session, sample_project):
        """测试创建完整字段场景"""
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="用户注册流程",
            description="测试用户完整的注册流程",
            pre_sql="DELETE FROM users WHERE email = 'test@example.com'",
            post_sql="SELECT * FROM users WHERE email = 'test@example.com'",
        )
        db_session.add(scenario)
        await db_session.commit()
        await db_session.refresh(scenario)

        assert scenario.name == "用户注册流程"
        assert scenario.description == "测试用户完整的注册流程"
        assert scenario.pre_sql == "DELETE FROM users WHERE email = 'test@example.com'"
        assert scenario.post_sql == "SELECT * FROM users WHERE email = 'test@example.com'"

    async def test_scenario_cascade_delete_project(self, db_session, sample_user):
        """测试删除项目时级联删除场景"""
        # 注意: SQLite 默认不强制外键约束,需要手动启用
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

        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=project.id,
            name="项目场景",
            description="属于该项目的场景",
        )

        db_session.add(scenario)
        await db_session.commit()
        await db_session.refresh(scenario)

        scenario_id = scenario.id

        # 删除项目
        await db_session.delete(project)
        await db_session.commit()

        # 验证场景已被级联删除
        result = await db_session.execute(
            select(Scenario).where(Scenario.id == scenario_id)
        )
        assert result.scalar_one_or_none() is None

    async def test_update_scenario(self, db_session, sample_project):
        """测试更新场景"""
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="旧名称",
            description="旧描述",
            pre_sql="旧前置SQL",
            post_sql="旧后置SQL",
        )
        db_session.add(scenario)
        await db_session.commit()
        await db_session.refresh(scenario)

        # 更新字段
        scenario.name = "新名称"
        scenario.description = "新描述"
        scenario.pre_sql = "新前置SQL"
        scenario.post_sql = "新后置SQL"

        await db_session.commit()
        await db_session.refresh(scenario)

        assert scenario.name == "新名称"
        assert scenario.description == "新描述"
        assert scenario.pre_sql == "新前置SQL"
        assert scenario.post_sql == "新后置SQL"

    async def test_delete_scenario(self, db_session, sample_project):
        """测试删除场景"""
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="待删除场景",
            description="这个场景将被删除",
        )
        db_session.add(scenario)
        await db_session.commit()
        await db_session.refresh(scenario)

        scenario_id = scenario.id

        await db_session.delete(scenario)
        await db_session.commit()

        result = await db_session.execute(
            select(Scenario).where(Scenario.id == scenario_id)
        )
        assert result.scalar_one_or_none() is None


# ========== ScenarioStep 测试 ==========


@pytest.mark.asyncio
class ScenarioStepModel:
    """场景步骤模型测试类"""

    async def test_create_scenario_step_minimal(self, db_session, sample_project):
        """测试创建最小字段步骤"""
        # 先创建场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="测试场景",
        )
        db_session.add(scenario)
        await db_session.commit()
        await db_session.refresh(scenario)

        # 创建步骤
        step = ScenarioStep(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            step_order=1,
        )
        db_session.add(step)
        await db_session.commit()
        await db_session.refresh(step)

        assert step.id is not None
        assert step.scenario_id == scenario.id
        assert step.step_order == 1
        assert step.keyword_id is None  # 可选字段
        assert step.parameters is None
        assert step.expected_result is None
        assert step.created_at is not None
        assert isinstance(step.created_at, datetime)

    async def test_scenario_step_unique_constraint(self, db_session, sample_project):
        """测试 scenario_id + step_order 唯一性约束"""
        # 创建场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="测试场景",
        )
        db_session.add(scenario)
        await db_session.commit()

        # 创建两个 step_order 相同的步骤
        step1 = ScenarioStep(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            step_order=1,
        )
        step2 = ScenarioStep(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            step_order=1,  # 相同的 scenario_id + step_order
        )

        db_session.add(step1)
        await db_session.commit()

        db_session.add(step2)
        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_scenario_step_foreign_key_keyword(self, db_session, sample_project):
        """测试步骤外键关联关键字"""
        from app.models.keyword import Keyword

        # 创建关键字
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

        # 创建场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="测试场景",
        )
        db_session.add(scenario)
        await db_session.commit()
        await db_session.refresh(scenario)

        # 创建步骤 (关联关键字)
        step = ScenarioStep(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            keyword_id=keyword.id,
            step_order=1,
            parameters='{"url": "https://api.example.com", "method": "GET"}',
            expected_result='{"status_code": 200}',
        )
        db_session.add(step)
        await db_session.commit()
        await db_session.refresh(step)

        assert step.keyword_id == keyword.id
        assert step.parameters == '{"url": "https://api.example.com", "method": "GET"}'
        assert step.expected_result == '{"status_code": 200}'

    async def test_scenario_step_order_auto_sort(self, db_session, sample_project):
        """测试按顺序查询步骤"""
        # 创建场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="测试场景",
        )
        db_session.add(scenario)
        await db_session.commit()
        await db_session.refresh(scenario)

        # 创建多个步骤 (乱序添加)
        step3 = ScenarioStep(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            step_order=3,
        )
        step1 = ScenarioStep(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            step_order=1,
        )
        step2 = ScenarioStep(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            step_order=2,
        )

        db_session.add_all([step3, step1, step2])
        await db_session.commit()

        # 查询并验证排序
        result = await db_session.execute(
            select(ScenarioStep)
            .where(ScenarioStep.scenario_id == scenario.id)
            .order_by(ScenarioStep.step_order)
        )
        steps = result.scalars().all()

        assert steps[0].step_order == 1
        assert steps[1].step_order == 2
        assert steps[2].step_order == 3

    async def test_cascade_delete_scenario_steps(self, db_session, sample_project):
        """测试删除场景时级联删除步骤"""
        # 注意: SQLite 默认不强制外键约束,需要手动启用
        from sqlalchemy import text
        await db_session.execute(text("PRAGMA foreign_keys = ON"))
        await db_session.commit()

        # 创建场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="测试场景",
        )
        db_session.add(scenario)
        await db_session.commit()
        await db_session.refresh(scenario)

        # 创建步骤
        step1 = ScenarioStep(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            step_order=1,
        )
        step2 = ScenarioStep(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            step_order=2,
        )

        db_session.add_all([step1, step2])
        await db_session.commit()

        step1_id = step1.id
        step2_id = step2.id

        # 删除场景
        await db_session.delete(scenario)
        await db_session.commit()

        # 验证步骤已被级联删除
        result1 = await db_session.execute(
            select(ScenarioStep).where(ScenarioStep.id == step1_id)
        )
        result2 = await db_session.execute(
            select(ScenarioStep).where(ScenarioStep.id == step2_id)
        )
        assert result1.scalar_one_or_none() is None
        assert result2.scalar_one_or_none() is None


# ========== Dataset 测试 ==========


@pytest.mark.asyncio
class TestDatasetModel:
    """测试数据集模型测试类"""

    async def test_create_dataset_minimal(self, db_session, sample_project):
        """测试创建最小字段数据集"""
        # 先创建场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="测试场景",
        )
        db_session.add(scenario)
        await db_session.commit()
        await db_session.refresh(scenario)

        # 创建数据集
        dataset = Dataset(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            name="用户数据",
        )
        db_session.add(dataset)
        await db_session.commit()
        await db_session.refresh(dataset)

        assert dataset.id is not None
        assert dataset.scenario_id == scenario.id
        assert dataset.name == "用户数据"
        assert dataset.data is None  # 可选字段
        assert dataset.created_at is not None
        assert isinstance(dataset.created_at, datetime)

    async def test_dataset_json_data(self, db_session, sample_project):
        """测试数据集 JSON 序列化"""
        # 创建场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="测试场景",
        )
        db_session.add(scenario)
        await db_session.commit()
        await db_session.refresh(scenario)

        # CSV 数据 (JSON 字符串格式存储)
        csv_data = (
            "username,password,email\n"
            "user1,pass123,user1@example.com\n"
            "user2,pass456,user2@example.com\n"
        )

        dataset = Dataset(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            name="用户CSV数据",
            data=csv_data,
        )
        db_session.add(dataset)
        await db_session.commit()
        await db_session.refresh(dataset)

        assert dataset.data == csv_data
        assert "username,password,email" in dataset.data
        assert "user1,pass123,user1@example.com" in dataset.data

    async def test_cascade_delete_scenario_datasets(self, db_session, sample_project):
        """测试删除场景时级联删除数据集"""
        # 注意: SQLite 默认不强制外键约束,需要手动启用
        from sqlalchemy import text
        await db_session.execute(text("PRAGMA foreign_keys = ON"))
        await db_session.commit()

        # 创建场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="测试场景",
        )
        db_session.add(scenario)
        await db_session.commit()
        await db_session.refresh(scenario)

        # 创建数据集
        dataset1 = Dataset(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            name="数据集1",
        )
        dataset2 = Dataset(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            name="数据集2",
        )

        db_session.add_all([dataset1, dataset2])
        await db_session.commit()

        dataset1_id = dataset1.id
        dataset2_id = dataset2.id

        # 删除场景
        await db_session.delete(scenario)
        await db_session.commit()

        # 验证数据集已被级联删除
        result1 = await db_session.execute(
            select(Dataset).where(Dataset.id == dataset1_id)
        )
        result2 = await db_session.execute(
            select(Dataset).where(Dataset.id == dataset2_id)
        )
        assert result1.scalar_one_or_none() is None
        assert result2.scalar_one_or_none() is None

    async def test_scenario_with_multiple_datasets(self, db_session, sample_project):
        """测试场景关联多个数据集"""
        # 创建场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="测试场景",
        )
        db_session.add(scenario)
        await db_session.commit()
        await db_session.refresh(scenario)

        # 创建多个数据集
        dataset1 = Dataset(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            name="用户数据",
            data="username,password\nuser1,pass1\n",
        )
        dataset2 = Dataset(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            name="产品数据",
            data="product_id,price\n1,99.99\n",
        )
        dataset3 = Dataset(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            name="订单数据",
            data="order_id,total\n123,100.00\n",
        )

        db_session.add_all([dataset1, dataset2, dataset3])
        await db_session.commit()

        # 查询场景的所有数据集
        result = await db_session.execute(
            select(Dataset).where(Dataset.scenario_id == scenario.id)
        )
        datasets = result.scalars().all()

        assert len(datasets) == 3
        dataset_names = [ds.name for ds in datasets]
        assert "用户数据" in dataset_names
        assert "产品数据" in dataset_names
        assert "订单数据" in dataset_names

    async def test_full_scenario_workflow(self, db_session, sample_project):
        """测试完整场景工作流 (场景 + 步骤 + 数据集)"""
        from app.models.keyword import Keyword

        # 创建关键字
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

        # 创建场景
        scenario = Scenario(
            id=str(uuid.uuid4()),
            project_id=sample_project.id,
            name="用户登录流程",
            description="测试用户登录的完整流程",
            pre_sql="DELETE FROM users WHERE username = 'testuser'",
            post_sql="SELECT * FROM users WHERE username = 'testuser'",
        )
        db_session.add(scenario)
        await db_session.commit()
        await db_session.refresh(scenario)

        # 创建步骤
        step1 = ScenarioStep(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            keyword_id=keyword.id,
            step_order=1,
            parameters='{"url": "/api/login", "method": "POST"}',
            expected_result='{"status_code": 200}',
        )
        step2 = ScenarioStep(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            keyword_id=keyword.id,
            step_order=2,
            parameters='{"url": "/api/user/profile", "method": "GET"}',
            expected_result='{"status_code": 200}',
        )
        db_session.add_all([step1, step2])
        await db_session.commit()

        # 创建数据集
        dataset = Dataset(
            id=str(uuid.uuid4()),
            scenario_id=scenario.id,
            name="登录测试数据",
            data="username,password\ntestuser,testpass123\n",
        )
        db_session.add(dataset)
        await db_session.commit()

        # 验证完整工作流
        assert scenario.name == "用户登录流程"
        assert scenario.description == "测试用户登录的完整流程"
        assert scenario.pre_sql == "DELETE FROM users WHERE username = 'testuser'"
        assert scenario.post_sql == "SELECT * FROM users WHERE username = 'testuser'"

        # 验证步骤
        steps_result = await db_session.execute(
            select(ScenarioStep)
            .where(ScenarioStep.scenario_id == scenario.id)
            .order_by(ScenarioStep.step_order)
        )
        steps = steps_result.scalars().all()
        assert len(steps) == 2
        assert steps[0].step_order == 1
        assert steps[1].step_order == 2
        assert steps[0].keyword_id == keyword.id
        assert steps[1].keyword_id == keyword.id

        # 验证数据集
        datasets_result = await db_session.execute(
            select(Dataset).where(Dataset.scenario_id == scenario.id)
        )
        datasets = datasets_result.scalars().all()
        assert len(datasets) == 1
        assert datasets[0].name == "登录测试数据"
        assert "username,password" in datasets[0].data
