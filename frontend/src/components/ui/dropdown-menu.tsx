import * as React from 'react'
import { cn } from '@/lib/utils'

export interface DropdownMenuProps {
  children: React.ReactNode
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  return <div className="relative inline-block text-left">{children}</div>
}

export interface DropdownMenuTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  onClick?: (e: React.MouseEvent) => void
}

export function DropdownMenuTrigger({ children, asChild = false, onClick }: DropdownMenuTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: onClick || (children.props as any).onClick,
    })
  }
  return <div onClick={onClick}>{children}</div>
}

export interface DropdownMenuContentProps {
  children: React.ReactNode
}

export function DropdownMenuContent({ children }: DropdownMenuContentProps) {
  return (
    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-popover border border-border z-50">
      <div className="py-1">{children}</div>
    </div>
  )
}

export interface DropdownMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}

export function DropdownMenuItem({ children, onClick, className, disabled = false }: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  )
}

export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-2 text-sm font-medium text-muted-foreground">{children}</div>
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-border" />
}
