/**
 * 将后端 ScenarioStep 转换为 Flow nodes/edges
 */
import type { Node, Edge } from 'reactflow';
import type { NodeData } from '../types';

export interface BackendStep {
  id: string;
  scenario_id: string;
  description?: string | null;
  keyword_type: string;
  keyword_name: string;
  parameters?: Record<string, unknown> | null;
  sort_order: number;
}

export function stepsToFlowNodes(
  steps: BackendStep[],
  basePosition?: { x: number; y: number }
): { nodes: Node<NodeData>[]; edges: Edge[] } {
  const start = basePosition ?? { x: 100, y: 100 };
  const stepWidth = 280;
  const stepHeight = 120;

  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];

  const sorted = [...steps].sort((a, b) => a.sort_order - b.sort_order);

  sorted.forEach((step, idx) => {
    const { type, data } = stepToNodeData(step);
    const position = {
      x: start.x + (idx % 2) * stepWidth,
      y: start.y + Math.floor(idx / 2) * stepHeight,
    };
    nodes.push({
      id: step.id,
      type,
      position,
      data,
    });
    if (idx > 0) {
      edges.push({
        id: `e-${sorted[idx - 1].id}-${step.id}`,
        source: sorted[idx - 1].id,
        target: step.id,
      });
    }
  });

  return { nodes, edges };
}

function stepToNodeData(step: BackendStep): { type: NodeData['type']; data: NodeData } {
  const params = step.parameters ?? {};
  const label = step.description || step.keyword_name || 'Step';

  switch (step.keyword_type) {
    case 'request':
      return {
        type: 'api',
        data: {
          label,
          type: 'api',
          config: {
            method: (params.method as string) || 'GET',
            url: (params.url as string) || '',
          },
          extract: params.extract as Record<string, string> | undefined,
          validate: params.validate as unknown[] | undefined,
        },
      };
    case 'database':
      return {
        type: 'sql',
        data: {
          label,
          type: 'sql',
          config: {
            sql: (params.sql as string) || '',
            datasource: (params.datasource as string) || '',
          },
        },
      };
    case 'wait':
      return {
        type: 'wait',
        data: {
          label,
          type: 'wait',
          config: {
            wait_time: (params.seconds as number) ?? 1,
          },
        },
      };
    case 'custom':
    default:
      return {
        type: 'script',
        data: {
          label,
          type: 'script',
          config: {
            keyword_name: step.keyword_name,
            ...params,
          },
        },
      };
  }
}
