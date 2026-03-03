from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.db import init_db
from app.core.redis import close_redis
from app.middleware.error_handler import (
    ErrorHandlerMiddleware,
    RequestLoggingMiddleware,
    SecurityMiddleware,
)
from app.modules.auth.routes import router as auth_router

# 模块化路由导入
from app.modules.project.routes import router as project_router_v2
from app.modules.project.database_routes import router as database_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    await init_db()
    print("Database initialized")

    # Start Background Scheduler
    import asyncio

    from app.core.scheduler import start_scheduler

    task = asyncio.create_task(start_scheduler())

    yield

    # 关闭时
    print("Shutting down...")
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

    await close_redis()
    print("Redis connection closed")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.APP_VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
    redirect_slashes=False,  # 禁用自动重定向，避免307错误
)

# 添加自定义中间件
app.add_middleware(SecurityMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(ErrorHandlerMiddleware)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
# 模块化路由 (v2) - 使用 /v2 前缀以区分旧路由
app.include_router(project_router_v2, prefix=f"{settings.API_V1_STR}/v2")
app.include_router(database_router, prefix=f"{settings.API_V1_STR}/v2")


@app.get("/")
def read_root():
    return {"message": "Welcome to Sisyphus X API"}


# 健康检查
@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "ok", "version": settings.APP_VERSION}
