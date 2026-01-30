# 数据模型优化建议

## 当前数据模型分析

### 1. 已识别的冗余

#### TestCase 模型
**位置：** `backend/app/models/test_case.py`

**问题：**
- 与 `FunctionalTestCase` 和 `ApiTestCase` 存在功能重叠
- 字段定义不够明确

**建议：**
- 明确 `TestCase` 为传统测试用例（手动测试用例）
- `ApiTestCase` 用于 API 自动化测试
- `FunctionalTestCase` 用于功能测试
- 三者各司其职，不重复

#### Project 模型重复定义
**位置：**
- `backend/app/models/project.py`
- `backend/app/models/user_management.py`

**问题：**
- Project 模型在两个文件中定义

**建议：**
- 只在 `project.py` 中保留完整定义
- `user_management.py` 中使用 import 引用

### 2. 字段优化建议

#### 统一时间戳字段
所有模型统一使用：
- `created_at`: datetime - 创建时间
- `updated_at`: Optional[datetime] - 更新时间
- `deleted_at`: Optional[datetime] - 软删除时间（如果需要）

#### 统一基础字段
```python
id: Optional[int] = Field(default=None, primary_key=True)
name: str = Field(max_length=200)
description: Optional[str] = Field(default=None)
created_at: datetime = Field(default_factory=datetime.utcnow)
updated_at: Optional[datetime] = None
```

### 3. 关系优化

#### 明确外键关系
- 使用 `ForeignKey` 约束
- 添加 `Relationship` 定义
- 考虑级联删除策略

#### 索引优化
为常用查询字段添加索引：
- 外键字段
- 查询过滤字段
- 唯一约束字段

## 优化执行计划

### 阶段 1：清理重复定义
- [ ] 合并 Project 模型定义
- [ ] 删除 test_case.py 中的冗余定义

### 阶段 2：字段标准化
- [ ] 统一时间戳字段命名
- [ ] 统一状态字段（使用 Enum）
- [ ] 添加软删除支持

### 阶段 3：关系优化
- [ ] 明确所有模型关系
- [ ] 添加必要的索引
- [ ] 优化查询性能

### 阶段 4：数据迁移
- [ ] 创建数据库迁移脚本
- [ ] 迁移现有数据
- [ ] 验证数据完整性

## 数据模型层次结构建议

```
核心模型层
├── 用户权限
│   ├── User
│   ├── Role
│   └── Permission
├── 项目管理
│   ├── Project
│   └── Environment
├── 测试资源
│   ├── Interface (API 接口定义)
│   ├── TestCase (传统测试用例)
│   ├── ApiTestCase (API 自动化用例)
│   └── FunctionalTestCase (功能测试用例)
└── 执行记录
    ├── TestExecution
    └── TestReport
```

## 当前状态

✅ **已完成：**
- 基础模型定义
- API 测试用例模型
- 功能测试模型
- 用户权限模型

⚠️ **需要优化：**
- Project 模型重复定义
- 部分字段命名不统一
- 缺少数据库索引优化

## 下一步行动

1. 立即执行：合并 Project 模型定义
2. 短期计划：添加数据库索引
3. 长期规划：完全统一字段命名规范
