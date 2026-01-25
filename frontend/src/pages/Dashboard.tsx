import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { projectsApi, dashboardApi } from '@/api/client'
import type { Project } from '@/types'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'
import { Activity, Clock, Plus, ArrowUpRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface DashboardStats {
    active_tasks: number
    test_coverage: number
    total_projects: number
    avg_duration: string
}

interface TrendDataPoint {
    name: string
    pass_count: number
    fail_count: number
}

interface ActivityItem {
    id: number
    name: string
    status: string
    time: string
    trigger: string
}

export default function Dashboard() {
    const { t } = useTranslation()

    // 获取项目列表
    const { data: projects, isLoading: projectsLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const res = await projectsApi.list()
            return (res.data?.items ?? res.data ?? []) as Project[]
        }
    })

    // 获取统计数据
    const { data: stats } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const res = await dashboardApi.getStats()
            return res.data as DashboardStats
        }
    })

    // 获取趋势数据
    const { data: trendData } = useQuery({
        queryKey: ['dashboard-trend'],
        queryFn: async () => {
            const res = await dashboardApi.getTrend()
            // Transform for recharts
            const data = (res.data?.data ?? []) as TrendDataPoint[]
            return data.map(d => ({
                name: d.name,
                pass: d.pass_count,
                fail: d.fail_count
            }))
        }
    })

    // 获取最近活动
    const { data: activitiesData } = useQuery({
        queryKey: ['dashboard-activities'],
        queryFn: async () => {
            const res = await dashboardApi.getActivities()
            return (res.data?.activities ?? []) as ActivityItem[]
        }
    })

    const chartData = trendData ?? []
    const recentActivities = activitiesData ?? []

    return (
        <div className="p-8 space-y-8">
            {/* 页面标题 */}
            <motion.div
                className="flex items-center justify-between"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{t('dashboard.title')}</h1>
                    <p className="text-slate-400 mt-1">{t('dashboard.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <motion.button
                        className="h-10 px-4 rounded-xl glass hover:bg-white/10 text-white transition-colors flex items-center gap-2 text-sm font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Clock className="w-4 h-4" />
                        <span>{t('dashboard.history')}</span>
                    </motion.button>
                    <motion.button
                        className="h-10 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all flex items-center gap-2 text-sm font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t('dashboard.newProject')}</span>
                    </motion.button>
                </div>
            </motion.div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    {
                        label: t('dashboard.stats.activeTasks'),
                        value: stats?.active_tasks?.toString() ?? '0',
                        trend: '+2.5%',
                        color: 'text-cyan-400',
                        bg: 'from-cyan-500/10 to-cyan-500/5'
                    },
                    {
                        label: t('dashboard.stats.testCoverage'),
                        value: stats ? `${stats.test_coverage}%` : '0%',
                        trend: '+4.1%',
                        color: 'text-emerald-400',
                        bg: 'from-emerald-500/10 to-emerald-500/5'
                    },
                    {
                        label: t('dashboard.stats.totalProjects'),
                        value: projectsLoading ? '...' : String(stats?.total_projects ?? projects?.length ?? 0),
                        trend: '0%',
                        color: 'text-violet-400',
                        bg: 'from-violet-500/10 to-violet-500/5'
                    },
                    {
                        label: t('dashboard.stats.avgDuration'),
                        value: stats?.avg_duration ?? '0s',
                        trend: '-12%',
                        color: 'text-amber-400',
                        bg: 'from-amber-500/10 to-amber-500/5'
                    },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        className={`p-6 rounded-2xl border border-white/5 bg-gradient-to-br ${stat.bg} backdrop-blur-sm relative overflow-hidden group`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-slate-400 text-sm font-medium">{stat.label}</div>
                            <div className="px-2 py-1 rounded-full bg-white/5 text-xs text-green-400 flex items-center gap-1">
                                {stat.trend} <ArrowUpRight className="w-3 h-3" />
                            </div>
                        </div>
                        <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 图表区域 */}
                <motion.div
                    className="lg:col-span-2 p-6 rounded-2xl glass min-h-[400px]"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-cyan-400" />
                        {t('dashboard.testExecutionTrend')}
                    </h3>
                    <div className="h-[320px] w-full">
                        {chartData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-slate-500">
                                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                加载趋势数据...
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorFail" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="pass"
                                        stroke="#22d3ee"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorPass)"
                                        name="通过"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="fail"
                                        stroke="#f43f5e"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorFail)"
                                        name="失败"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </motion.div>

                {/* 最近活动 */}
                <motion.div
                    className="p-6 rounded-2xl glass"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    <h3 className="text-lg font-semibold text-white mb-6">{t('dashboard.recentActivity')}</h3>
                    <div className="space-y-5">
                        {recentActivities.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                暂无活动记录
                            </div>
                        ) : (
                            recentActivities.map((activity) => (
                                <motion.div
                                    key={activity.id}
                                    className="flex gap-4 items-start group"
                                    whileHover={{ x: 4 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 transition-colors ${activity.status === 'passed'
                                        ? 'bg-emerald-500/10 border-emerald-500/30 group-hover:border-emerald-500/50'
                                        : 'bg-red-500/10 border-red-500/30 group-hover:border-red-500/50'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full ${activity.status === 'passed'
                                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                            : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                            }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-white font-medium truncate">{activity.name}</div>
                                        <div className="text-xs text-slate-500 mt-1">{activity.time} · {activity.trigger}</div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                    <motion.button
                        className="w-full mt-6 py-3 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                    >
                        {t('dashboard.viewAllActivity')}
                    </motion.button>
                </motion.div>
            </div>

            {/* 项目列表 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
            >
                <h3 className="text-lg font-semibold text-white mb-6">{t('dashboard.yourProjects')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects?.map((project) => (
                        <motion.div
                            key={project.id}
                            className="p-5 rounded-xl glass hover:bg-white/10 transition-all cursor-pointer group border border-white/5 hover:border-cyan-500/30"
                            whileHover={{ scale: 1.02, y: -2 }}
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/10 to-violet-500/10 flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform">
                                    <span className="font-bold text-white text-lg">{project.key.slice(0, 2)}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-white font-medium group-hover:text-cyan-400 transition-colors truncate">
                                        {project.name}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">{project.key}</div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-white/5">
                                <span>{project.owner}</span>
                                <span>{project.created_at?.split('T')[0]}</span>
                            </div>
                        </motion.div>
                    ))}

                    <motion.button
                        className="p-5 rounded-xl border border-dashed border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-cyan-400 h-full min-h-[140px]"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Plus className="w-8 h-8" />
                        <span className="font-medium">{t('dashboard.createNewProject')}</span>
                    </motion.button>
                </div>
            </motion.div>
        </div>
    )
}
