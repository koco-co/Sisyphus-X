
import { createContext, useContext, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, AlertCircle, X, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
    id: string
    type: ToastType
    title?: string
    message: string
    duration?: number
}

interface ToastContextType {
    toast: (props: Omit<Toast, 'id'>) => void
    success: (message: string, title?: string) => void
    error: (message: string, title?: string) => void
    warning: (message: string, title?: string) => void
    info: (message: string, title?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, [])

    const toast = useCallback(({ type, title, message, duration = 3000 }: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9)
        const newToast = { id, type, title, message, duration }
        setToasts((prev) => [...prev, newToast])

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id)
            }, duration)
        }
    }, [removeToast])

    const success = (message: string, title?: string) => toast({ type: 'success', message, title })
    const error = (message: string, title?: string) => toast({ type: 'error', message, title })
    const warning = (message: string, title?: string) => toast({ type: 'warning', message, title })
    const info = (message: string, title?: string) => toast({ type: 'info', message, title })

    return (
        <ToastContext.Provider value={{ toast, success, error, warning, info }}>
            {children}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                <AnimatePresence mode="popLayout">
                    {toasts.map((t) => (
                        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
    const icons = {
        success: <Check className="w-5 h-5 text-emerald-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
        info: <Info className="w-5 h-5 text-cyan-500" />,
    }

    const borders = {
        success: 'border-emerald-500/20 bg-emerald-950/20',
        error: 'border-red-500/20 bg-red-950/20',
        warning: 'border-amber-500/20 bg-amber-950/20',
        info: 'border-cyan-500/20 bg-cyan-950/20',
    }

    const progressColors = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        warning: 'bg-amber-500',
        info: 'bg-cyan-500',
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={cn(
                "pointer-events-auto relative w-80 rounded-xl border p-4 shadow-xl backdrop-blur-xl overflow-hidden",
                "bg-slate-900", // Base background if not using colored bg
                borders[toast.type]
            )}
        >
            <div className="flex gap-3">
                <div className="mt-0.5">{icons[toast.type]}</div>
                <div className="flex-1">
                    {toast.title && <h4 className="font-semibold text-white text-sm mb-1">{toast.title}</h4>}
                    <p className="text-slate-300 text-sm leading-relaxed">{toast.message}</p>
                </div>
                <button
                    onClick={onClose}
                    className="text-slate-500 hover:text-white transition-colors self-start"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Progress Bar */}
            {toast.duration && toast.duration > 0 && (
                <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: 0 }}
                    transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                    className={cn("absolute bottom-0 left-0 h-1", progressColors[toast.type])}
                />
            )}
        </motion.div>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}
