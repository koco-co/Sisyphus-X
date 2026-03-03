// frontend/src/stores/projectStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Project {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

interface ProjectState {
  currentProject: Project | null
  currentProjectId: string | null
  setProject: (project: Project) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      currentProject: null,
      currentProjectId: null,
      setProject: (project) =>
        set({
          currentProject: project,
          currentProjectId: project.id,
        }),
      clearProject: () =>
        set({
          currentProject: null,
          currentProjectId: null,
        }),
    }),
    {
      name: 'project-storage',
    }
  )
)
