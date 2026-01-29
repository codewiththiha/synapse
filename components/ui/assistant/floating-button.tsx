"use client";

/**
 * FloatingAssistantButton
 * Draggable floating action button for AI assistants
 *
 * Features:
 * - Draggable with pointer events
 * - Loading state with pulse animation
 * - Customizable icons
 */

import { forwardRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatingPosition } from "@/hooks/use-floating-assistant";

export interface FloatingAssistantButtonProps {
	/** Whether the button is visible */
	visible: boolean;
	/** Current position */
	position: FloatingPosition;
	/** Whether currently loading/processing */
	isLoading?: boolean;
	/** Whether currently being dragged */
	isDragging?: boolean;
	/** Icon to show when not loading */
	icon?: ReactNode;
	/** Icon to show when loading (defaults to X for cancel) */
	loadingIcon?: ReactNode;
	/** Click handler */
	onClick?: () => void;
	/** Pointer down handler for drag start */
	onPointerDown?: (e: React.PointerEvent) => void;
	/** Additional class names */
	className?: string;
}

export const FloatingAssistantButton = forwardRef<
	HTMLDivElement,
	FloatingAssistantButtonProps
>(
	(
		{
			visible,
			position,
			isLoading = false,
			isDragging = false,
			icon = <Sparkles size={20} />,
			loadingIcon = <X size={20} />,
			onClick,
			onPointerDown,
			className,
		},
		ref,
	) => {
		return (
			<AnimatePresence>
				{visible && (
					<motion.div
						ref={ref}
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.8 }}
						style={{
							position: "fixed",
							left: position.x,
							bottom: position.y,
							zIndex: 50,
							touchAction: "none",
						}}
						className={cn(
							"cursor-grab active:cursor-grabbing",
							isDragging && "cursor-grabbing",
							className,
						)}
						onPointerDown={onPointerDown}
					>
						<Button
							size="icon"
							onClick={onClick}
							className={cn(
								"h-12 w-12 rounded-full shadow-lg pointer-events-auto transition-colors",
								isLoading && "explain-loading",
							)}
						>
							{isLoading ? loadingIcon : icon}
						</Button>
					</motion.div>
				)}
			</AnimatePresence>
		);
	},
);

FloatingAssistantButton.displayName = "FloatingAssistantButton";
