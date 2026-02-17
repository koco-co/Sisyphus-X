from fastapi import APIRouter, Depends

# TODO: user_management - 需要修复导入问题后重新启用
# from app.api.v1.endpoints import user_management
from app.api import deps
from app.api.v1.endpoints import (
    ai_clarification,
    ai_config,
    api_test_cases,
    auth,
    case_generation,
    # curl_parser,  # TEMP: 暂时禁用
    dashboard,
    database_configs,
    documents,
    engine,
    environments,
    execution,
    functional,
    global_params,
    # history,  # TEMP: 暂时禁用
    interfaces,
    interface_folders,
    keywords,
    plans,
    point_generation,
    projects,
    reports,
    scenarios,
    settings,
    # swagger,  # TEMP: 暂时禁用
    testcases,
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
    testcases.router,
    prefix="/testcases",
    tags=["testcases"],
    dependencies=[Depends(deps.get_current_user)],
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
api_router.include_router(
    functional.router,
    prefix="/functional",
    tags=["functional"],
    dependencies=[Depends(deps.get_current_user)],
)
api_router.include_router(
    documents.router,
    prefix="/documents",
    tags=["documents"],
    dependencies=[Depends(deps.get_current_user)],
)
api_router.include_router(
    execution.router,
    prefix="/execution",
    tags=["execution"],
    dependencies=[Depends(deps.get_current_user)],
)
api_router.include_router(
    api_test_cases.router, tags=["api-test-cases"], dependencies=[Depends(deps.get_current_user)]
)
api_router.include_router(
    ai_config.router,
    prefix="/ai/configs",
    tags=["AI配置管理"],
    dependencies=[Depends(deps.get_current_user)],
)
api_router.include_router(
    ai_clarification.router,
    prefix="/ai",
    tags=["AI需求澄清"],
    dependencies=[Depends(deps.get_current_user)],
)
api_router.include_router(
    point_generation.router,
    prefix="/test-points",
    tags=["测试点生成"],
    dependencies=[Depends(deps.get_current_user)],
)
api_router.include_router(
    case_generation.router,
    prefix="/test-cases/generate",
    tags=["测试用例生成"],
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
