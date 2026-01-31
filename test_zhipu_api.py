"""
测试智谱AI API连接
"""
import httpx
import asyncio
import json


async def test_zhipu_api():
    """测试智谱AI API"""
    api_key = "5b3312a29aad491d94c00be156be205f.f5JBJeb9axAoHfyC"
    endpoint = "https://open.bigmodel.cn/api/paas/v4/chat/completions"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "glm-4-flash",
        "messages": [
            {"role": "user", "content": "你好"}
        ],
        "max_tokens": 50
    }

    print("=" * 60)
    print("测试智谱AI API连接")
    print("=" * 60)
    print(f"\nAPI Key: 5b33...HfyC")
    print(f"端点: {endpoint}")
    print(f"模型: glm-4-flash")
    print("\n正在发送请求...\n")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(endpoint, headers=headers, json=payload)

            print(f"状态码: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print("✅ API连接成功！")
                print(f"\n响应内容:")
                print(json.dumps(data, indent=2, ensure_ascii=False))

                if "choices" in data and len(data["choices"]) > 0:
                    message = data["choices"][0]["message"]["content"]
                    print(f"\n模型回复: {message}")
            else:
                print(f"❌ API请求失败")
                print(f"\n错误响应:")
                print(response.text)

    except httpx.TimeoutException:
        print("❌ 请求超时")
        print("请检查网络连接")
    except Exception as e:
        print(f"❌ 连接失败: {str(e)}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(test_zhipu_api())
