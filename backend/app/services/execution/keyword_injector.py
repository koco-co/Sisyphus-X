"""
关键字注入器 - 管理动态关键字的收集和注入
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.keyword import Keyword
from typing import Optional


class KeywordInjector:
    """关键字动态注入管理"""

    async def collect_keywords(
        self, session: AsyncSession, project_id: str, category: Optional[str] = None
    ) -> list[Keyword]:
        """
        收集项目的活跃关键字

        Args:
            session: 数据库会话
            project_id: 项目ID
            category: 可选的分类过滤（当前未实现，保留以备未来扩展）

        Returns:
            关键字实例列表
        """
        query = select(Keyword).where(Keyword.project_id == project_id, Keyword.is_enabled)

        # Note: category filtering not implemented in current Keyword model
        # Future enhancement: add category field to Keyword model

        result = await session.execute(query)
        return list(result.scalars().all())

    def validate_keyword_code(self, code: str) -> dict:
        """
        验证关键字代码语法和安全性

        Args:
            code: Python代码字符串

        Returns:
            验证结果 {"valid": bool, "error": str}
        """
        try:
            compile(code, "<string>", "exec")
            return {"valid": True, "error": None}
        except SyntaxError as e:
            return {"valid": False, "error": f"Line {e.lineno}: {e.msg}"}
        except Exception as e:
            return {"valid": False, "error": str(e)}

    def inject_to_executor(self, keywords: list[Keyword]) -> list[str]:
        """
        将关键字代码序列化为列表，供执行器加载

        Args:
            keywords: 关键字实例列表

        Returns:
            关键字代码列表
        """
        return [kw.code for kw in keywords if kw.is_enabled]

    async def prepare_keywords_for_execution(
        self, session: AsyncSession, project_id: str
    ) -> list[str]:
        """
        为执行准备关键字代码

        Args:
            session: 数据库会话
            project_id: 项目ID

        Returns:
            关键字代码列表
        """
        keywords = await self.collect_keywords(session, project_id)
        return self.inject_to_executor(keywords)
