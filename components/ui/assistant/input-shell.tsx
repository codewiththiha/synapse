"use client";

/**
 * AssistantInputShell
 * Animated container for the expanded assistant input
 *
 * Features:
 * - Spring animation for position and width
 * - Viewport-safe positioning
 * - Slot-based content for flexibility
 */

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingPosition } from "@/hooks/use-floating-assistant";

export interface AssistantInputShellProps {
	/** Whether the shell is visible/expanded */
	isExpanded: boolean;
	/** Button position (for animation origin) */
	buttonPos: FloatingPosition;
	/** Calculated input position */
	inputPos: FloatingPosition;
	/** Current input width */
	inputWidth: number;
	/** Minimum width for initial animation */
	minWidth?: number;
	/** Button size for animation calculations */
	buttonSize?: number;
	/** Padding from viewport edges */
	padding?: number;
	/** Content to render inside the shell */
	children: ReactNode;
}

export function AssistantInputShell({
	isExpanded,
	buttonPos,
	inputPos,
	inputWidth,
	minWidth = 280,
	buttonSize = 48,
	padding = 16,
	children,
}: AssistantInputShellProps) {
	return (
		<AnimatePresence>
			{isExpanded && (
				<motion.div
					initial={{
						opacity: 0,
						scale: 0.9,
						left: buttonPos.x - minWidth / 2 + buttonSize / 2,
						bottom: buttonPos.y,
						width: minWidth,
					}}
					animate={{
						opacity: 1,
						scale: 1,
						left: inputPos.x,
						bottom: inputPos.y,
						width: inputWidth,
					}}
					exit={{
						opacity: 0,
						scale: 0.9,
						left: buttonPos.x - inputWidth / 2 + buttonSize / 2,
						bottom: buttonPos.y,
					}}
					transition={{
						type: "spring",
						damping: 25,
						stiffness: 300,
						opacity: { duration: 0.15 },
						width: { type: "spring", damping: 30, stiffness: 400 },
					}}
					style={{
						position: "fixed",
						maxWidth: `calc(100vw - ${padding * 2}px)`,
						zIndex: 50,
					}}
				>
					{children}
				</motion.div>
			)}
		</AnimatePresence>
	);
}
