"use client";

import { useState } from "react";
import { FolderIcon } from "./folder-icon";
import { cn } from "@/lib/utils";

/**
 * FolderCard - Complete folder display component with interaction
 *
 * PARAMETERS:
 * - title: Folder/collection name to display
 * - count: Number of items in the folder
 * - size?: Visual size variant: "sm" | "md" | "lg" | "xl" (default: "lg")
 * - className?: Additional CSS classes
 * - isDragOver?: Whether a drag is currently over this folder (default: false)
 *
 * WHAT IT DOES:
 * Combines FolderIcon with a title label to create a complete folder card.
 * Responds to both hover and drag-over states by animating the folder open.
 * Shows item count badge and title with hover color change.
 *
 * KEY FEATURES:
 * - Folder opens on hover (mouse) or drag-over (drag-drop)
 * - Smooth color transition on hover
 * - Item count badge via FolderIcon
 * - Responsive sizing
 * - Dark mode support
 * - Centered layout with gap between icon and title
 *
 * WHAT IT SERVES:
 * High-level component for displaying collections/folders in a grid or list.
 * Bridges the gap between the low-level FolderIcon and application logic.
 *
 * USAGE:
 * <FolderCard
 *   title="My Collection"
 *   count={12}
 *   size="lg"
 *   isDragOver={isDraggingOver}
 * />
 *
 * BENEFITS:
 * - Complete, ready-to-use folder display
 * - Integrates with drag-drop system via isDragOver prop
 * - Hover feedback improves perceived interactivity
 * - Reusable across different contexts
 * - Clean separation from drag-drop logic
 */
interface FolderCardProps {
	title: string;
	count: number;
	size?: "sm" | "md" | "lg" | "xl";
	className?: string;
	/** If you are implementing Drag & Drop, pass the boolean here */
	isDragOver?: boolean;
}

export function FolderCard({
	title,
	count,
	size = "lg",
	className,
	isDragOver = false,
}: FolderCardProps) {
	// Track local hover state for mouse interactions
	const [isHovering, setIsHovering] = useState(false);

	/**
	 * Folder opens when:
	 * 1. isDragOver is true (drag-drop integration)
	 * 2. User hovers with mouse (local hover state)
	 * This dual-trigger pattern works seamlessly with drag-drop system
	 */
	const isOpen = isDragOver || isHovering;

	return (
		<div
			className={cn(
				"flex flex-col items-center gap-3 cursor-pointer group w-fit mx-auto",
				className,
			)}
			onMouseEnter={() => setIsHovering(true)}
			onMouseLeave={() => setIsHovering(false)}
		>
			<FolderIcon
				size={size}
				hasContents={count > 0}
				contentCount={count}
				isOpen={isOpen}
			/>
			<span
				className={cn(
					"text-sm font-medium text-center break-words max-w-[120px]",
					"text-slate-700 dark:text-slate-300",
					"group-hover:text-blue-600 dark:group-hover:text-white transition-colors duration-200",
				)}
			>
				{title}
			</span>
		</div>
	);
}
