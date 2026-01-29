"use client";

import { motion } from "framer-motion";
import { Layers, FolderPlus } from "lucide-react";
import { CardCover } from "@/lib/types/flashcard";
import { cn } from "@/lib/utils";
import { SPRING_SNAPPY } from "@/lib/constants/animations";
import { Position2D } from "@/lib/types/common";

/**
 * StackIndicator - Visual feedback for cover stacking (folder creation)
 *
 * PARAMETERS:
 * - sourceCover: CardCover being dragged
 * - targetCover: CardCover being hovered over
 * - position: Current cursor position
 * - isStackReady?: Whether stack is ready to create (default: true)
 * - label?: Custom action label (default: "Create Collection")
 *
 * WHAT IT DOES:
 * Displays an animated indicator showing two covers stacking together when
 * a drag hovers over another cover for 500ms. Shows pulsing animation and
 * "Create Collection" hint to indicate pending folder creation.
 *
 * KEY FEATURES:
 * - Stacked card preview with slight rotation
 * - Pulsing ring animation when ready
 * - Customizable action label
 * - Portal rendering for smooth performance
 * - Spring animations for natural feel
 *
 * WHAT IT SERVES:
 * Provides clear visual feedback that dragging one cover onto another will
 * create a new collection. Follows Android-style folder creation pattern.
 *
 * USAGE:
 * <StackIndicator
 *   sourceCover={draggedCover}
 *   targetCover={hoveredCover}
 *   position={cursorPos}
 *   isStackReady={true}
 *   label="Create Folder"
 * />
 *
 * BENEFITS:
 * - Clear affordance for stacking action
 * - Pulsing animation draws attention without being distracting
 * - Customizable for different use cases
 * - Follows familiar mobile UI patterns
 */
interface StackIndicatorProps {
	sourceCover: CardCover;
	targetCover: CardCover;
	position: Position2D;
	isStackReady?: boolean;
	/** Label for the action hint (default: "Create Collection") */
	label?: string;
}

/**
 * StackIndicator Component
 *
 * Displays a visual indicator when two card covers are about to be grouped
 * into a new collection (Android-style folder creation).
 *
 * Requirements:
 * - 4.1: WHEN a Drag_Source hovers over another Card_Cover for 500ms,
 *        THE Stack_Indicator SHALL display showing the two covers stacking together
 * - 4.2: WHILE the Stack_Indicator is visible, THE System SHALL display
 *        a pulsing animation to indicate pending group creation
 */
export function StackIndicator({
	sourceCover,
	targetCover,
	position,
	isStackReady = true,
	label = "Create Collection",
}: StackIndicatorProps) {
	return (
		<motion.div
			className="fixed z-[100] pointer-events-none"
			style={{
				left: position.x,
				top: position.y,
				transform: "translate(-50%, -50%)",
			}}
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.8 }}
			transition={SPRING_SNAPPY}
		>
			{/* Stacked card preview container */}
			<div className="relative w-24 h-32">
				{/* Background card (target) - slightly rotated left */}
				<motion.div
					className={cn(
						"absolute inset-0 rounded-lg border-2 bg-card shadow-lg",
						"flex flex-col items-center justify-center p-2",
						isStackReady ? "border-primary" : "border-border",
					)}
					initial={{ rotate: -8, x: -4, y: 4 }}
					animate={{
						rotate: -8,
						x: -4,
						y: 4,
						scale: isStackReady ? [1, 1.02, 1] : 1,
					}}
					transition={{
						scale: {
							repeat: isStackReady ? Infinity : 0,
							duration: 1.5,
							ease: "easeInOut",
						},
					}}
				>
					<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1">
						<Layers size={16} className="text-primary/60" />
					</div>
					<span className="text-[8px] text-muted-foreground truncate max-w-full px-1">
						{targetCover.name}
					</span>
				</motion.div>

				{/* Foreground card (source) - slightly rotated right */}
				<motion.div
					className={cn(
						"absolute inset-0 rounded-lg border-2 bg-card shadow-xl",
						"flex flex-col items-center justify-center p-2",
						isStackReady ? "border-primary" : "border-border",
					)}
					initial={{ rotate: 8, x: 4, y: -4 }}
					animate={{
						rotate: 8,
						x: 4,
						y: -4,
						scale: isStackReady ? [1, 1.02, 1] : 1,
					}}
					transition={{
						scale: {
							repeat: isStackReady ? Infinity : 0,
							duration: 1.5,
							ease: "easeInOut",
							delay: 0.15, // Slight offset for wave effect
						},
					}}
				>
					<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1">
						<Layers size={16} className="text-primary/60" />
					</div>
					<span className="text-[8px] text-muted-foreground truncate max-w-full px-1">
						{sourceCover.name}
					</span>
				</motion.div>

				{/* Pulsing ring indicator (Requirement 4.2) */}
				{isStackReady && (
					<motion.div
						className="absolute inset-0 rounded-lg border-2 border-primary"
						initial={{ opacity: 0.8, scale: 1 }}
						animate={{
							opacity: [0.8, 0, 0.8],
							scale: [1, 1.15, 1],
						}}
						transition={{
							repeat: Infinity,
							duration: 1.5,
							ease: "easeInOut",
						}}
					/>
				)}
			</div>

			{/* Create collection hint */}
			<motion.div
				className={cn(
					"mt-2 flex items-center justify-center gap-1",
					"px-2 py-1 rounded-full bg-primary text-primary-foreground",
					"text-[10px] font-medium shadow-lg",
				)}
				initial={{ opacity: 0, y: -8 }}
				animate={{
					opacity: 1,
					y: 0,
					scale: isStackReady ? [1, 1.05, 1] : 1,
				}}
				transition={{
					delay: 0.1,
					scale: {
						repeat: isStackReady ? Infinity : 0,
						duration: 1.5,
						ease: "easeInOut",
					},
				}}
			>
				<FolderPlus size={10} />
				<span>{label}</span>
			</motion.div>
		</motion.div>
	);
}
