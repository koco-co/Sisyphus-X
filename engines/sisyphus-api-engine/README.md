# sisyphus-api-engine

YAML 驱动的接口自动化测试引擎，供 Sisyphus-X 平台调用。

## 使用

```bash
# 默认文本输出
sisyphus --case case.yaml

# JSON 输出（平台集成）
sisyphus --case case.yaml -O json

# Allure 报告
sisyphus --case case.yaml -O allure --allure-dir ./allure-results
```

## 开发

```bash
uv sync
uv run pytest tests/ -v
```
