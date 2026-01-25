# SisyphusX 前端

基于 React 18 + TypeScript + Tailwind CSS 构建的现代化测试平台前端。

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 原子化 CSS
- **React Router** - 路由
- **React Query** - 数据请求
- **ReactFlow** - 流程图编辑
- **Monaco Editor** - 代码编辑器
- **Recharts** - 图表
- **i18next** - 国际化

## 目录结构

```
src/
├── api/           # API 客户端
├── components/    # 通用组件
│   └── layout/    # 布局组件
├── contexts/      # React Context
│   ├── AuthContext.tsx     # 认证上下文
│   ├── ThemeContext.tsx    # 主题上下文
│   └── SidebarContext.tsx  # 侧边栏上下文
├── i18n/          # 国际化
│   └── locales/   # 翻译文件
├── lib/           # 工具函数
├── pages/         # 页面组件
│   ├── auth/      # 认证页面
│   ├── cases/     # 用例管理
│   ├── interface/ # 接口管理
│   └── scenario/  # 场景编排
└── types/         # 类型定义
```

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 代码检查
npm run lint
```

## 主要功能

### 主题系统
- 支持明/暗/系统三种模式
- 使用 CSS 变量实现主题切换
- 自动保存用户偏好

### 国际化
- 支持中文/英文
- 自动检测系统语言
- 可手动切换

### 认证
- 登录/注册界面
- Token 管理
- 演示模式 (无需登录)
