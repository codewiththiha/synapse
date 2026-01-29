"use client";

/**
 * Form Error Message Component
 * Displays form-level errors with tooltip styling
 */

import { cn } from "@/lib/utils";

interface FormErrorMessageProps {
	message?: string;
	className?: string;
	variant?: "tooltip" | "inline";
}

export function FormErrorMessage({
	message,
	className,
	variant = "tooltip",
}: FormErrorMessageProps) {
	if (!message) return null;

	if (variant === "inline") {
		return (
			<p className={cn("text-xs text-destructive", className)}>{message}</p>
		);
	}

	return (
		<div
			className={cn(
				"relative animate-in fade-in slide-in-from-top-1",
				className,
			)}
		>
			<div className="absolute -top-1 left-4 h-2 w-2 rotate-45 bg-destructive" />
			<div className="relative rounded-md bg-destructive px-3 py-2 text-xs text-destructive-foreground shadow-md">
				{message}
			</div>
		</div>
	);
}
