from fastapi import APIRouter, Depends

# 仅保留需求文档与开发任务清单中的模块（4 登录注册、5 Dashboard、6 接口自动化、7 全局参数、系统设置）
from app.api import deps
from app.api.v1.endpoints import (
    auth,
    dashboard,
    database_configs,
    engine,
    environments,
    global_params,
    interface_folders,
    interfaces,
    keywords,
    plans,
    projects,
    reports,
    scenarios,
    settings,
    upload,
    websocket,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(
    projects.router,
    prefix="/projects",
    tags=["projects"],
    dependencies=[Depends(deps.get_current_user)],
)
api_router.include_router(
    database_configs.router,
    prefix="/projects",
    tags=["database-configs"],
    dependencies=[Depends(deps.get_current_user)],
)
api_router.include_router(
    interfaces.router,
    prefix="/interfaces",
    tags=["interfaces"],
    dependencies=[Depends(deps.get_current_user)],
)
# Interface folders
api_router.include_router(
    interface_folders.router,
    prefix="/projects",
    tags=["interface-folders"],
    dependencies=[Depends(deps.get_current_user)],
)
# api_router.include_router(
#     swagger.router,  # TEMP: 暂时禁用
#     prefix="/interfaces",
#     tags=["swagger"],
#     dependencies=[Depends(deps.get_current_user)],
# )
# api_router.include_router(
#     curl_parser.router,  # TEMP: 暂时禁用
#     prefix="/interfaces",
#     tags=["curl"],
#     dependencies=[Depends(deps.get_current_user)],
# )
api_router.include_router(
    upload.router, prefix="/files", tags=["files"], dependencies=[Depends(deps.get_current_user)]
)
api_router.include_router(
    scenarios.router,
    prefix="/scenarios",
    tags=["scenarios"],
    dependencies=[Depends(deps.get_current_user)],
)
api_router.include_router(
    engine.router, prefix="/engine", tags=["engine"], dependencies=[Depends(deps.get_current_user)]
)
api_router.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(deps.get_current_user)],
)
api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["reports"],
    dependencies=[Depends(deps.get_current_user)],
)
api_router.include_router(
    plans.router, prefix="/plans", tags=["plans"], dependencies=[Depends(deps.get_current_user)]
)
api_router.include_router(
    keywords.router,
    prefix="/keywords",
    tags=["keywords"],
    dependencies=[Depends(deps.get_current_user)],
)
api_router.include_router(
    settings.router,
    prefix="/settings",
    tags=["settings"],
    dependencies=[Depends(deps.get_current_user)],
)
# Environment management
api_router.include_router(
    environments.router,
    prefix="/projects/{project_id}/environments",
    tags=["environments"],
    dependencies=[Depends(deps.get_current_user)],
)
# Interface history
# api_router.include_router(
#     history.router,  # TEMP: 暂时禁用
#     prefix="/interfaces",
#     tags=["history"],
#     dependencies=[Depends(deps.get_current_user)],
# )
# Global parameters
api_router.include_router(
    global_params.router,
    prefix="/global-params",
    tags=["global-params"],
    dependencies=[Depends(deps.get_current_user)],
)
# WebSocket endpoints
api_router.include_router(
    websocket.router,
    prefix="/ws",
    tags=["websocket"],
)
# TODO: user_management - 需要修复导入问题后重新启用
# api_router.include_router(user_management.router, prefix="/admin", tags=["用户权限管理"], dependencies=[Depends(deps.get_current_user)])
