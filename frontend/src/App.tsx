import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { Toaster } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import InterfaceManagementPage from '@/pages/interface-management'
import ScenarioListPage from '@/pages/scenario'
import ScenarioEditor from '@/pages/scenario/editor'
import LoginPage from '@/pages/auth/LoginPage'
import TestReport from '@/pages/reports/TestReport'
import ReportDetailPage from '@/pages/reports/ReportDetailPage'
import TestPlan from '@/pages/plans/TestPlan'
import PlanExecutionPage from '@/pages/plans/PlanExecutionPage'
import GlobalParamsPage from '@/pages/global-params'
import EnvironmentManagement from '@/pages/environments/index'
import EnvironmentList from '@/pages/environments/EnvironmentList'
import KeywordManagement from '@/pages/keywords/KeywordManagement'
import ProjectManagement from '@/pages/api-automation/ProjectManagement'
import ProjectSettings from '@/pages/api-automation/ProjectSettings'
import DatabaseConfigList from '@/pages/api-automation/DatabaseConfigList'
import '@/i18n'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

// 路由保护组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()



  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={
        <ProtectedRoute>
          <SidebarProvider>
            <AppLayout />
          </SidebarProvider>
        </ProtectedRoute>
      }>
        <Route path="/" element={<Dashboard />} />

        {/* 接口自动化 */}
        <Route path="/api/projects" element={<ProjectManagement />} />
        <Route path="/api/projects/:projectId/settings" element={<ProjectSettings />} />
        <Route path="/api/projects/:projectId/database-configs" element={<DatabaseConfigList />} />
        <Route path="/keywords" element={<KeywordManagement />} />
        <Route path="/interface-management/new" element={<InterfaceManagementPage key="interface-new" />} />
        <Route path="/interface-management/:id" element={<InterfaceManagementPage />} />
        <Route path="/interface-management" element={<InterfaceManagementPage key="interface-list" />} />
        <Route path="/scenarios" element={<ScenarioListPage />} />
        <Route path="/scenarios/editor/:id" element={<ScenarioEditor />} />
        <Route path="/scenarios/editor/new" element={<ScenarioEditor />} />
        <Route path="/plans/:planId/executions/:executionId" element={<PlanExecutionPage />} />
        <Route path="/plans" element={<TestPlan />} />
        <Route path="/reports/:reportId" element={<ReportDetailPage />} />
        <Route path="/reports" element={<TestReport />} />

        {/* 系统设置 */}
        <Route path="/environments" element={<EnvironmentManagement />} />
        <Route path="/projects/:projectId/environments" element={<EnvironmentList />} />
        <Route path="/global-params" element={<GlobalParamsPage />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster position="top-right" theme="dark" richColors />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
