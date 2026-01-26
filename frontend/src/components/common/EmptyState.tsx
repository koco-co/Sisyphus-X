import { Inbox } from "lucide-react";
import { motion } from "framer-motion";
import React from "react";

interface EmptyStateProps {
    title?: string;
    description?: string;
    icon?: React.ElementType;
    action?: React.ReactNode;
}

export function EmptyState({
    title = "暂无数据",
    description = "这里什么都没有...",
    icon: Icon = Inbox,
    action
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6"
            >
                <Icon className="w-10 h-10 text-slate-600" />
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            <p className="text-slate-500 max-w-sm mb-6">{description}</p>
            {action}
        </div>
    );
}
