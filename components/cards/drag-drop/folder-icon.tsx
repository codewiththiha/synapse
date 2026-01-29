"use client";

import * as React from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * FolderIcon - Animated 3D folder visual component
 *
 * PARAMETERS:
 * - hasContents?: Whether folder has items (default: true)
 * - contentCount?: Number of items (controls badge and stack height)
 * - isOpen?: Whether folder is in open/receive state (default: false)
 * - size?: Visual size variant: "sm" | "md" | "lg" | "xl" (default: "lg")
 * - folderColorClass?: Tailwind class for folder body light mode (default: "bg-slate-200")
 * - folderColorClassDark?: Tailwind class for folder body dark mode (default: "dark:bg-[#1A1A1A]")
 * - badgeColorClass?: Tailwind class for count badge (default: "bg-blue-600/40")
 * - accentColorClass?: Tailwind class for paper accent line (default: "bg-blue-400/50")
 * - className?: Additional CSS classes
 *
 * WHAT IT DOES:
 * Renders a beautiful 3D animated folder icon with stacked papers inside.
 * Papers fan out when folder is "open", and collapse when closed.
 * Shows item count badge in top-right corner.
 *
 * KEY FEATURES:
 * - 3D perspective with layered rendering (back plate, papers, front flap)
 * - Smooth Framer Motion animations
 * - Responsive sizing (sm/md/lg/xl)
 * - Customizable colors for different folder types
 * - Item count badge with 99+ overflow
 * - Dark mode support
 * - Hover effect on front flap
 *
 * WHAT IT SERVES:
 * Visual representation of collections/folders in the UI. Can be themed
 * for different folder types (Projects, Archives, Deleted, etc.).
 *
 * USAGE:
 * <FolderIcon
 *   contentCount={5}
 *   isOpen={isDraggingOver}
 *   size="lg"
 *   badgeColorClass="bg-green-600/40"
 * />
 *
 * BENEFITS:
 * - Beautiful, polished visual component
 * - Themeable for different use cases
 * - Smooth animations enhance perceived quality
 * - Responsive sizing for different contexts
 * - Dark mode support out of the box
 * - Reusable for any folder-like container
 */
interface FolderIconProps {
	/** If false, folder renders empty */
	hasContents?: boolean;
	/** Total number of items (controls badge and stack height) */
	contentCount?: number;
	/** Controls the open/receive state (e.g. on DragOver) */
	isOpen?: boolean;
	/** Visual variant size */
	size?: "sm" | "md" | "lg" | "xl";
	/** Tailwind class for the folder body color (light mode) */
	folderColorClass?: string;
	/** Tailwind class for the folder body color (dark mode) */
	folderColorClassDark?: string;
	/** Tailwind class for the badge background */
	badgeColorClass?: string;
	/** Tailwind class for the paper accent line */
	accentColorClass?: string;
	className?: string;
}

export function FolderIcon({
	hasContents = true,
	contentCount = 0,
	isOpen = false,
	size = "lg",
	folderColorClass = "bg-slate-200",
	folderColorClassDark = "dark:bg-[#1A1A1A]",
	badgeColorClass = "bg-blue-600/40",
	accentColorClass = "bg-blue-400/50",
	className,
}: FolderIconProps) {
	// 1. Logic: Limit visual stack to 5 items, but show at least 1 if hasContents is true
	const maxVisibleItems = 5;
	// If count is 0 but hasContents is true, show 1 placeholder paper
	const effectiveCount = hasContents && contentCount === 0 ? 1 : contentCount;
	const visibleItemCount = Math.min(effectiveCount, maxVisibleItems);

	const items = React.useMemo(() => {
		return visibleItemCount > 0 ? Array.from({ length: visibleItemCount }) : [];
	}, [visibleItemCount]);

	// Size configurations (Tailwind classes)
	const sizeConfig = {
		sm: "w-14 h-12",
		md: "w-20 h-16",
		lg: "w-24 h-20",
		xl: "w-32 h-28",
	};

	const folderSize = sizeConfig[size] || sizeConfig.lg;

	// --- Animation Variants ---

	// Front Flap Animation
	const flapVariants: Variants = {
		closed: {
			rotateX: 0,
			y: 0,
			transition: { type: "spring", stiffness: 300, damping: 20 },
		},
		open: {
			rotateX: -20, // Tults forward
			y: 5,
			transition: { type: "spring", stiffness: 300, damping: 20 },
		},
	};

	// Papers Animation
	const paperVariants: Variants = {
		closed: (i: number) => ({
			y: i * -2, // Compact stack
			scale: 1 - i * 0.05, // Slight depth scaling
			rotate: (i % 2 === 0 ? 1 : -1) * i, // Tiny organic rotation
			transition: { type: "spring", stiffness: 300, damping: 25 },
		}),
		open: (i: number) => ({
			// Fan out upwards
			y: -15 - i * 8,
			// Fan out sideways slightly
			rotate: (i % 2 === 0 ? 3 : -3) * (i + 1),
			scale: 1,
			transition: {
				type: "spring",
				stiffness: 250,
				damping: 20,
				delay: i * 0.04, // Staggered effect
			},
		}),
	};

	return (
		<div
			className={cn(
				"relative flex items-end justify-center perspective-[800px] group",
				folderSize,
				className,
			)}
		>
			{/* -------------------------------------------------------
          LAYER 1: BACK PLATE (The folder background)
         ------------------------------------------------------- */}
			<div
				className={cn(
					"absolute inset-0 rounded-xl transition-colors duration-300 border border-slate-300 dark:border-white/10",
					folderColorClass,
					folderColorClassDark,
				)}
			>
				{/* The Tab (Top Left) */}
				<div
					className={cn(
						"absolute -top-2.5 left-0 w-[40%] h-4 rounded-t-lg transition-colors duration-300 border-x border-t border-slate-300 dark:border-white/10 dark:border-b-0",
						folderColorClass,
						folderColorClassDark,
					)}
				/>
			</div>

			{/* -------------------------------------------------------
          LAYER 2: PAPERS (The Stack)
          Rendered BEFORE the front flap so they sit inside.
         ------------------------------------------------------- */}
			<div className="absolute inset-x-0 bottom-2 h-full flex items-end justify-center z-10 pointer-events-none">
				{items.map((_, index) => (
					<motion.div
						key={index}
						custom={index}
						variants={paperVariants}
						initial="closed"
						animate={isOpen ? "open" : "closed"}
						// Reverse z-index: First item (index 0) is front-most in the stack
						style={{ zIndex: maxVisibleItems - index }}
						className={cn(
							"absolute bottom-1 w-[85%] aspect-[4/3] rounded-sm shadow-sm border box-border",
							// Paper Style (White in light, slightly off-white in dark for visibility)
							"bg-white dark:bg-[#E5E5E5] border-slate-200 dark:border-slate-300",
							// Layout inside paper
							"flex flex-col gap-1.5 p-2 overflow-hidden",
						)}
					>
						{/* Skeleton Content Lines */}
						<div className="w-full h-0.5 bg-slate-200 dark:bg-slate-400 rounded-full" />
						<div className="w-2/3 h-0.5 bg-slate-200 dark:bg-slate-400 rounded-full" />

						{/* Top card gets a colored accent line */}
						{index === 0 && (
							<div
								className={cn(
									"w-1/2 h-0.5 rounded-full mt-auto",
									accentColorClass,
								)}
							/>
						)}
					</motion.div>
				))}
			</div>

			{/* -------------------------------------------------------
          LAYER 3: FRONT FLAP (The Pocket)
         ------------------------------------------------------- */}
			<motion.div
				variants={flapVariants}
				initial="closed"
				animate={isOpen ? "open" : "closed"}
				// Subtle hover effect when not dragging
				whileHover={
					!isOpen ? { rotateX: -5, transition: { duration: 0.2 } } : undefined
				}
				style={{ transformOrigin: "bottom" }}
				className={cn(
					"absolute inset-x-0 bottom-0 h-[80%] rounded-xl z-20 overflow-hidden transition-colors duration-300",
					// Light Mode
					"bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300",
					// Dark Mode (Gradient for subtle 3D feel)
					"dark:from-[#222222] dark:to-[#1A1A1A] dark:border-t-white/10 dark:border-x-white/5 dark:border-b-transparent",
					"shadow-sm",
				)}
			>
				{/* Inner shadow/highlight for depth */}
				<div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
			</motion.div>

			{/* -------------------------------------------------------
          LAYER 4: NOTIFICATION BADGE
         ------------------------------------------------------- */}
			{contentCount > 0 && (
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					className={cn(
						"absolute -top-1.5 -right-1.5 z-30",
						"flex items-center justify-center min-w-[20px] h-5 px-1",
						"text-white font-bold rounded-full text-[10px] leading-none",
						"shadow-md ring-2 ring-white dark:ring-[#0F0F0F]",
						badgeColorClass,
					)}
				>
					{contentCount > 99 ? "99+" : contentCount}
				</motion.div>
			)}
		</div>
	);
}
