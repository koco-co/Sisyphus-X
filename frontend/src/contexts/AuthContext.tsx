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
    loginWithGithub: () => void
    loginWithGoogle: () => void
    handleOAuthCallback: (token: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // 开发模式跳过登录
        const devModeSkipLogin = import.meta.env.VITE_DEV_MODE_SKIP_LOGIN === 'true' || import.meta.env.VITE_AUTH_DISABLED === 'true'
        if (devModeSkipLogin) {
            setUser({
                id: 0,
                username: 'Dev User',
                email: 'dev@sisyphus.local',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DevUser'
            })
            setIsLoading(false)
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
            window.location.href = res.data.url
        } catch (error) {
            console.error('GitHub login failed:', error)
        }
    }

    const loginWithGoogle = async () => {
        try {
            const res = await api.get('/auth/google')
            window.location.href = res.data.url
        } catch (error) {
            console.error('Google login failed:', error)
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

