# E2E 测试选择器参考文档

> 本文档提供前端页面的详细 UI 结构信息，用于编写和维护 Playwright E2E 测试。
>
> 更新时间：2026-02-18

## 目录
- [登录页面 (/login)](#1-登录页面-login)
- [注册页面 (/register)](#2-注册页面-register)
- [项目列表页面 (/api/projects)](#3-项目列表页面-apiprojects)
- [环境配置页面 (/api/projects/:id/environments)](#4-环境配置页面)

---

## 1. 登录页面 (/login)

**文件位置：** `frontend/src/pages/auth/Login.tsx`

### 1.1 页面结构
```html
<div class="min-h-screen bg-gradient-to-br from-slate-900...">
  <!-- Logo和标题区域 -->
  <div class="text-center mb-8">
    <div class="inline-flex items-center justify-center w-16 h-16 bg-cyan-500..."></div>
    <h1>SisyphusX</h1>
    <p>{t('auth.tagline')}</p>
  </div>

  <!-- 登录表单 -->
  <div class="bg-slate-800/50...">
    <form>
      <!-- 邮箱输入框 -->
      <!-- 密码输入框 -->
      <!-- 记住我复选框 -->
      <!-- 提交按钮 -->
    </form>

    <!-- 注册链接 -->
  </div>
</div>
```

### 1.2 关键元素选择器

#### 1.2.1 邮箱输入框
- **ID：** `email`
- **类型：** `email`
- **Placeholder：** `t('auth.emailPlaceholder')`（通过 i18n 动态生成）
- **CSS 类：** `bg-slate-900/50 border-slate-600 text-white...`
- **ARIA 属性：**
  - `aria-invalid="true/false"`（错误状态）
  - `aria-describedby="email-error"`（关联错误消息）

**推荐 Playwright 选择器：**
```typescript
// 方式 1：通过 ID（最推荐）
await page.locator('#email').fill('test@example.com')

// 方式 2：通过标签文本
await page.getByLabel('邮箱').fill('test@example.com')

// 方式 3：通过 placeholder（需要 i18n）
await page.getByPlaceholder('请输入邮箱').fill('test@example.com')

// 方式 4：通过类型
await page.locator('input[type="email"]').fill('test@example.com')
```

#### 1.2.2 密码输入框
- **ID：** `password`
- **类型：** `password` / `text`（切换显示）
- **Placeholder：** `t('auth.passwordPlaceholder')`
- **CSS 类：** `bg-slate-900/50 border-slate-600 text-white... pr-10`
- **ARIA 属性：** 同邮箱输入框

**推荐 Playwright 选择器：**
```typescript
// 方式 1：通过 ID（最推荐）
await page.locator('#password').fill('password123')

// 方式 2：通过标签文本
await page.getByLabel('密码').fill('password123')

// 方式 3：通过类型
await page.locator('input[type="password"]').fill('password123')
```

#### 1.2.3 记住我复选框
- **ID：** `remember`
- **类型：** `checkbox`
- **关联 Label：** `for="remember"`，文本：`{t('auth.rememberMe')}`
- **CSS 类：** `w-4 h-4 rounded border-slate-600 bg-slate-900/50 text-cyan-500...`

**推荐 Playwright 选择器：**
```typescript
// 方式 1：通过 ID
await page.locator('#remember').check()

// 方式 2：通过 Label 文本
await page.getByLabel('记住我').check()

// 方式 3：通过 Label 关联
await page.locator('label[for="remember"]').click()
```

#### 1.2.4 登录按钮
- **类型：** `submit`
- **文本内容：**
  - 正常：`{t('auth.login')}` → "登录"
  - 加载中：`登录中...`
- **CSS 类：** `w-full bg-gradient-to-r from-cyan-500 to-blue-500...`
- **图标：** `Loader2`（加载中时显示）

**推荐 Playwright 选择器：**
```typescript
// 方式 1：通过文本（最推荐）
await page.getByRole('button', { name: '登录' }).click()

// 方式 2：通过类型
await page.locator('button[type="submit"]').click()

// 方式 3：通过 CSS 类
await page.locator('button.bg-gradient-to-r').click()
```

#### 1.2.5 注册链接
- **路径：** `/register`
- **文本：** `{t('auth.register')}` → "注册"
- **CSS 类：** `text-cyan-400 hover:text-cyan-300 font-medium...`

**推荐 Playwright 选择器：**
```typescript
// 方式 1：通过文本
await page.getByRole('link', { name: '注册' }).click()

// 方式 2：通过路径
await page.getByRole('link', { name: /register/i }).click()
```

### 1.3 错误状态元素

#### 邮箱错误消息
- **ID：** `email-error`
- **角色：** `role="alert"`
- **CSS 类：** `mt-1.5 text-sm text-red-400`

```typescript
await page.locator('#email-error').waitFor()
const errorMessage = await page.locator('#email-error').textContent()
```

#### 密码错误消息
- **ID：** `password-error`
- **角色：** `role="alert"`

#### 通用错误消息
- **角色：** `role="alert"`
- **CSS 类：** `p-3 rounded-lg bg-red-500/10 border border-red-500/20`
- **子元素：** `p.text-sm.text-red-400`

```typescript
await page.getByRole('alert').textContent()
```

### 1.4 特殊交互元素

#### 显示/隐藏密码按钮
- **类型：** `button`
- **位置：** 密码输入框右侧 `absolute right-3`
- **图标：** `Eye` / `EyeOff`（lucide-react）
- **ARIA 标签：**
  - 显示：`aria-label="显示密码"`
  - 隐藏：`aria-label="隐藏密码"`

```typescript
await page.getByLabel('显示密码').click()
```

---

## 2. 注册页面 (/register)

**文件位置：** `frontend/src/pages/auth/Register.tsx`

### 2.1 页面结构
类似登录页面，包含额外的密码强度指示器和确认密码字段。

### 2.2 关键元素选择器

#### 2.2.1 用户名输入框
- **ID：** `username`
- **类型：** `text`
- **Placeholder：** `t('auth.usernamePlaceholder')`
- **验证规则：** 最少 3 个字符

**推荐 Playwright 选择器：**
```typescript
await page.locator('#username').fill('testuser')
// 或
await page.getByLabel('用户名').fill('testuser')
```

#### 2.2.2 邮箱输入框
- **ID：** `email`
- **类型：** `email`
- **Placeholder：** `t('auth.emailPlaceholder')`

**推荐 Playwright 选择器：**
```typescript
await page.locator('#email').fill('test@example.com')
```

#### 2.2.3 密码输入框
- **ID：** `password`
- **类型：** `password`
- **Placeholder：** `t('auth.passwordPlaceholder')`
- **验证规则：** 最少 6 个字符

**推荐 Playwright 选择器：**
```typescript
await page.locator('#password').fill('password123')
```

#### 2.2.4 密码强度指示器
**结构：**
```html
<div class="flex items-center gap-2">
  <!-- 进度条背景 -->
  <div class="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
    <!-- 强度条 -->
    <div
      class="h-full transition-all duration-300 {strengthColor}"
      style="width: {width}%"
    />
  </div>
  <!-- 强度文本 -->
  <span class="text-xs font-medium {textColor}">
    {weak/medium/strong}
  </span>
</div>
```

**强度颜色类名：**
- 弱：`bg-red-500`（宽度 33%）
- 中：`bg-yellow-500`（宽度 66%）
- 强：`bg-green-500`（宽度 100%）

**文本颜色类名：**
- 弱：`text-red-400`
- 中：`text-yellow-400`
- 强：`text-green-400`

**推荐 Playwright 选择器：**
```typescript
// 等待强度指示器出现
await page.locator('.bg-red-500, .bg-yellow-500, .bg-green-500').waitFor()

// 获取当前强度
const strengthBar = page.locator('.flex-1.h-1\\.5 > div')
const width = await strengthBar.getAttribute('style')
// width: "33%" | "66%" | "100%"

// 获取强度文本
const strengthText = await page.locator('.text-xs.font-medium').textContent()
// "弱" | "中" | "强"

// 验证特定强度
await expect(page.locator('.bg-green-500')).toBeVisible() // 强密码
```

#### 2.2.5 确认密码输入框
- **ID：** `confirmPassword`
- **类型：** `password`
- **Placeholder：** `t('auth.confirmPasswordPlaceholder')`
- **匹配图标：** `CheckCircle2`（密码匹配时显示在右侧）

**推荐 Playwright 选择器：**
```typescript
await page.locator('#confirmPassword').fill('password123')
// 或
await page.getByLabel('确认密码').fill('password123')

// 验证密码匹配图标出现
await page.locator('.text-green-500').locator('svg').waitFor()
```

#### 2.2.6 注册按钮
- **类型：** `submit`
- **文本内容：**
  - 正常：`{t('auth.createAccount')}` → "创建账户" / "注册"
  - 加载中：`注册中...`
- **CSS 类：** `w-full bg-gradient-to-r from-purple-500 to-pink-500...`
- **图标：** `Loader2`（加载中时）

**推荐 Playwright 选择器：**
```typescript
await page.getByRole('button', { name: /注册|创建账户/ }).click()
```

### 2.3 错误状态元素

#### 字段错误消息
- **用户名错误：** `#username-error`
- **邮箱错误：** `#email-error`
- **密码错误：** `#password-error`
- **确认密码错误：** `#confirmPassword-error`

所有错误消息都有：
- **角色：** `role="alert"`
- **CSS 类：** `mt-1.5 text-sm text-red-400`

```typescript
await page.locator('#username-error').waitFor()
const errorText = await page.locator('#username-error').textContent()
```

#### 通用错误消息
- **容器：** `div[role="alert"]`，包含类 `p-3 rounded-lg bg-red-500/10 border...`
- **文本：** `p.text-sm.text-red-400`

```typescript
await page.getByRole('alert').textContent()
```

---

## 3. 项目列表页面 (/api/projects)

**文件位置：** `frontend/src/pages/projects/ProjectList.tsx`

### 3.1 页面结构
```html
<div class="p-8 max-w-[1600px] mx-auto space-y-8">
  <!-- Header -->
  <header class="flex justify-between items-center">
    <h1>项目管理</h1>
    <button data-testid="create-project-button">新建项目</button>
  </header>

  <!-- Search Box -->
  <div class="relative max-w-md">
    <Input placeholder="搜索项目名称..." />
  </div>

  <!-- Project Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <!-- Project Cards -->
  </div>

  <!-- Pagination -->
  <Pagination />
</div>
```

### 3.2 关键元素选择器

#### 3.2.1 创建项目按钮
- **data-testid：** `create-project-button`
- **文本：** "新建项目"
- **图标：** `Plus`（lucide-react）
- **CSS 类：** `bg-cyan-500 hover:bg-cyan-600 text-white...`

**推荐 Playwright 选择器：**
```typescript
// 方式 1：通过 data-testid（最推荐）
await page.getByTestId('create-project-button').click()

// 方式 2：通过文本
await page.getByRole('button', { name: '新建项目' }).click()

// 方式 3：通过图标和文本组合
await page.getByRole('button', { name: /新建项目/ }).click()
```

#### 3.2.2 搜索输入框
- **类型：** `text`
- **Placeholder：** "搜索项目名称..."
- **位置：** `relative max-w-md`
- **图标：** `Search`（左侧绝对定位）

**推荐 Playwright 选择器：**
```typescript
// 方式 1：通过 placeholder（最推荐）
await page.getByPlaceholder('搜索项目名称').fill('Sisyphus')

// 方式 2：通过类型和位置
await page.locator('.max-w-md input[type="text"]').fill('Sisyphus')

// 方式 3：通过 aria-label（如果添加）
await page.getByLabel('搜索项目').fill('Sisyphus')
```

#### 3.2.3 项目卡片
**单个卡片结构：**
```html
<motion.div whileHover={{ y: -4 }}>
  <Card class="bg-slate-900 border border-white/5 hover:border-cyan-500/30...">
    <Link to={`/api/projects/${project.id}/settings`}>
      <CardHeader>
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <CardTitle class="text-xl text-white truncate">
              {project.name}
            </CardTitle>
            <CardDescription class="font-mono text-xs mt-1">
              #{project.key}
            </CardDescription>
          </div>
          <button class="p-2 text-slate-400 hover:text-red-400...">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <p class="text-slate-400 text-sm mb-4 line-clamp-2 min-h-[40px]">
          {project.description || '暂无描述'}
        </p>
        <div class="flex items-center text-xs text-slate-500">
          <Calendar class="w-3.5 h-3.5 mr-1.5" />
          创建于 {formatDate(project.created_at)}
        </div>
      </CardContent>
    </Link>
  </Card>
</motion.div>
```

**CSS 类名：**
- 卡片容器：`bg-slate-900 border border-white/5 hover:border-cyan-500/30`
- 标题：`text-xl text-white truncate`
- 项目键：`font-mono text-xs mt-1`
- 描述：`text-slate-400 text-sm mb-4 line-clamp-2 min-h-[40px]`
- 删除按钮：`p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10`

**推荐 Playwright 选择器：**
```typescript
// 通过项目名称定位卡片
const projectCard = page.getByText('Sisyphus接口自动化测试')
await projectCard.click()

// 通过项目键定位
const projectCard = page.getByText('#PRJ_123456')
await projectCard.click()

// 通过删除按钮定位（注意：这会点击删除，不是卡片）
await page.getByRole('button', { name: /删除/ }).click()

// 组合选择器：定位特定项目的删除按钮
await page
  .getByText('Sisyphus接口自动化测试')
  .locator('../../..')
  .getByRole('button', { name: /删除/ })
  .click()

// 通过索引定位（第1个项目）
await page.locator('.grid > div').first().click()

// 等待卡片出现
await page.locator('.bg-slate-900.border').first().waitFor()
```

#### 3.2.4 删除按钮（项目卡片内）
- **图标：** `Trash2`（lucide-react，w-4 h-4）
- **CSS 类：** `p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg`
- **位置：** 卡片 header 右上角

**推荐 Playwright 选择器：**
```typescript
// 方式 1：通过图标（需要悬停）
const card = page.getByText('Sisyphus接口自动化测试')
await card.hover()
await page.locator('svg').filter({ hasText: '' }).locator('path[d*="M19 7l-.867"]')

// 方式 2：通过 CSS 类和悬停
const card = page.getByText('Sisyphus接口自动化测试')
await card.hover()
await card.locator('.hover\\:text-red-400').click()

// 方式 3：通过 aria-label（推荐添加 aria-label="删除项目"）
await page.getByLabel('删除项目').click()

// 方式 4：通过项目名称 + 定位到按钮
await page
  .getByText('Sisyphus接口自动化测试')
  .locator('..')
  .locator('..')
  .locator('button')
  .click()
```

#### 3.2.5 加载状态
- **容器：** `div.flex.justify-center.items-center.py-20`
- **文本：** "加载中..."
- **图标：** `Loader2`（animate-spin）

```typescript
await page.getByText('加载中').waitFor()
await page.locator('.animate-spin').waitFor() // Loader2 图标
```

#### 3.2.6 空状态
- **标题：** "暂无项目"
- **描述：** "创建一个项目开始您的自动化测试之旅"
- **操作按钮：** "立即创建"

```typescript
await page.getByText('暂无项目').waitFor()
await page.getByRole('button', { name: '立即创建' }).click()
```

### 3.3 创建项目对话框

#### 3.3.1 对话框容器
```html
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
  <motion.div class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg...">
    <!-- 对话框内容 -->
  </motion.div>
</div>
```

#### 3.3.2 项目名称输入框
- **ID：** `project-name`
- **data-testid：** `project-name-input`
- **Placeholder：** "e.g. Sisyphus接口自动化测试"
- **验证：** 必填，最多 50 个字符

**推荐 Playwright 选择器：**
```typescript
await page.getByTestId('project-name-input').fill('测试项目')
// 或
await page.locator('#project-name').fill('测试项目')
// 或
await page.getByLabel('项目名称').fill('测试项目')
```

#### 3.3.3 项目描述输入框
- **ID：** `project-description`
- **data-testid：** `project-description-input`
- **类型：** `textarea`
- **Placeholder：** "e.g. 包含电商核心链路的自动化测试用例集合..."
- **行数：** `rows={3}`
- **验证：** 可选，最多 200 个字符

**推荐 Playwright 选择器：**
```typescript
await page.getByTestId('project-description-input').fill('这是测试描述')
// 或
await page.locator('#project-description').fill('这是测试描述')
// 或
await page.getByLabel('项目描述').fill('这是测试描述')
```

#### 3.3.4 提交按钮
- **data-testid：** `submit-project-button`
- **文本：** "创建"
- **加载状态文本：** "创建"（图标在加载）
- **CSS 类：** `bg-cyan-500 hover:bg-cyan-600 text-white`
- **图标：** `Loader2`（加载中时）

**推荐 Playwright 选择器：**
```typescript
await page.getByTestId('submit-project-button').click()
// 或
await page.getByRole('button', { name: '创建' }).click()
```

#### 3.3.5 取消按钮
- **文本：** "取消"
- **CSS 类：** `text-slate-400 hover:text-white`（variant="ghost"）

```typescript
await page.getByRole('button', { name: '取消' }).click()
```

#### 3.3.6 字符计数提示
- **项目名称：** `{current} / 50`
- **项目描述：** `{current} / 200`
- **CSS 类：** `text-slate-500 text-xs mt-1.5`

```typescript
const countText = await page.getByText(/\d+ \/ 50/).textContent()
```

### 3.4 删除确认对话框

**组件：** `<ConfirmDialog />`

- **标题：** "删除项目"
- **描述：** "此操作无法撤销。确定要删除该项目吗？"
- **确认文本：** "删除"
- **验证文本：** `{project.name}`
- **isDestructive：** `true`

```typescript
await page.getByText('删除项目').waitFor()
await page.getByRole('button', { name: '删除' }).click()
```

---

## 4. 环境配置页面 (/api/projects/:id/environments)

**文件位置：** `frontend/src/pages/environments/EnvironmentList.tsx`

### 4.1 页面结构
```html
<div class="min-h-screen bg-slate-950 p-8">
  <div class="max-w-7xl mx-auto">
    <!-- 页面标题和返回按钮 -->
    <div class="flex items-center gap-4 mb-8">
      <Button>返回项目列表</Button>
      <div>
        <h1>环境配置管理</h1>
        <p>管理测试环境配置，包括域名、环境变量和公共 Headers</p>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="flex justify-between items-center mb-6">
      <div>项目 ID: {projectId} · 共 {environments.length} 个环境</div>
      <Button>创建环境</Button>
    </div>

    <!-- 环境列表 -->
    <div class="grid gap-4">
      <!-- Environment Cards -->
    </div>
  </div>
</div>
```

### 4.2 关键元素选择器

#### 4.2.1 返回按钮
- **文本：** "返回项目列表"
- **图标：** `ArrowLeft`（lucide-react）
- **路径：** `/api/projects`

**推荐 Playwright 选择器：**
```typescript
await page.getByRole('button', { name: '返回项目列表' }).click()
// 或
await page.getByRole('link', { name: /返回/ }).click()
```

#### 4.2.2 页面标题
- **主标题：** `h1.text-3xl.font-bold.text-white` → "环境配置管理"
- **副标题：** `p.text-slate-400` → "管理测试环境配置..."

```typescript
await page.getByRole('heading', { name: '环境配置管理' }).waitFor()
```

#### 4.2.3 创建环境按钮
- **文本：** "创建环境"
- **图标：** `Plus`（lucide-react）
- **CSS 类：** `bg-cyan-500 hover:bg-cyan-600 text-white`

**推荐 Playwright 选择器：**
```typescript
// 方式 1：通过文本（最推荐）
await page.getByRole('button', { name: '创建环境' }).click()

// 方式 2：通过图标和文本
await page.locator('button:has(svg)').getByText('创建环境').click()

// 方式 3：通过 CSS 类
await page.locator('button.bg-cyan-500').click()
```

#### 4.2.4 环境卡片
**单个卡片结构：**
```html
<div class="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-cyan-500/50...">
  <div class="flex items-start justify-between">
    <!-- 左侧信息 -->
    <div class="flex-1">
      <div class="flex items-center gap-3 mb-3">
        <h3 class="text-lg font-semibold text-white">{env.name}</h3>
        <span class="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded border border-cyan-500/20">
          {env.domain}
        </span>
      </div>

      <!-- 详细信息 -->
      <div class="space-y-2 text-sm">
        <div>域名: <code>{env.domain || '未设置'}</code></div>
        <div>环境变量: {Object.keys(env.variables).length} 个</div>
        <div>公共 Headers: {Object.keys(env.headers).length} 个</div>
        <div>创建时间: {formatDate(env.created_at)}</div>
      </div>
    </div>

    <!-- 右侧操作按钮 -->
    <div class="flex gap-2">
      <button title="克隆环境"><Copy /></button>
      <button title="编辑环境"><Pencil /></button>
      <button title="删除环境"><Trash2 /></button>
    </div>
  </div>
</div>
```

**CSS 类名：**
- 卡片容器：`bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-cyan-500/50`
- 环境名称：`text-lg font-semibold text-white`
- 域名标签：`text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded border border-cyan-500/20`
- 域名代码：`text-cyan-400 bg-slate-800 px-2 py-1 rounded font-mono text-xs`

**推荐 Playwright 选择器：**
```typescript
// 通过环境名称定位卡片
const envCard = page.getByText('开发环境')
await envCard.waitFor()

// 通过域名定位
const envCard = page.getByText('api-dev.example.com')

// 点击卡片（导航到项目设置）
await envCard.click()

// 定位特定环境的编辑按钮
await page
  .getByText('开发环境')
  .locator('..')
  .locator('..')
  .getByTitle('编辑环境')
  .click()

// 通过索引定位（第1个环境）
await page.locator('.grid > div').first().click()
```

#### 4.2.5 操作按钮（环境卡片内）

##### 克隆按钮
- **图标：** `Copy`（lucide-react）
- **title 属性：** `title="克隆环境"`
- **CSS 类：** `text-slate-400 hover:text-cyan-400 hover:bg-slate-800`

```typescript
await page.getByTitle('克隆环境').click()
// 或
await page.locator('button[title="克隆环境"]').click()
```

##### 编辑按钮
- **图标：** `Pencil`（lucide-react）
- **title 属性：** `title="编辑环境"`
- **CSS 类：** `text-cyan-400 hover:text-cyan-300 hover:bg-slate-800`

```typescript
await page.getByTitle('编辑环境').click()
// 或
await page.locator('button[title="编辑环境"]').click()
```

##### 删除按钮
- **图标：** `Trash2`（lucide-react）
- **title 属性：** `title="删除环境"`
- **CSS 类：** `text-red-400 hover:text-red-300 hover:bg-slate-800`

```typescript
await page.getByTitle('删除环境').click()
// 或
await page.locator('button[title="删除环境"]').click()
```

#### 4.2.6 加载状态
- **容器：** `div.flex.items-center.justify-center.py-12`
- **图标：** `Loader2`（w-8 h-8 text-cyan-500 animate-spin）

```typescript
await page.locator('.animate-spin').waitFor()
```

#### 4.2.7 空状态
- **组件：** `<EmptyState />`
- **标题：** "暂无环境配置"
- **描述：** "点击上方「创建环境」按钮创建第一个环境"
- **操作按钮：** "创建环境"

```typescript
await page.getByText('暂无环境配置').waitFor()
await page.getByRole('button', { name: '创建环境' }).click()
```

### 4.3 创建/编辑环境对话框

**组件：** `<EnvironmentDialog />`

#### 4.3.1 对话框容器
```html
<DialogContent class="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
  <DialogHeader>
    <DialogTitle>{mode === 'create' ? '创建环境' : '编辑环境'}</DialogTitle>
  </DialogHeader>

  <!-- 表单内容 -->
  <div class="space-y-6 py-4">
    <!-- 基本信息 -->
    <!-- 环境变量 -->
    <!-- 公共 Headers -->
  </div>

  <DialogFooter>
    <Button>取消</Button>
    <Button>{mode === 'create' ? '创建' : '保存'}</Button>
  </DialogFooter>
</DialogContent>
```

#### 4.3.2 环境名称输入框
- **ID：** `name`
- **类型：** `text`
- **Placeholder：** "例如：开发环境、测试环境、生产环境"
- **验证：** 必填，最多 50 个字符

**推荐 Playwright 选择器：**
```typescript
await page.locator('#name').fill('测试环境')
// 或
await page.getByLabel('环境名称').fill('测试环境')
```

#### 4.3.3 域名 URL 输入框
- **ID：** `domain`
- **类型：** `text`
- **Placeholder：** "https://api-dev.example.com"
- **验证：** 可选，最多 200 个字符
- **字体：** `font-mono`

**推荐 Playwright 选择器：**
```typescript
await page.locator('#domain').fill('https://api-test.example.com')
// 或
await page.getByLabel('域名 URL').fill('https://api-test.example.com')
```

#### 4.3.4 环境变量区域
**添加按钮：**
- **文本：** "添加变量"
- **图标：** `Plus`
- **CSS 类：** `text-cyan-400 hover:text-cyan-300 h-7`

```typescript
await page.getByRole('button', { name: '添加变量' }).click()
```

**变量输入框对：**
```html
<div class="flex gap-2">
  <Input placeholder="变量名" class="bg-slate-800 border-slate-700 font-mono text-sm" />
  <Input placeholder="变量值" class="flex-1 bg-slate-800 border-slate-700 font-mono text-sm" />
  <Button class="text-red-400 hover:text-red-300 h-8 w-8 p-0">
    <Trash2 />
  </Button>
</div>
```

```typescript
// 填写变量
await page.getByPlaceholder('变量名').fill('TOKEN')
await page.getByPlaceholder('变量值').fill('secret-token')

// 删除变量
await page.locator('.flex.gap-2').first().locator('button').click()
```

**空状态提示：**
- **文本：** "暂无变量，点击上方按钮添加"
- **CSS 类：** `text-center py-4 bg-slate-800/50 rounded text-slate-500 text-sm`

#### 4.3.5 公共 Headers 区域
**添加按钮：**
- **文本：** "添加 Header"
- **图标：** `Plus`

```typescript
await page.getByRole('button', { name: '添加 Header' }).click()
```

**Header 输入框对：**
```html
<div class="flex gap-2">
  <Input placeholder="Header 名称" class="bg-slate-800 border-slate-700 font-mono text-sm" />
  <Input placeholder="Header 值" class="flex-1 bg-slate-800 border-slate-700 font-mono text-sm" />
  <Button class="text-red-400 hover:text-red-300 h-8 w-8 p-0">
    <Trash2 />
  </Button>
</div>
```

```typescript
await page.getByPlaceholder('Header 名称').fill('Authorization')
await page.getByPlaceholder('Header 值').fill('Bearer token')
```

#### 4.3.6 保存/取消按钮

##### 取消按钮
- **文本：** "取消"
- **CSS 类：** `bg-slate-800 text-slate-300 hover:bg-slate-700`（variant="ghost"）

```typescript
await page.getByRole('button', { name: '取消' }).click()
```

##### 保存按钮
- **文本（创建模式）：** "创建"
- **文本（编辑模式）：** "保存"
- **CSS 类：** `bg-cyan-500 hover:bg-cyan-600 text-white`
- **图标：** `Loader2`（加载中时）

**推荐 Playwright 选择器：**
```typescript
// 创建模式
await page.getByRole('button', { name: '创建' }).click()

// 编辑模式
await page.getByRole('button', { name: '保存' }).click()

// 通过 CSS 类
await page.locator('button.bg-cyan-500').last().click()
```

### 4.4 删除确认对话框

- **标题：** "确认删除环境"
- **描述：** "确定要删除环境 "{env.name}" 吗？此操作不可撤销。"
- **确认文本：** "删除"
- **取消文本：** "取消"
- **isDestructive：** `true`

```typescript
await page.getByText('确认删除环境').waitFor()
await page.getByRole('button', { name: '删除' }).click()
```

---

## 5. 通用 UI 组件选择器

### 5.1 Toast 消息
**组件：** 使用 `sonner` 或自定义 Toast

```typescript
// 等待成功消息
await page.getByText(/成功|created|success/i).waitFor()

// 等待错误消息
await page.getByText(/失败|error|failed/i).waitFor()

// 通过角色
await page.getByRole('status').textContent()
```

### 5.2 确认对话框（ConfirmDialog）
**通用属性：**
- `isOpen`: 控制显示/隐藏
- `title`: 对话框标题
- `description`: 描述文本
- `confirmText`: 确认按钮文本
- `cancelText`: 取消按钮文本
- `isDestructive`: 是否为破坏性操作（红色按钮）

```typescript
// 确认
await page.getByRole('button', { name: /确认|删除/ }).click()

// 取消
await page.getByRole('button', { name: /取消/ }).click()

// 验证文本输入（如果有验证字段）
await page.getByRole('textbox').fill(projectName)
```

### 5.3 分页组件（Pagination）
**组件：** `<Pagination />`

```typescript
// 下一页
await page.getByRole('button', { name: /下一页|>/ }).click()

// 上一页
await page.getByRole('button', { name: /上一页|</ }).click()

// 跳转到特定页码
await page.getByRole('button', { name: '2' }).click()

// 获取当前页码
const currentPage = await page.getByRole('button', { name: /\d+/ }).filter({ hasClass: 'bg-cyan-500' }).textContent()
```

### 5.4 加载状态（通用）
**图标：** `Loader2`（lucide-react）
**CSS 类：** `animate-spin`

```typescript
await page.locator('.animate-spin').waitFor({ state: 'attached' })
await page.locator('.animate-spin').waitFor({ state: 'hidden' })
```

### 5.5 空状态（EmptyState）
**组件：** `<EmptyState />`

**属性：**
- `icon`: 图标元素
- `title`: 标题
- `description`: 描述
- `action`: 操作按钮（可选）

```typescript
await page.getByText('暂无').waitFor()
await page.getByRole('button', { name: /立即|创建/ }).click()
```

---

## 6. 测试最佳实践

### 6.1 选择器优先级
1. **data-testid**（最稳定）
2. **ARIA 属性**（role, aria-label）
3. **ID**（唯一标识）
4. **Label 关联**
5. **文本内容**（可能变化）
6. **CSS 类**（样式可能变化）
7. **XPath**（最后选择）

### 6.2 等待策略
```typescript
// 等待元素可见
await page.getByTestId('create-project-button').waitFor({ state: 'visible' })

// 等待元素可点击
await page.getByRole('button', { name: '创建' }).waitFor({ state: 'attached' })

// 等待导航完成
await page.waitForURL('/api/projects')

// 等待加载状态消失
await page.locator('.animate-spin').waitFor({ state: 'hidden' })

// 等待网络请求完成
await page.waitForResponse('**/api/v1/projects')
```

### 6.3 断言建议
```typescript
// 验证元素存在
await expect(page.getByText('项目创建成功')).toBeVisible()

// 验证元素数量
await expect(page.locator('.grid > div')).toHaveCount(3)

// 验证文本内容
await expect(page.getByTestId('project-name')).toHaveValue('测试项目')

// 验证属性
await expect(page.getByRole('button', { name: '创建' })).toBeDisabled()

// 验证 URL
await expect(page).toHaveURL('/api/projects/1/environments')
```

### 6.4 错误处理
```typescript
try {
  await page.getByTestId('submit-button').click({ timeout: 5000 })
} catch (error) {
  // 检查是否有错误消息
  const errorText = await page.locator('.text-red-400').textContent()
  throw new Error(`操作失败: ${errorText}`)
}
```

### 6.5 重试机制
Playwright 自带自动重试，但在某些场景需要手动重试：
```typescript
await expect(async () => {
  await page.getByTestId('create-button').click()
  await page.getByText('创建成功').waitFor({ timeout: 3000 })
}).toPass({
  timeout: 10000,
  intervals: [1000, 2000, 3000]
})
```

### 6.6 环境变量
在测试中可能需要配置的环境变量：
```typescript
// frontend/.env.test
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_AUTH_DISABLED=true
VITE_DEV_MODE_SKIP_LOGIN=true
```

---

## 7. 常见问题

### 7.1 国际化文本
项目使用 `react-i18next`，因此部分文本是动态生成的：
```typescript
// 使用正则匹配
await page.getByRole('button', { name: /登录|login/i }).click()

// 使用 data-testid（推荐）
await page.getByTestId('login-button').click()
```

### 7.2 动画和过渡
页面使用 `framer-motion`，需要等待动画完成：
```typescript
// 等待动画结束
await page.waitForTimeout(300) // 简单延迟

// 或等待特定状态
await page.locator('.animate-spin').waitFor({ state: 'hidden' })
```

### 7.3 模态对话框
使用 `Dialog` 组件（shadcn/ui）：
```typescript
// 等待对话框打开
await page.getByRole('dialog').waitFor()

// 在对话框内操作
await page.getByRole('dialog').getByLabel('项目名称').fill('测试')

// 关闭对话框（点击遮罩层）
await page.locator('.fixed.inset-0').click()
```

### 7.4 响应式布局
页面在不同屏幕尺寸下布局不同：
```typescript
// 设置视口大小
await page.setViewportSize({ width: 1920, height: 1080 })

// 移动端
await page.setViewportSize({ width: 375, height: 667 })
```

---

## 8. 附录

### 8.1 使用的图标库
- **lucide-react：** 主要图标库
- **常见图标：**
  - `Plus` - 添加/新建
  - `Trash2` - 删除
  - `Pencil` - 编辑
  - `Search` - 搜索
  - `Loader2` - 加载中（配合 `animate-spin`）
  - `Eye` / `EyeOff` - 显示/隐藏密码
  - `CheckCircle2` - 成功标记
  - `Calendar` - 日期
  - `FolderKanban` - 项目
  - `Globe` - 环境/域名
  - `Copy` - 克隆/复制
  - `ArrowLeft` - 返回

### 8.2 使用的 UI 组件库
- **shadcn/ui：** 基础组件
  - `Button`
  - `Input`
  - `Label`
  - `Dialog`
  - `Card`
  - `Textarea`
- **Framer Motion：** 动画库
- **React Query：** 数据获取和缓存
- **React Router：** 路由管理

### 8.3 颜色系统
- **主色调：**
  - Cyan（青色）：`bg-cyan-500`, `text-cyan-400`
  - Purple（紫色）：`bg-purple-500`（注册页面）
  - Pink（粉色）：`bg-pink-500`（注册页面）
  - Blue（蓝色）：`bg-blue-500`（登录页面）
- **背景色：**
  - Slate（石板灰）：`bg-slate-900`, `bg-slate-800`, `bg-slate-950`
- **状态色：**
  - 红色：`text-red-400`, `bg-red-500`
  - 黄色：`text-yellow-400`
  - 绿色：`text-green-400`

### 8.4 常用 CSS 类模式
- **圆角：** `rounded-lg`, `rounded-2xl`
- **阴影：** `shadow-lg`, `shadow-2xl`
- **过渡：** `transition-all`, `transition-colors`
- **悬停：** `hover:*`
- **禁用：** `disabled:opacity-50`, `disabled:cursor-not-allowed`

---

## 更新日志

### 2026-02-18
- 初始版本创建
- 包含登录、注册、项目列表、环境配置四个页面
- 添加通用 UI 组件选择器
- 添加测试最佳实践和常见问题

---

**维护者：** @frontend-dev
**最后更新：** 2026-02-18
**文档版本：** 1.0.0
