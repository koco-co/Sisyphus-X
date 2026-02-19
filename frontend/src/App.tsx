import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { ToastProvider } from '@/components/ui/Toast'
import { Toaster } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import InterfaceManagementPage from '@/pages/interface-management'
import ScenarioListPage from '@/pages/scenario'
import ScenarioEditor from '@/pages/scenario/editor'
import TestCasesPage from '@/pages/cases'
import LoginPage from '@/pages/auth/LoginPage'
import TestReport from '@/pages/reports/TestReport'
import TestPlan from '@/pages/plans/TestPlan'
// 功能测试模块导入
import RequirementList from '@/pages/functional-test/RequirementList'
import AIConfigManagement from '@/pages/functional-test/AIConfigManagement'
import RequirementClarification from '@/pages/functional-test/RequirementClarification'
import TestPointManagement from '@/pages/functional-test/TestPointManagement'
import TestCaseManagement from '@/pages/functional-test/TestCaseManagement'
import GenerateTestCases from '@/pages/functional-test/GenerateTestCases'
import GlobalParamsPage from '@/pages/global-params'
import EnvironmentManagement from '@/pages/environments/index'
import EnvironmentList from '@/pages/environments/EnvironmentList'
import KeywordManagement from '@/pages/keywords/KeywordManagement'
import ProjectManagement from '@/pages/api-automation/ProjectManagement'
import ProjectSettings from '@/pages/api-automation/ProjectSettings'
import DatabaseConfigList from '@/pages/api-automation/DatabaseConfigList'
import ProjectList from '@/pages/projects/ProjectList'
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
        {/* 仪表盘 */}
        <Route path="/" element={<Dashboard />} />

        {/* 项目列表 */}
        <Route path="/projects" element={<ProjectList />} />

        {/* 接口管理模块 */}
        {/* ⚠️ 重要: 更具体的路由必须在前面,否则会被部分匹配 */}
        <Route path="/interface-management/new" element={<InterfaceManagementPage key="interface-new" />} />
        <Route path="/interface-management/:id" element={<InterfaceManagementPage />} />
        <Route path="/interface-management" element={<InterfaceManagementPage key="interface-list" />} />

        {/* 场景编排 */}
        <Route path="/scenarios" element={<ScenarioListPage />} />
        <Route path="/scenarios/editor/:id" element={<ScenarioEditor />} />
        <Route path="/scenarios/editor/new" element={<ScenarioEditor />} />

        {/* 测试报告 */}
        <Route path="/reports" element={<TestReport />} />

        {/* 定时任务 (原测试计划) */}
        <Route path="/plans" element={<TestPlan />} />

        {/* 旧模块保留 */}
        <Route path="/cases" element={<TestCasesPage />} />
        <Route path="/data" element={<div className="p-8 text-white">数据中心 - 开发中</div>} />

        {/* 功能测试模块 */}
        <Route path="/functional-test/requirements" element={<RequirementList />} />
        <Route path="/functional-test/ai-config" element={<AIConfigManagement />} />
        <Route path="/functional-test/clarification/:requirementId" element={<RequirementClarification />} />
        <Route path="/functional-test/test-points/:requirementId" element={<TestPointManagement />} />
        <Route path="/functional-test/test-cases/:requirementId" element={<TestCaseManagement />} />
        <Route path="/functional-test/test-cases/generate" element={<GenerateTestCases />} />

        {/* 全局参数管理 */}
        <Route path="/global-params" element={<GlobalParamsPage />} />

        {/* 环境管理 */}
        <Route path="/environments" element={<EnvironmentManagement />} />
        <Route path="/projects/:projectId/environments" element={<EnvironmentList />} />

        {/* 关键字配置 */}
        <Route path="/keywords" element={<KeywordManagement />} />

        {/* API 自动化模块 */}
        <Route path="/api/projects" element={<ProjectManagement />} />
        <Route path="/api/projects/:projectId/settings" element={<ProjectSettings />} />
        <Route path="/api/projects/:projectId/database-configs" element={<DatabaseConfigList />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
            <Toaster position="top-right" theme="dark" richColors />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
