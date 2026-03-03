"""接口模块 - 接口定义和目录管理"""

from app.modules.interface.routes import router as interface_router
from app.modules.interface.schemas import (
    FolderCreate,
    FolderResponse,
    FolderUpdate,
    InterfaceCreate,
    InterfaceListResponse,
    InterfaceResponse,
    InterfaceUpdate,
)
from app.modules.interface.service import FolderService, InterfaceService

__all__ = [
    # Router
    "interface_router",
    # Schemas
    "FolderCreate",
    "FolderUpdate",
    "FolderResponse",
    "InterfaceCreate",
    "InterfaceUpdate",
    "InterfaceResponse",
    "InterfaceListResponse",
    # Services
    "FolderService",
    "InterfaceService",
]
