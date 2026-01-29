"""
关键字注入器 - 管理动态关键字的收集和注入
"""

import json
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.models.keyword import Keyword


class KeywordInjector:
    """关键字动态注入管理"""

    async def collect_keywords(
        self,
        session: AsyncSession,
        project_id: int,
        category: Optional[str] = None
    ) -> List[Keyword]:
        """
        收集项目的活跃关键字

        Args:
            session: 数据库会话
            project_id: 项目ID
            category: 可选的分类过滤

        Returns:
            关键字实例列表
        """
        query = select(Keyword).where(
            Keyword.project_id == project_id,
            Keyword.is_active == True
        )

        if category:
            query = query.where(Keyword.category == category)

        result = await session.execute(query)
        return result.scalars().all()

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
            return {
                "valid": False,
                "error": f"Line {e.lineno}: {e.msg}"
            }
        except Exception as e:
            return {
                "valid": False,
                "error": str(e)
            }

    def inject_to_executor(self, keywords: List[Keyword]) -> List[str]:
        """
        将关键字代码序列化为列表，供执行器加载

        Args:
            keywords: 关键字实例列表

        Returns:
            关键字代码列表
        """
        return [kw.function_code for kw in keywords if kw.is_active]

    async def prepare_keywords_for_execution(
        self,
        session: AsyncSession,
        project_id: int
    ) -> List[str]:
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
