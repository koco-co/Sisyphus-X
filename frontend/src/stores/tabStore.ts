// frontend/src/stores/tabStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Tab {
  key: string
  title: string
  path: string
  closable: boolean
  icon?: string
}

interface TabState {
  tabs: Tab[]
  activeKey: string
  addTab: (tab: Tab) => void
  removeTab: (key: string) => void
  setActiveKey: (key: string) => void
  closeOtherTabs: (key: string) => void
  closeAllTabs: () => void
}

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeKey: '',
      addTab: (tab) => {
        const { tabs } = get()
        const exists = tabs.some((t) => t.key === tab.key)
        if (!exists) {
          set({ tabs: [...tabs, tab] })
        }
        set({ activeKey: tab.key })
      },
      removeTab: (key) => {
        const { tabs, activeKey } = get()
        const newTabs = tabs.filter((t) => t.key !== key)
        set({ tabs: newTabs })

        if (activeKey === key && newTabs.length > 0) {
          const index = tabs.findIndex((t) => t.key === key)
          const newActiveKey = newTabs[Math.max(0, index - 1)]?.key || ''
          set({ activeKey: newActiveKey })
        }
      },
      setActiveKey: (key) => set({ activeKey: key }),
      closeOtherTabs: (key) => {
        const { tabs } = get()
        const tab = tabs.find((t) => t.key === key)
        const homeTab = tabs.find((t) => !t.closable)
        const newTabs = homeTab ? [homeTab] : []
        if (tab && tab.key !== homeTab?.key) {
          newTabs.push(tab)
        }
        set({ tabs: newTabs, activeKey: key })
      },
      closeAllTabs: () => {
        const { tabs } = get()
        const homeTab = tabs.find((t) => !t.closable)
        set({
          tabs: homeTab ? [homeTab] : [],
          activeKey: homeTab?.key || '',
        })
      },
    }),
    {
      name: 'tab-storage',
    }
  )
)
