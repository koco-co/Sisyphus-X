# OAuth 单点登录配置指南

本文档说明如何配置 GitHub 和 Google OAuth 单点登录功能。

## 📋 目录

- [GitHub OAuth 配置](#github-oauth-配置)
- [Google OAuth 配置](#google-oauth-配置)
- [环境变量配置](#环境变量配置)
- [测试验证](#测试验证)

---

## GitHub OAuth 配置

### 1. 创建 GitHub OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 **OAuth Apps** → **New OAuth App**
3. 填写应用信息：
   - **Application name**: `SisyphusX Local` (或自定义名称)
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:8000/api/v1/auth/github/callback`
4. 点击 **Register application**
5. 复制 **Client ID**
6. 点击 **Generate a new client secret** 并复制 **Client Secret**

### 2. 配置环境变量

在 `backend/.env` 文件中添加：

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

---

## Google OAuth 配置

### 1. 创建 Google OAuth 项目

1. 访问 https://console.cloud.google.com/
2. 创建新项目或选择现有项目
3. 启用 Google+ API：
   - 导航到 **APIs & Services** → **Library**
   - 搜索 "Google+ API" 并启用

4. 创建 OAuth 2.0 凭据：
   - 导航到 **APIs & Services** → **Credentials**
   - 点击 **Create Credentials** → **OAuth client ID**
   - 应用类型选择 **Web application**
   - 名称：`SisyphusX Local`
   - 已获授权的重定向 URI：`http://localhost:8000/api/v1/auth/google/callback`
   - 点击 **Create**

5. 复制 **Client ID** 和 **Client Secret**

### 2. 配置环境变量

在 `backend/.env` 文件中添加：

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## 环境变量配置

### 完整的 `backend/.env` 示例

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/sisyphus

# Redis
REDIS_URL=redis://localhost:6379/0

# Auth
SECRET_KEY=your-secret-key-change-in-production
AUTH_DISABLED=false  # 生产环境设为 false

# Frontend URL (用于 OAuth 回调)
FRONTEND_URL=http://localhost:5173

# AI
ANTHROPIC_API_KEY=your_anthropic_api_key

# GitHub OAuth (可选)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Google OAuth (可选)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OAuth (可选)
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
```

---

## 测试验证

### 1. 重启后端服务

```bash
cd backend
# 停止现有服务
Ctrl+C

# 重新启动
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. 测试 OAuth 端点

```bash
# 测试 GitHub OAuth 配置
curl http://localhost:8000/api/v1/auth/github

# 预期返回（已配置）：
# {"url":"https://github.com/login/oauth/authorize?client_id=..."}

# 预期返回（未配置）：
# {"detail":"GitHub OAuth 未配置"}

# 测试 Google OAuth 配置
curl http://localhost:8000/api/v1/auth/google

# 预期返回（已配置）：
# {"url":"https://accounts.google.com/o/oauth2/v2/auth?client_id=..."}

# 预期返回（未配置）：
# {"detail":"Google OAuth 未配置"}
```

### 3. 测试登录流程

1. 访问 http://localhost:5173/login
2. 点击 **GitHub** 或 **Google** 按钮
3. 如果未配置，会显示提示信息
4. 如果已配置，会跳转到 OAuth 授权页面
5. 授权后会自动登录并跳转到首页

---

## 生产环境配置

### 生产环境注意事项

1. **回调 URL**：使用生产域名而非 localhost
   - GitHub: `https://your-domain.com/api/v1/auth/github/callback`
   - Google: `https://your-domain.com/api/v1/auth/google/callback`

2. **环境变量**：使用环境变量管理工具（如 AWS Secrets Manager、Vault）

3. **安全**：
   - 不要在代码中硬编码 Client Secret
   - 使用 `.gitignore` 排除 `.env` 文件
   - 定期轮换密钥

---

## 常见问题

### Q: 点击按钮没有反应？

**A**: 检查以下项：
1. 后端服务是否运行
2. 浏览器控制台是否有错误
3. 是否配置了 OAuth 凭据
4. 点击 "显示 OAuth 配置说明" 查看详细信息

### Q: OAuth 回调失败？

**A**: 检查：
1. 回调 URL 是否正确配置（必须完全匹配）
2. Client Secret 是否正确
3. 网络连接是否正常

### Q: 开发环境如何跳过登录？

**A**: 在 `frontend/.env` 中设置：
```env
VITE_DEV_MODE_SKIP_LOGIN=true
VITE_AUTH_DISABLED=true
```

---

## 参考链接

- GitHub OAuth 文档：https://docs.github.com/en/developers/apps/building-oauth-apps
- Google OAuth 文档：https://developers.google.com/identity/protocols/oauth2
