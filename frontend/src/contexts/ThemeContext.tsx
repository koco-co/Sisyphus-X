import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import config from '@/config'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem(config.storageKeys.theme) as Theme
        return saved || 'system'
    })

    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')

    useEffect(() => {
        const root = document.documentElement

        const applyTheme = (t: 'light' | 'dark') => {
            setResolvedTheme(t)
            if (t === 'dark') {
                root.classList.add('dark')
                root.classList.remove('light')
            } else {
                root.classList.add('light')
                root.classList.remove('dark')
            }
        }

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            applyTheme(mediaQuery.matches ? 'dark' : 'light')

            const listener = (e: MediaQueryListEvent) => {
                applyTheme(e.matches ? 'dark' : 'light')
            }
            mediaQuery.addEventListener('change', listener)
            return () => mediaQuery.removeEventListener('change', listener)
        } else {
            applyTheme(theme)
        }
    }, [theme])

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
        localStorage.setItem(config.storageKeys.theme, newTheme)
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider')
    }
    return context
}
