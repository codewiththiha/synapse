"use client";

/**
 * StatusMessage - Reusable animated status display
 *
 * A flexible component for showing success, error, info, or warning states
 * with animated icons and customizable messages.
 */

import { motion } from "framer-motion";
import {
	Sparkles,
	AlertCircle,
	Info,
	AlertTriangle,
	LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusVariant = "success" | "error" | "info" | "warning";

interface StatusMessageProps {
	message: string;
	variant?: StatusVariant;
	icon?: LucideIcon;
	className?: string;
}

const variantConfig: Record<
	StatusVariant,
	{
		icon: LucideIcon;
		bgColor: string;
		iconColor: string;
	}
> = {
	success: {
		icon: Sparkles,
		bgColor: "bg-green-500/20",
		iconColor: "text-green-500",
	},
	error: {
		icon: AlertCircle,
		bgColor: "bg-red-500/20",
		iconColor: "text-red-500",
	},
	info: {
		icon: Info,
		bgColor: "bg-blue-500/20",
		iconColor: "text-blue-500",
	},
	warning: {
		icon: AlertTriangle,
		bgColor: "bg-yellow-500/20",
		iconColor: "text-yellow-500",
	},
};

export function StatusMessage({
	message,
	variant = "success",
	icon: CustomIcon,
	className,
}: StatusMessageProps) {
	const config = variantConfig[variant];
	const IconComponent = CustomIcon || config.icon;

	return (
		<div className={cn("flex flex-col items-center gap-4 py-8", className)}>
			<motion.div
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				className={cn("p-4 rounded-full", config.bgColor)}
			>
				<IconComponent size={32} className={config.iconColor} />
			</motion.div>
			<p className="text-sm font-medium text-center">{message}</p>
		</div>
	);
}

// Convenience components for common use cases
export function SuccessMessage({ message }: { message: string }) {
	return <StatusMessage message={message} variant="success" />;
}

export function ErrorMessage({ message }: { message: string }) {
	return <StatusMessage message={message} variant="error" />;
}

export function InfoMessage({ message }: { message: string }) {
	return <StatusMessage message={message} variant="info" />;
}

export function WarningMessage({ message }: { message: string }) {
	return <StatusMessage message={message} variant="warning" />;
}
