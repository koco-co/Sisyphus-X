// frontend/src/stores/environmentStore.ts
import { create } from 'zustand'

export interface Environment {
  id: string
  project_id: string
  name: string
  base_url?: string
  is_default: boolean
}

interface EnvironmentState {
  currentEnvironment: Environment | null
  environments: Environment[]
  setEnvironments: (envs: Environment[]) => void
  setCurrentEnvironment: (env: Environment) => void
  clearEnvironments: () => void
}

export const useEnvironmentStore = create<EnvironmentState>((set) => ({
  currentEnvironment: null,
  environments: [],
  setEnvironments: (envs) => {
    set({ environments: envs })
    set((state) => ({
      currentEnvironment:
        state.currentEnvironment ||
        envs.find((e) => e.is_default) ||
        envs[0] ||
        null,
    }))
  },
  setCurrentEnvironment: (env) => set({ currentEnvironment: env }),
  clearEnvironments: () =>
    set({ currentEnvironment: null, environments: [] }),
}))
