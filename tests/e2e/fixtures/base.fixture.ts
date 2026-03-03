// tests/e2e/fixtures/base.fixture.ts
import { test as base, Page, APIRequestContext } from '@playwright/test';
import { ApiClient } from '../utils/api-client.js';
import { DataGenerator } from '../utils/data-generator.js';
import { EngineHelper } from '../utils/engine-helper.js';

type E2EFixtures = {
  apiClient: ApiClient;
  dataGenerator: typeof DataGenerator;
  engineHelper: EngineHelper;
  testProjectId: string;
};

export const test = base.extend<E2EFixtures>({
  apiClient: async ({ request }, use) => {
    await use(new ApiClient(request));
  },

  dataGenerator: async ({}, use) => {
    await use(DataGenerator);
  },

  engineHelper: async ({}, use) => {
    const helper = new EngineHelper();
    await use(helper);
    helper.cleanup();
  },

  testProjectId: async ({ apiClient }, use) => {
    // Create a test project for each test
    const project = await apiClient.createProject({
      name: `TestProject_${Date.now()}`,
      description: 'E2E Test Project'
    });
    const projectData = await project.json();
    await use(projectData.id);
    // Cleanup
    await apiClient.deleteProject(projectData.id);
  },
});

export { expect } from '@playwright/test';
