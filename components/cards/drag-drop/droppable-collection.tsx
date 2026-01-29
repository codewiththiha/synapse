"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CardCollection } from "@/lib/types/flashcard";
import { useDragDrop } from "./drag-context";
import { cn } from "@/lib/utils";

/**
 * DroppableCollection - Drop target wrapper for collections
 *
 * PARAMETERS:
 * - collection: CardCollection to make droppable
 * - children: Content to render inside (usually collection items)
 * - className?: Additional CSS classes
 * - onDropTargetChange?: Callback when drop target state changes
 *
 * WHAT IT DOES:
 * Wraps a collection to make it a valid drop target for dragged covers.
 * Monitors drag position and highlights when the dragged cover is over it.
 * Prevents dropping a cover into its own collection.
 *
 * KEY FEATURES:
 * - Automatic drop target detection based on cursor position
 * - Visual feedback (ring highlight) when hovering
 * - Scale animation on drop target activation
 * - Prevents self-drops (cover can't drop into its own collection)
 * - Subtle border indicator while dragging (valid targets)
 *
 * WHAT IT SERVES:
 * Acts as the drop zone for moving covers between collections. Provides
 * visual feedback and handles the geometry of drop target detection.
 *
 * USAGE:
 * <DroppableCollection collection={collection}>
 *   <div>Collection contents here</div>
 * </DroppableCollection>
 *
 * BENEFITS:
 * - Simple wrapper pattern for drop zones
 * - Automatic position-based detection
 * - Clear visual feedback for users
 * - Prevents invalid operations (self-drops)
 * - Reusable for any collection-like container
 */
interface DroppableCollectionProps {
	collection: CardCollection;
	children: React.ReactNode;
	className?: string;
	onDropTargetChange?: (isTarget: boolean) => void;
}

/**
 * DroppableCollection wraps collection items to accept dropped card covers.
 *
 * Requirements implemented:
 * - 3.1: Highlight with primary color border when drag hovers
 * - 5.1: Subtle border indicator while dragging (valid drop target)
 * - 5.2: Animate to show acceptance on drag enter (scale up, color change)
 * - 5.3: Animate back to default on drag leave
 */
export function DroppableCollection({
	collection,
	children,
	className,
	onDropTargetChange,
}: DroppableCollectionProps) {
	const { state, setDropTarget } = useDragDrop();
	const containerRef = React.useRef<HTMLDivElement>(null);

	// Track if this collection is the current drop target
	const isDropTarget =
		state.isDragging &&
		state.dropTargetId === collection.id &&
		state.dropTargetType === "collection";

	// Check if we're currently dragging (to show subtle highlight on all valid targets)
	const isDragging = state.isDragging;

	// Don't allow dropping on the collection the cover is already in
	const draggedCoverCollectionId = state.draggedCover?.collectionId;
	const isValidDropTarget =
		isDragging && draggedCoverCollectionId !== collection.id;

	// Notify parent of drop target state changes
	React.useEffect(() => {
		onDropTargetChange?.(isDropTarget);
	}, [isDropTarget, onDropTargetChange]);

	// Use effect to check if drag position is over this collection
	// This is needed because pointer capture prevents normal pointer events
	React.useEffect(() => {
		if (!isDragging || !isValidDropTarget || !containerRef.current) return;

		const rect = containerRef.current.getBoundingClientRect();
		const { x, y } = state.dragPosition;

		const isOver =
			x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

		if (isOver && !isDropTarget) {
			setDropTarget(collection.id, "collection");
		} else if (!isOver && isDropTarget) {
			setDropTarget(null, null);
		}
	}, [
		isDragging,
		isValidDropTarget,
		state.dragPosition,
		isDropTarget,
		collection.id,
		setDropTarget,
	]);

	return (
		<motion.div
			ref={containerRef}
			className={cn(
				"relative rounded-xl transition-colors",
				// Subtle border indicator while dragging (Requirement 5.1)
				isValidDropTarget && !isDropTarget && "ring-2 ring-primary/20",
				// Primary color border when hovering (Requirement 3.1)
				isDropTarget && "ring-2 ring-primary",
				className,
			)}
			// Animate scale on drag enter/leave (Requirement 5.2, 5.3)
			animate={{
				scale: isDropTarget ? 1.02 : 1,
			}}
			transition={{
				type: "spring",
				stiffness: 400,
				damping: 25,
			}}
		>
			{children}

			{/* Drop zone overlay for visual feedback */}
			{isDropTarget && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="absolute inset-0 rounded-xl bg-primary/10 pointer-events-none"
				/>
			)}
		</motion.div>
	);
}
