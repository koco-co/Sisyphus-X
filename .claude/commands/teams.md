---
description: Agent Teams 功能实现
---

请为 Sisyphus-X 实现功能。

创建一个 5人 Agent Team：

1. architect - 先完善系统设计DB表结构、API接口

2. backend - 实现数据库模型、Service、API 路由

3. frontend - 实现 UI 组件、Hook、页面、API client

4.qa - 编写 unit + integration 测试并运行

5. reviewer - 对所有改动做代码审查

执行顺序：architect 先行 -> backend/frontend 并行 -> qa -> reviewer。

验收标准：


- 所有新增测试通过（uv run pytest）

- 不破坏现有功能