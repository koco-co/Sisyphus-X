import { Inbox, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import React from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
    title?: string;
    description?: string;
    icon?: LucideIcon | React.ReactNode;
    action?: {
        label: string;
        onClick: () => void;
    } | React.ReactNode;
}

export function EmptyState({
    title = "暂无数据",
    description = "这里什么都没有...",
    icon,
    action
}: EmptyStateProps) {
    const renderIcon = () => {
        if (!icon) {
            return <Inbox className="w-10 h-10 text-slate-600" />;
        }

        // If it's a valid React element, render it directly
        if (React.isValidElement(icon)) {
            return icon;
        }

        // If it's a Lucide icon component
        const IconComponent = icon as LucideIcon;
        return <IconComponent className="w-10 h-10 text-slate-600" />;
    };

    const renderAction = () => {
        if (!action) return null;

        // If it's a valid React element, render it directly
        if (React.isValidElement(action)) {
            return action;
        }

        // Otherwise, it's an action object
        const actionObj = action as { label: string; onClick: () => void };
        return (
            <Button
                onClick={actionObj.onClick}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
                {actionObj.label}
            </Button>
        );
    };

    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6"
            >
                {renderIcon()}
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            <p className="text-slate-500 max-w-sm mb-6">{description}</p>
            {renderAction()}
        </div>
    );
}
