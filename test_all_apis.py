"""
全面的 API 端点测试脚本
测试所有已实现的后端 API 接口
"""
import asyncio
import aiohttp
import json
from typing import Dict, List, Any
from datetime import datetime

# 配置
BASE_URL = "http://localhost:8000/api/v1"
TOKEN = None  # 如果需要认证，在这里设置 token


class APITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = None
        self.results = []
        self.test_data = {}

    async def __aenter__(self):
        headers = {}
        if TOKEN:
            headers['Authorization'] = f'Bearer {TOKEN}'
        self.session = aiohttp.ClientSession(headers=headers)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """发送 HTTP 请求"""
        url = f"{self.base_url}{endpoint}"
        start_time = datetime.now()

        try:
            async with self.session.request(method, url, **kwargs) as response:
                duration = (datetime.now() - start_time).total_seconds()
                status_code = response.status

                try:
                    data = await response.json()
                except:
                    data = await response.text()

                result = {
                    'method': method,
                    'endpoint': endpoint,
                    'status_code': status_code,
                    'duration': duration,
                    'success': 200 <= status_code < 300,
                    'data': data if status_code < 400 else None,
                    'error': data if status_code >= 400 else None
                }

                self.results.append(result)
                return result

        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            result = {
                'method': method,
                'endpoint': endpoint,
                'status_code': 0,
                'duration': duration,
                'success': False,
                'error': str(e)
            }
            self.results.append(result)
            return result

    def print_result(self, result: Dict[str, Any]):
        """打印测试结果"""
        status = "✓" if result['success'] else "✗"
        color = "\033[92m" if result['success'] else "\033[91m"
        reset = "\033[0m"

        print(f"{color}{status}{reset} {result['method']} {result['endpoint']}")
        print(f"  Status: {result['status_code']}")
        print(f"  Duration: {result['duration']:.3f}s")

        if result['error']:
            print(f"  Error: {result['error']}")
        print()

    async def test_projects(self):
        """测试项目管理 API"""
        print("\n=== 测试项目管理 API ===\n")

        # 列出项目
        result = await self.request('GET', '/projects/')
        self.print_result(result)

        if result['success'] and result['data']:
            projects = result['data'].get('items', []) if isinstance(result['data'], dict) else result['data']
            if projects:
                self.test_data['project_id'] = projects[0]['id']
                print(f"  使用项目 ID: {self.test_data['project_id']}")

        # 创建项目
        new_project = {
            "name": f"测试项目 {datetime.now().strftime('%Y%m%d%H%M%S')}",
            "key": f"TEST{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "owner": "Test User",
            "description": "API 测试创建的项目"
        }
        result = await self.request('POST', '/projects/', json=new_project)
        self.print_result(result)

        if result['success']:
            self.test_data['project_id'] = result['data']['id']
            print(f"  创建的项目 ID: {self.test_data['project_id']}")

    async def test_environments(self):
        """测试环境配置 API"""
        print("\n=== 测试环境配置 API ===\n")

        if 'project_id' not in self.test_data:
            print("  跳过：没有项目 ID")
            return

        project_id = self.test_data['project_id']

        # 列出环境
        result = await self.request('GET', f'/projects/{project_id}/environments')
        self.print_result(result)

        # 创建环境
        new_env = {
            "name": "测试环境",
            "domain": "https://api.example.com",
            "variables": {"ENV": "test"},
            "headers": {"X-Test": "true"}
        }
        result = await self.request('POST', f'/projects/{project_id}/environments', json=new_env)
        self.print_result(result)

        if result['success']:
            self.test_data['environment_id'] = result['data']['id']

    async def test_interfaces(self):
        """测试接口管理 API"""
        print("\n=== 测试接口管理 API ===\n")

        if 'project_id' not in self.test_data:
            print("  跳过：没有项目 ID")
            return

        project_id = self.test_data['project_id']

        # 列出接口
        result = await self.request('GET', '/interfaces/', params={'project_id': project_id})
        self.print_result(result)

        # 创建接口
        new_interface = {
            "project_id": project_id,
            "name": "测试接口",
            "url": "/api/test",
            "method": "GET"
        }
        result = await self.request('POST', '/interfaces/', json=new_interface)
        self.print_result(result)

        if result['success']:
            self.test_data['interface_id'] = result['data']['id']

        # 列出文件夹
        result = await self.request('GET', '/interfaces/folders', params={'project_id': project_id})
        self.print_result(result)

    async def test_keywords(self):
        """测试关键字管理 API"""
        print("\n=== 测试关键字管理 API ===\n")

        if 'project_id' not in self.test_data:
            print("  跳过：没有项目 ID")
            return

        # 列出关键字
        result = await self.request('GET', '/keywords/', params={'project_id': self.test_data['project_id']})
        self.print_result(result)

        # 创建关键字
        new_keyword = {
            "project_id": self.test_data['project_id'],
            "name": "测试关键字",
            "description": "这是一个测试关键字",
            "func_name": "test_keyword",
            "function_code": "def test_keyword():\n    pass",
            "category": "custom",
            "language": "python",
            "enabled": True
        }
        result = await self.request('POST', '/keywords/', json=new_keyword)
        self.print_result(result)

    async def test_scenarios(self):
        """测试场景编排 API"""
        print("\n=== 测试场景编排 API ===\n")

        # 列出场景
        result = await self.request('GET', '/scenarios/')
        self.print_result(result)

        if 'project_id' not in self.test_data:
            print("  跳过创建场景：没有项目 ID")
            return

        # 创建场景
        new_scenario = {
            "project_id": self.test_data['project_id'],
            "name": "测试场景",
            "graph_data": {"nodes": [], "edges": []}
        }
        result = await self.request('POST', '/scenarios/', json=new_scenario)
        self.print_result(result)

    async def test_api_test_cases(self):
        """测试 API 测试用例 API"""
        print("\n=== 测试 API 测试用例 API ===\n")

        if 'project_id' not in self.test_data:
            print("  跳过：没有项目 ID")
            return

        project_id = self.test_data['project_id']

        # 列出测试用例
        result = await self.request('GET', f'/projects/{project_id}/api-test-cases')
        self.print_result(result)

        # 创建测试用例
        new_test_case = {
            "name": "测试用例",
            "description": "这是一个测试用例",
            "config_data": {
                "name": "测试用例",
                "base_url": "https://api.example.com",
                "steps": [
                    {
                        "name": "测试步骤",
                        "request": {
                            "method": "GET",
                            "url": "/api/test"
                        }
                    }
                ]
            },
            "enabled": True
        }
        result = await self.request('POST', f'/projects/{project_id}/api-test-cases', json=new_test_case)
        self.print_result(result)

        if result['success']:
            self.test_data['test_case_id'] = result['data']['id']

    async def test_ai_configs(self):
        """测试 AI 配置 API"""
        print("\n=== 测试 AI 配置 API ===\n")

        # 列出 AI 配置
        result = await self.request('GET', '/ai/configs/')
        self.print_result(result)

        # 获取默认配置
        result = await self.request('GET', '/ai/configs/default')
        self.print_result(result)

    async def test_requirements(self):
        """测试需求管理 API"""
        print("\n=== 测试需求管理 API ===\n")

        # 列出需求
        result = await self.request('GET', '/functional/requirements')
        self.print_result(result)

        # 创建需求
        new_requirement = {
            "title": f"测试需求 {datetime.now().strftime('%Y%m%d%H%M%S')}",
            "description": "这是一个测试需求",
            "priority": "p2",
            "module_name": "测试模块"
        }
        result = await self.request('POST', '/functional/requirements', json=new_requirement)
        self.print_result(result)

        if result['success']:
            self.test_data['requirement_id'] = result['data']['id']

    async def test_dashboard(self):
        """测试仪表盘 API"""
        print("\n=== 测试仪表盘 API ===\n")

        # 获取统计数据
        result = await self.request('GET', '/dashboard/stats')
        self.print_result(result)

        # 获取趋势数据
        result = await self.request('GET', '/dashboard/trend')
        self.print_result(result)

        # 获取活动数据
        result = await self.request('GET', '/dashboard/activities')
        self.print_result(result)

    async def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print("开始 API 测试")
        print("="*60)

        await self.test_projects()
        await self.test_environments()
        await self.test_interfaces()
        await self.test_keywords()
        await self.test_scenarios()
        await self.test_api_test_cases()
        await self.test_ai_configs()
        await self.test_requirements()
        await self.test_dashboard()

        self.print_summary()

    def print_summary(self):
        """打印测试总结"""
        print("\n" + "="*60)
        print("测试总结")
        print("="*60)

        total = len(self.results)
        success = sum(1 for r in self.results if r['success'])
        failed = total - success

        print(f"\n总计: {total}")
        print(f"成功: {success} ✓")
        print(f"失败: {failed} ✗")
        print(f"成功率: {success/total*100:.1f}%")

        if failed > 0:
            print("\n失败的接口:")
            for result in self.results:
                if not result['success']:
                    print(f"  ✗ {result['method']} {result['endpoint']} - {result.get('error', 'Unknown error')}")

        print("\n" + "="*60)


async def main():
    async with APITester() as tester:
        await tester.run_all_tests()


if __name__ == '__main__':
    asyncio.run(main())
