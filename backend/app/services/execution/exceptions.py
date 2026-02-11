"""
执行器适配层异常定义
"""


class ExecutorException(Exception):  # noqa: N818
    """执行器异常基类"""

    pass


class YAMLGenerationException(ExecutorException):
    """YAML生成异常"""

    pass


class ExecutionTimeoutException(ExecutorException):
    """执行超时异常"""

    pass


class ResultParseException(ExecutorException):
    """结果解析异常"""

    pass


class ExecutionException(ExecutorException):
    """执行过程异常"""

    pass
