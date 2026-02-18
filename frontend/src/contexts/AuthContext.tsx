import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import api from '@/api/client'
import config from '@/config'

interface User {
    id: number
    username: string
    email: string
    avatar?: string
}

interface AuthContextType {
    user: User | null
    isLoading: boolean
    isAuthenticated: boolean
    login: (email: string, password: string) => Promise<void>
    register: (username: string, email: string, password: string) => Promise<void>
    logout: () => void
    loginWithGithub: () => Promise<{ success: boolean; error?: string }>
    loginWithGoogle: () => Promise<{ success: boolean; error?: string }>
    handleOAuthCallback: (token: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    // 开发模式：检查是否跳过登录
    const devModeSkipLogin = import.meta.env.VITE_DEV_MODE_SKIP_LOGIN === 'true' || import.meta.env.VITE_AUTH_DISABLED === 'true'

    // 初始化用户状态（开发模式下直接设置默认用户，避免闪烁）
    const [user, setUser] = useState<User | null>(() => {
        if (devModeSkipLogin) {
            return {
                id: 0,
                username: 'Dev User',
                email: 'dev@sisyphus.local',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DevUser'
            }
        }
        return null
    })

    const [isLoading, setIsLoading] = useState(() => {
        // 开发模式下不显示加载状态
        return !devModeSkipLogin
    })

    useEffect(() => {
        // 开发模式跳过后续登录逻辑
        if (devModeSkipLogin) {
            return
        }

        // 检查 URL 中的 OAuth token 参数
        const urlParams = new URLSearchParams(window.location.search)
        const token = urlParams.get('token')

        if (token) {
            // OAuth 回调带的 token
            localStorage.setItem(config.storageKeys.token, token)
            // 清除 URL 中的 token 参数
            window.history.replaceState({}, document.title, window.location.pathname)
        }

        // 检查本地存储的 token
        const storedToken = localStorage.getItem(config.storageKeys.token)
        if (storedToken) {
            // 验证 token 并获取用户信息
            api.get('/auth/me')
                .then(res => setUser(res.data))
                .catch(() => localStorage.removeItem(config.storageKeys.token))
                .finally(() => setIsLoading(false))
        } else {
            setIsLoading(false)
        }
    }, [])

    const login = async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password })
        const { token, user: userData } = res.data
        localStorage.setItem('sisyphus-token', token)
        setUser(userData)
    }

    const register = async (username: string, email: string, password: string) => {
        const res = await api.post('/auth/register', { username, email, password })
        const { token, user: userData } = res.data
        localStorage.setItem('sisyphus-token', token)
        setUser(userData)
    }

    const logout = () => {
        localStorage.removeItem(config.storageKeys.token)
        setUser(null)
    }

    // OAuth 登录方法
    const loginWithGithub = async () => {
        try {
            const res = await api.get('/auth/github')
            if (res.data && res.data.url) {
                window.location.href = res.data.url
                return { success: true }
            } else {
                return { success: false, error: 'Invalid OAuth response' }
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'GitHub 登录功能未配置'
            console.error('GitHub login failed:', error)
            return { success: false, error: errorMessage }
        }
    }

    const loginWithGoogle = async () => {
        try {
            const res = await api.get('/auth/google')
            if (res.data && res.data.url) {
                window.location.href = res.data.url
                return { success: true }
            } else {
                return { success: false, error: 'Invalid OAuth response' }
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 'Google 登录功能未配置'
            console.error('Google login failed:', error)
            return { success: false, error: errorMessage }
        }
    }

    const handleOAuthCallback = async (token: string) => {
        localStorage.setItem('sisyphus-token', token)
        const res = await api.get('/auth/me')
        setUser(res.data)
    }

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            register,
            logout,
            loginWithGithub,
            loginWithGoogle,
            handleOAuthCallback
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}

