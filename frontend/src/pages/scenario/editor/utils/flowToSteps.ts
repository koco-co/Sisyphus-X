/**
 * 将 Flow 节点转换为后端 ScenarioStep 格式
 * 与 backend _convert_step_to_yaml 的 keyword_type 对齐: request, database, custom, wait
 */
import type { Node, Edge } from 'reactflow';
import type { NodeData } from '../types';

export interface StepPayload {
  description?: string;
  keyword_type: string;
  keyword_name: string;
  parameters?: Record<string, unknown>;
  sort_order: number;
}

function topologicalSort(nodes: Node<NodeData>[], edges: Edge[]): Node<NodeData>[] {
  const idToNode = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const outEdges = new Map<string, string[]>();

  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    outEdges.set(n.id, []);
  });
  edges.forEach((e) => {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    const list = outEdges.get(e.source) ?? [];
    list.push(e.target);
    outEdges.set(e.source, list);
  });

  const queue = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);
  const result: Node<NodeData>[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = idToNode.get(id);
    if (node) result.push(node);
    for (const targetId of outEdges.get(id) ?? []) {
      const d = (inDegree.get(targetId) ?? 1) - 1;
      inDegree.set(targetId, d);
      if (d === 0) queue.push(targetId);
    }
  }
  // 未在拓扑序中的节点按原顺序追加
  const resultIds = new Set(result.map((n) => n.id));
  nodes.forEach((n) => {
    if (!resultIds.has(n.id)) result.push(n);
  });
  return result;
}

export function flowNodesToSteps(
  nodes: Node<NodeData>[],
  edges: Edge[]
): StepPayload[] {
  const ordered = topologicalSort(nodes, edges);
  return ordered.map((node, idx) => flowNodeToStep(node, idx)).filter(Boolean) as StepPayload[];
}

function flowNodeToStep(node: Node<NodeData>, sortOrder: number): StepPayload | null {
  const d = node.data;
  const label = d.label || `${d.type}_${sortOrder}`;

  switch (d.type) {
    case 'api': {
      const cfg = d.config ?? {};
      return {
        description: label,
        keyword_type: 'request',
        keyword_name: 'http_request',
        parameters: {
          method: cfg.method || 'GET',
          url: cfg.url || '',
          headers: undefined,
          params: undefined,
          json: undefined,
          body: undefined,
          validate: d.validate,
          extract: d.extract,
        },
        sort_order: sortOrder,
      };
    }
    case 'sql': {
      const cfg = d.config ?? {};
      return {
        description: label,
        keyword_type: 'database',
        keyword_name: 'execute_sql',
        parameters: {
          sql: cfg.sql || '',
          datasource: cfg.datasource || '',
        },
        sort_order: sortOrder,
      };
    }
    case 'wait': {
      const cfg = d.config ?? {};
      const seconds = cfg.wait_time ?? 1;
      return {
        description: label,
        keyword_type: 'wait',
        keyword_name: 'wait_step',
        parameters: { seconds: Number(seconds) || 1 },
        sort_order: sortOrder,
      };
    }
    case 'script':
    case 'condition':
    case 'loop': {
      const cfg = d.config ?? {};
      return {
        description: label,
        keyword_type: 'custom',
        keyword_name: d.type === 'script' ? (cfg.keyword_name as string) || 'script' : d.type,
        parameters: { ...cfg },
        sort_order: sortOrder,
      };
    }
    default:
      return null;
  }
}
