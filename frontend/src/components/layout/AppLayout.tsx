import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'

export default function AppLayout() {
    const { isCollapsed } = useSidebar()

    return (
        <div className="min-h-screen bg-slate-900 dark:bg-slate-900 light:bg-slate-100">
            <Sidebar />
            <main className={cn(
                "transition-all duration-300",
                isCollapsed ? "ml-20" : "ml-64"
            )}>
                <Outlet />
            </main>
        </div>
    )
}
