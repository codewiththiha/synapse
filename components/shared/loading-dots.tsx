"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoadingDotsProps {
	/** Size of each dot in pixels */
	size?: number;
	/** Color class for the dots (e.g., "bg-primary", "bg-muted-foreground") */
	colorClass?: string;
	/** Gap between dots */
	gap?: number;
	/** Additional className */
	className?: string;
}

/**
 * Reusable 3-dot loading animation
 * Used across the app for consistent loading states
 */
export function LoadingDots({
	size = 8,
	colorClass = "bg-primary",
	gap = 1.5,
	className,
}: LoadingDotsProps) {
	return (
		<div
			className={cn("flex items-center", className)}
			style={{ gap: `${gap * 4}px` }}
		>
			{[0, 1, 2].map((i) => (
				<motion.span
					key={i}
					className={cn("rounded-full", colorClass)}
					style={{ width: size, height: size }}
					animate={{
						y: [0, -6, 0],
						opacity: [0.4, 1, 0.4],
					}}
					transition={{
						duration: 0.6,
						repeat: Infinity,
						delay: i * 0.15,
						ease: "easeInOut",
					}}
				/>
			))}
		</div>
	);
}
