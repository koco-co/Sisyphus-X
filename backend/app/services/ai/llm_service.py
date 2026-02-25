"""
多厂商LLM服务 - 功能测试模块
支持OpenAI、Anthropic、通义千问、文心一言
"""

from typing import Any

from langchain_anthropic import ChatAnthropic
from langchain_community.chat_models import QianfanChatEndpoint
from langchain_openai import ChatOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_config import AIProviderConfig
from app.services.ai_config_service import AIConfigService


class MultiVendorLLMService:
    """多厂商LLM服务"""

    def __init__(self, config: AIProviderConfig):
        """
        初始化LLM服务

        Args:
            config: AI厂商配置对象
        """
        self.config = config
        self._provider_type = config.provider_type
        self._decrypted_api_key = AIConfigService.decrypt_config_key(config)

    def get_llm(self) -> Any:
        """
        获取LLM实例

        Returns:
            LLM实例（langchain聊天模型）
        """
        provider_type = self._provider_type

        # 构建通用参数
        kwargs = {
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
        }

        # 根据厂商类型创建对应的LLM实例
        if provider_type == "openai":
            chat_cls: Any = ChatOpenAI
            openai_kwargs: dict[str, Any] = {
                "model": self.config.model_name,
                "api_key": self._decrypted_api_key,
                "base_url": self.config.api_endpoint,
                **kwargs,
            }
            return chat_cls(**openai_kwargs)

        elif provider_type == "anthropic":
            chat_cls: Any = ChatAnthropic
            anthropic_kwargs: dict[str, Any] = {
                "model_name": self.config.model_name,
                "api_key": self._decrypted_api_key,
                "base_url": self.config.api_endpoint,
                **kwargs,
            }
            return chat_cls(**anthropic_kwargs)

        elif provider_type == "qwen":
            # 阿里云通义千问
            from langchain_community.chat_models.tongyi import ChatTongyi

            chat_cls: Any = ChatTongyi
            qwen_kwargs: dict[str, Any] = {
                "api_key": self._decrypted_api_key,
                "model_name": self.config.model_name,
                **kwargs,
            }
            return chat_cls(**qwen_kwargs)

        elif provider_type == "qianfan":
            # 百度文心一言
            chat_cls: Any = QianfanChatEndpoint
            qianfan_kwargs: dict[str, Any] = {
                "api_key": self._decrypted_api_key,
                "model": self.config.model_name,
                **kwargs,
            }
            return chat_cls(**qianfan_kwargs)

        elif provider_type == "glm":
            # 智谱AI (GLM) - 使用专用实现
            from langchain_community.chat_models import ChatZhipuAI

            return ChatZhipuAI(
                api_key=self._decrypted_api_key, model=self.config.model_name, **kwargs
            )

        else:
            raise ValueError(f"不支持的AI厂商: {provider_type}")

    @staticmethod
    async def get_default_llm_service(
        session: AsyncSession, user_id: int
    ) -> "MultiVendorLLMService | None":
        """
        获取用户的默认LLM服务实例

        Args:
            session: 数据库会话
            user_id: 用户ID

        Returns:
            MultiVendorLLMService实例或None（如果没有默认配置）
        """
        import sys

        print(f"🔍 [get_default_llm] 开始获取用户 {user_id} 的默认LLM", file=sys.stderr, flush=True)

        # 获取默认配置
        result = await session.execute(
            select(AIProviderConfig)
            .where(AIProviderConfig.user_id == user_id)
            .where(AIProviderConfig.is_default.is_(True))
            .where(AIProviderConfig.is_enabled.is_(True))
        )
        config = result.scalar_one_or_none()

        print(f"🔍 [get_default_llm] 查询结果: {config}", file=sys.stderr, flush=True)

        if not config:
            print("❌ [get_default_llm] 未找到配置", file=sys.stderr, flush=True)
            return None

        # 创建并返回LLM服务实例
        try:
            print(
                f"🏗️ [get_default_llm] 创建 LLM 服务，provider_type={config.provider_type}",
                file=sys.stderr,
                flush=True,
            )
            llm_service = MultiVendorLLMService(config)
            print(
                f"✅ [get_default_llm] LLM 服务创建成功: {type(llm_service).__name__}",
                file=sys.stderr,
                flush=True,
            )
            return llm_service
        except Exception as e:
            print(f"❌ [get_default_llm] 创建 LLM 失败: {e}", file=sys.stderr, flush=True)
            import traceback

            traceback.print_exc(file=sys.stderr)
            return None

    @staticmethod
    async def get_llm_by_provider(
        session: AsyncSession, user_id: int, provider_type: str
    ) -> Any | None:
        """
        根据厂商类型获取LLM实例

        Args:
            session: 数据库会话
            user_id: 用户ID
            provider_type: 厂商类型

        Returns:
            LLM实例或None
        """
        # 获取指定厂商的配置
        result = await session.execute(
            select(AIProviderConfig)
            .where(AIProviderConfig.user_id == user_id)
            .where(AIProviderConfig.provider_type == provider_type)
            .where(AIProviderConfig.is_enabled.is_(True))
            .order_by(AIProviderConfig.is_default.desc())
        )
        config = result.scalar_one_or_none()

        if not config:
            return None

        # 创建并返回LLM实例
        llm_service = MultiVendorLLMService(config)
        return llm_service.get_llm()

    async def ainvoke(self, messages: list[dict[str, str]]) -> str:
        """
        异步调用LLM

        Args:
            messages: 消息列表，格式为 [{"role": "user", "content": "..."}]

        Returns:
            LLM响应文本
        """
        import sys

        llm = self.get_llm()
        print(
            f"[ainvoke] 开始异步调用, provider_type={self._provider_type}",
            file=sys.stderr,
            flush=True,
        )

        # 转换消息格式（如果需要）
        from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

        lc_messages = []
        for msg in messages:
            if msg["role"] == "system":
                lc_messages.append(SystemMessage(content=msg["content"]))
            elif msg["role"] == "user":
                lc_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                lc_messages.append(AIMessage(content=msg["content"]))

        print(f"[ainvoke] 消息转换完成, 消息数量={len(lc_messages)}", file=sys.stderr, flush=True)

        # 对于 qwen (ChatTongyi)，使用 to_thread 在线程池中运行同步调用
        if self._provider_type == "qwen":
            import asyncio

            print("[ainvoke] 使用 asyncio.to_thread 调用同步 invoke", file=sys.stderr, flush=True)
            try:
                response = await asyncio.to_thread(llm.invoke, lc_messages)
                print(
                    f"[ainvoke] asyncio.to_thread 完成, 响应长度={len(response.content)}",
                    file=sys.stderr,
                    flush=True,
                )
                return response.content
            except Exception as e:
                print(f"[ainvoke] asyncio.to_thread 失败: {e}", file=sys.stderr, flush=True)
                import traceback

                traceback.print_exc(file=sys.stderr)
                raise
        else:
            # 其他厂商使用异步调用
            print("[ainvoke] 使用异步 ainvoke", file=sys.stderr, flush=True)
            response = await llm.ainvoke(lc_messages)
            return response.content

    async def astream(self, messages: list[dict[str, str]]):
        """
        异步流式调用LLM

        Args:
            messages: 消息列表

        Yields:
            LLM响应文本片段
        """
        llm = self.get_llm()

        # 转换消息格式
        from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

        lc_messages = []
        for msg in messages:
            if msg["role"] == "system":
                lc_messages.append(SystemMessage(content=msg["content"]))
            elif msg["role"] == "user":
                lc_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                lc_messages.append(AIMessage(content=msg["content"]))

        # 流式调用LLM
        async for chunk in llm.astream(lc_messages):
            yield chunk.content

    def get_model_info(self) -> dict[str, Any]:
        """
        获取当前模型信息

        Returns:
            模型信息字典
        """
        return {
            "provider_type": self._provider_type,
            "provider_name": self.config.provider_name,
            "model_name": self.config.model_name,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
        }

    @staticmethod
    async def get_default_llm(
        session: AsyncSession, user_id: int
    ) -> "MultiVendorLLMService | None":
        """兼容旧调用名。"""
        return await MultiVendorLLMService.get_default_llm_service(session, user_id)


# 使用示例
"""
from app.services.ai.llm_service import MultiVendorLLMService
from sqlalchemy.ext.asyncio import AsyncSession

async def example_usage():
    # 方式1: 使用配置对象创建
    config = ... # 从数据库获取配置
    llm_service = MultiVendorLLMService(config)
    llm = llm_service.get_llm()
    response = await llm.ainvoke([{"role": "user", "content": "Hello"}])

    # 方式2: 直接获取用户默认LLM
    llm = await MultiVendorLLMService.get_default_llm(session, user_id)
    if llm:
        response = await llm.ainvoke([{"role": "user", "content": "Hello"}])

    # 方式3: 根据厂商类型获取
    llm = await MultiVendorLLMService.get_llm_by_provider(session, user_id, "openai")
"""
