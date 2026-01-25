import networkx as nx
from typing import List, Dict, Any, Optional

class ScenarioParser:
    @staticmethod
    def parse_to_steps(graph_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        将 ReactFlow 的图形数据转换为线性的执行步骤列表。
        使用拓扑排序处理节点间的依赖关系。
        """
        nodes = graph_data.get('nodes', [])
        edges = graph_data.get('edges', [])
        
        if not nodes:
            return []
            
        # 1. 构建有向图
        G = nx.DiGraph()
        
        node_map = {n['id']: n for n in nodes}
        for node in nodes:
            G.add_node(node['id'], **node.get('data', {}))
            
        for edge in edges:
            source = edge.get('source')
            target = edge.get('target')
            if source and target:
                G.add_edge(source, target)
                
        # 2. 检查是否有向无环图 (DAG)
        if not nx.is_directed_acyclic_graph(G):
            # 在实际业务中可通过异常抛出通知用户
            raise ValueError("Scenario graph contains cycles, which is not allowed.")
            
        # 3. 拓扑排序获取执行顺序
        try:
            execution_order = list(nx.topological_sort(G))
        except nx.NetworkXUnfeasible:
            raise ValueError("Scenario graph is not a valid DAG.")
            
        # 4. 转换为执行步骤格式
        steps = []
        for node_id in execution_order:
            node_data = node_map[node_id].get('data', {})
            node_type = node_data.get('type')
            
            # 跳过一些辅助节点（如果有的话）
            if node_type == 'start' or node_type == 'end':
                continue
                
            step = {
                "id": node_id,
                "name": node_data.get('label', 'Unnamed Step'),
                "type": node_type,
                "config": node_data.get('config', {}),
                "extract": node_data.get('extract', {}),
                "validate": node_data.get('validate', [])
            }
            steps.append(step)
            
        return steps

    @staticmethod
    def generate_engine_yaml(scenario_name: str, steps: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        生成 api-engine 兼容的测试计划格式（YAML 映射）。
        """
        teststeps = []
        for step in steps:
            if step['type'] == 'api':
                teststep = {
                    "name": step['name'],
                    "request": {
                        "method": step['config'].get('method', 'GET'),
                        "url": step['config'].get('url', ''),
                        "headers": step['config'].get('headers', {}),
                        "json": step['config'].get('json', {})
                    },
                    "extract": step['extract'],
                    "validate": step['validate']
                }
                teststeps.append(teststep)
            elif step['type'] == 'wait':
                teststeps.append({
                    "name": step['name'],
                    "variables": {
                        "sleep_time": step['config'].get('wait_time', 1000) / 1000
                    },
                    "testcase": "wait_step" # 假设引擎有这样一个通用等待用例
                })
        
        return {
            "config": {
                "name": scenario_name,
                "variables": {}
            },
            "teststeps": teststeps
        }
