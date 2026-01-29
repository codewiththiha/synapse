"use client";

import { cn } from "@/lib/utils";

interface StreamingCursorProps {
	className?: string;
}

/**
 * Animated cursor for streaming text responses
 * Used in chat messages and assistant input
 */
export function StreamingCursor({ className }: StreamingCursorProps) {
	return (
		<span
			className={cn(
				"inline-block w-1.5 h-4 bg-foreground/70 ml-0.5 align-middle rounded-sm",
				className,
			)}
			style={{ animation: "cursor-blink 1s ease-in-out infinite" }}
		/>
	);
}
