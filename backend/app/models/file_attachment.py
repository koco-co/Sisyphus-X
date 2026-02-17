"""
文件附件模型 - 功能测试模块
管理MinIO文件存储记录
"""

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class FileAttachment(SQLModel, table=True):
    """文件存储记录表"""

    __tablename__ = "file_attachments"  # pyright: ignore[reportAssignmentType]
    id: int = Field(primary_key=True)
    file_id: str = Field(unique=True, index=True)  # UUID

    # 文件信息
    filename: str
    file_type: str  # image/png/application/pdf
    file_size: int  # 字节
    file_path: str  # MinIO存储路径

    # 关联
    entity_type: str  # requirement/test_case
    entity_id: int

    # 元数据
    uploaded_by: int
    created_at: datetime = Field(default_factory=datetime.now(timezone.utc))

    class Config:
        indexes = [
            "file_id",
            ["entity_type", "entity_id"],
        ]
