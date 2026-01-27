import React from 'react'

interface StatusBadgeProps {
    active: boolean
    activeLabel?: string
    inactiveLabel?: string
    onClick?: () => void
    className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    active,
    activeLabel = '启用',
    inactiveLabel = '禁用',
    onClick,
    className = ''
}) => {
    const Component = onClick ? 'button' : 'span'

    return (
        <Component
            onClick={onClick}
            className={`flex items-center gap-2 group/status ${onClick ? 'cursor-pointer' : ''} ${className}`}
        >
            {active ? (
                <>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] group-hover/status:scale-125 transition-transform" />
                    <span className="text-emerald-400 text-sm">{activeLabel}</span>
                </>
            ) : (
                <>
                    <div className="w-2 h-2 rounded-full bg-slate-500 group-hover/status:scale-125 transition-transform" />
                    <span className="text-slate-500 text-sm">{inactiveLabel}</span>
                </>
            )}
        </Component>
    )
}
