import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogPortal = DialogPrimitive.Portal

const DialogOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
        )}
        {...props}
    />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-white/10 bg-slate-900 p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl",
                className
            )}
            {...props}
        >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

interface ConfirmDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description?: string
    confirmText?: string
    cancelText?: string
    isDestructive?: boolean
    verificationText?: string
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "确认",
    cancelText = "取消",
    isDestructive = false,
    verificationText
}: ConfirmDialogProps) {
    const [inputValue, setInputValue] = React.useState("")

    React.useEffect(() => {
        if (isOpen) {
            setInputValue("")
        }
    }, [isOpen])

    const isConfirmDisabled = verificationText ? inputValue !== verificationText : false

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6">
                <div className="flex flex-col space-y-3 text-center sm:text-left">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    {description && (
                        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
                    )}
                </div>

                {verificationText && (
                    <div className="mt-4">
                        <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">
                            请输入 <span className="text-red-400 select-all font-mono bg-white/5 px-1 py-0.5 rounded">{verificationText}</span> 以确认
                        </label>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50 transition-colors placeholder:text-slate-600 font-mono"
                            placeholder={verificationText}
                        />
                    </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 gap-3 mt-6">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white h-10 px-5"
                        onClick={onClose}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        disabled={isConfirmDisabled}
                        className={cn(
                            "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all shadow-lg h-10 px-5",
                            isDestructive
                                ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-500"
                                : "bg-cyan-500 text-white hover:bg-cyan-600 shadow-cyan-500/20"
                        )}
                        onClick={() => {
                            onConfirm()
                            onClose()
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
