// tests/e2e/utils/api-client.ts
import { APIRequestContext, APIResponse } from '@playwright/test';

export class ApiClient {
  private baseUrl: string;

  constructor(private request: APIRequestContext) {
    this.baseUrl = 'http://localhost:8000/api/v1';
  }

  // ========== Projects ==========
  async createProject(data: { name: string; description: string }): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/projects/`, { data });
  }

  async getProjects(params?: { skip?: number; limit?: number }): Promise<APIResponse> {
    return this.request.get(`${this.baseUrl}/projects/`, { params });
  }

  async deleteProject(id: string): Promise<APIResponse> {
    return this.request.delete(`${this.baseUrl}/projects/${id}`);
  }

  // ========== Database Configs ==========
  async createDatabaseConfig(projectId: string, data: any): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/projects/${projectId}/databases/`, { data });
  }

  async testDatabaseConnection(projectId: string, dbId: string): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/projects/${projectId}/databases/${dbId}/test`);
  }

  // ========== Keywords ==========
  async createKeyword(data: any): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/keywords/`, { data });
  }

  async getKeywords(params?: { skip?: number; limit?: number }): Promise<APIResponse> {
    return this.request.get(`${this.baseUrl}/keywords/`, { params });
  }

  // ========== Interfaces ==========
  async createInterface(projectId: string, data: any): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/interfaces/`, { data: { ...data, project_id: projectId } });
  }

  async createFolder(projectId: string, data: { name: string; parent_id?: string }): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/projects/${projectId}/interface-folders/`, { data });
  }

  // ========== Environments ==========
  async createEnvironment(projectId: string, data: any): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/projects/${projectId}/environments/`, { data });
  }

  // ========== Scenarios ==========
  async createScenario(data: any): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/scenarios/`, { data });
  }

  async createScenarioStep(scenarioId: string, data: any): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/scenarios/${scenarioId}/steps/`, { data });
  }

  async debugScenario(scenarioId: string, envId?: string): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/scenarios/${scenarioId}/debug`, {
      data: { environment_id: envId }
    });
  }

  // ========== Plans ==========
  async createPlan(data: any): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/plans/`, { data });
  }

  async addScenarioToPlan(planId: string, scenarioId: string, order: number): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/plans/${planId}/scenarios/`, {
      data: { scenario_id: scenarioId, order }
    });
  }

  async executePlan(planId: string): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/plans/${planId}/execute`);
  }

  // ========== Reports ==========
  async getReports(params?: { skip?: number; limit?: number }): Promise<APIResponse> {
    return this.request.get(`${this.baseUrl}/reports/`, { params });
  }
}
