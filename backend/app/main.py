from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.db import init_db
from app.middleware.error_handler import (
    ErrorHandlerMiddleware,
    RequestLoggingMiddleware,
    SecurityMiddleware,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB
    await init_db()

    # Start Background Scheduler
    import asyncio

    from app.core.scheduler import start_scheduler

    task = asyncio.create_task(start_scheduler())

    yield

    # Cleanup
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# 配置 CORS 以允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://192.168.199.222:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加自定义中间件
app.add_middleware(SecurityMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(ErrorHandlerMiddleware)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def read_root():
    return {"message": "Welcome to Sisyphus X API"}
