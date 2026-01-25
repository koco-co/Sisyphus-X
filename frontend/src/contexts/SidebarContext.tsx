import { createContext, useContext, useState, ReactNode } from 'react'

interface SidebarContextType {
    isCollapsed: boolean
    toggle: () => void
    setCollapsed: (value: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sisyphus-sidebar-collapsed')
        return saved === 'true'
    })

    const toggle = () => {
        setIsCollapsed(prev => {
            const next = !prev
            localStorage.setItem('sisyphus-sidebar-collapsed', String(next))
            return next
        })
    }

    const setCollapsed = (value: boolean) => {
        setIsCollapsed(value)
        localStorage.setItem('sisyphus-sidebar-collapsed', String(value))
    }

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggle, setCollapsed }}>
            {children}
        </SidebarContext.Provider>
    )
}

export function useSidebar() {
    const context = useContext(SidebarContext)
    if (!context) {
        throw new Error('useSidebar must be used within SidebarProvider')
    }
    return context
}
