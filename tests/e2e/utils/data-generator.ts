// tests/e2e/utils/data-generator.ts

export interface ProjectData {
  name: string;
  description: string;
}

export interface DatabaseConfigData {
  connection_name: string;
  reference_variable: string;
  db_type: 'postgresql' | 'mysql';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface KeywordData {
  keyword_type: string;
  name: string;
  method_name: string;
  code_block: string;
  parameters: { name: string; description: string }[];
}

export interface InterfaceData {
  name: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  params?: Record<string, any>;
  body?: Record<string, any>;
}

export interface ScenarioData {
  name: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  tags: string[];
  variables: Record<string, string>;
}

export interface PlanData {
  name: string;
  description: string;
}

export class DataGenerator {
  private static counter = 0;

  static uniqueId(): string {
    return `${Date.now()}_${++this.counter}`;
  }

  static generateProjects(count: number): ProjectData[] {
    return Array.from({ length: count }, (_, i) => ({
      name: `E2E项目_${this.uniqueId()}_${i}`,
      description: `自动化测试项目 #${i} - 用于验收测试`,
    }));
  }

  static generateDatabaseConfigs(count: number): DatabaseConfigData[] {
    return Array.from({ length: count }, (_, i) => ({
      connection_name: `测试数据源_${i}`,
      reference_variable: `db_test_${i}`,
      db_type: i % 2 === 0 ? 'postgresql' : 'mysql',
      host: 'localhost',
      port: i % 2 === 0 ? 5432 : 3306,
      database: `test_db_${i}`,
      username: 'test_user',
      password: 'test_password',
    }));
  }

  static generateKeywords(count: number): KeywordData[] {
    const types = ['request', 'assertion', 'extract', 'db', 'custom'];
    return Array.from({ length: count }, (_, i) => ({
      keyword_type: types[i % types.length],
      name: `自定义关键字_${i}`,
      method_name: `custom_method_${i}`,
      code_block: `def custom_method_${i}(param):\n    """自定义关键字 ${i}"""\n    return f"result_{param}"`,
      parameters: [{ name: 'param', description: '输入参数' }],
    }));
  }

  static generateInterfaces(count: number): InterfaceData[] {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    return Array.from({ length: count }, (_, i) => ({
      name: `测试接口_${i}`,
      method: methods[i % methods.length],
      path: `/api/v1/test/resource_${i}`,
      headers: { 'Content-Type': 'application/json' },
      params: i % 2 === 0 ? { page: 1, size: 10 } : undefined,
      body: i % 2 === 1 ? { data: `test_data_${i}` } : undefined,
    }));
  }

  static generateScenarios(count: number): ScenarioData[] {
    const priorities: ('P0' | 'P1' | 'P2' | 'P3')[] = ['P0', 'P1', 'P2', 'P3'];
    return Array.from({ length: count }, (_, i) => ({
      name: `测试场景_${this.uniqueId()}_${i}`,
      description: `E2E测试场景 #${i}`,
      priority: priorities[i % priorities.length],
      tags: [`tag_${i % 5}`, 'e2e'],
      variables: { [`var_${i}`]: `value_${i}` },
    }));
  }

  static generatePlans(count: number): PlanData[] {
    return Array.from({ length: count }, (_, i) => ({
      name: `测试计划_${this.uniqueId()}_${i}`,
      description: `E2E测试计划 #${i}`,
    }));
  }
}
