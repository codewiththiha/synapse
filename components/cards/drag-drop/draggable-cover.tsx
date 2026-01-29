/**
 * DraggableCardCover (Refactored)
 * UI shell that uses useDragGestures hook for all drag logic
 *
 * Extracted:
 * - useDragGestures hook: All pointer/touch handling, edge scroll, stack detection
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { CardCover as CardCoverType, Flashcard } from "@/lib/types/flashcard";
import { CardCover } from "@/components/cards/card-cover";
import { useDragDrop } from "./drag-context";
import { StackIndicator } from "./stack-indicator";
import { useDragGestures } from "@/hooks/use-drag-gestures";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";
import { SPRING_SMOOTH, SPRING_SNAPPY } from "@/lib/constants/animations";
import { Position2D } from "@/lib/types/common";

interface DraggableCardCoverProps {
	cover: CardCoverType;
	cards?: Flashcard[];
	isSelected?: boolean;
	onClick?: () => void;
	onDelete?: () => void;
	onRename?: () => void;
	onTogglePin?: () => void;
	onMoveToCollection?: () => void;
	onDragStart?: () => void;
	onDragEnd?: () => void;
}

/** Drag preview that follows cursor */
function DragPreview({
	cover,
	position,
}: {
	cover: CardCoverType;
	position: Position2D;
}) {
	return createPortal(
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.8 }}
			transition={SPRING_SNAPPY}
			className="fixed pointer-events-none z-9999"
			style={{
				left: position.x - 60,
				top: position.y - 80,
				width: 120,
			}}
		>
			<div className="aspect-3/4 rounded-xl border-2 border-primary bg-card shadow-2xl p-3 flex flex-col">
				<div className="flex-1 flex items-center justify-center">
					<div className="p-2 rounded-full bg-primary/10">
						<Layers size={20} className="text-primary" />
					</div>
				</div>
				<div className="space-y-0.5">
					<h3 className="font-semibold text-xs truncate">{cover.name}</h3>
					<p className="text-[10px] text-muted-foreground">
						{cover.cardCount} cards
					</p>
				</div>
			</div>
		</motion.div>,
		document.body,
	);
}

export function DraggableCardCover({
	cover,
	cards = [],
	isSelected,
	onClick,
	onDelete,
	onRename,
	onTogglePin,
	onMoveToCollection,
	onDragStart,
	onDragEnd,
}: DraggableCardCoverProps) {
	const { state } = useDragDrop();
	const containerRef = React.useRef<HTMLDivElement>(null);

	// Use the extracted drag gestures hook
	const {
		isBeingDragged,
		isStackTarget,
		isClickDisabled,
		handlers,
		handleClick,
	} = useDragGestures({
		cover,
		containerRef,
		onDragStart,
		onDragEnd,
	});

	return (
		<>
			<motion.div
				ref={containerRef}
				className={cn(
					"relative touch-none select-none",
					isBeingDragged && "z-50",
					// Highlight when being hovered by another dragged card
					state.isDragging &&
						!isBeingDragged &&
						state.dropTargetId === cover.id &&
						"ring-2 ring-primary ring-offset-2 rounded-xl",
				)}
				animate={{
					opacity: isBeingDragged ? 0.4 : 1,
					scale: isBeingDragged ? 0.95 : isStackTarget ? 1.05 : 1,
				}}
				transition={SPRING_SMOOTH}
				onPointerDown={handlers.onPointerDown}
				onPointerMove={handlers.onPointerMove}
				onPointerUp={handlers.onPointerUp}
				onPointerCancel={handlers.onPointerCancel}
				onTouchStart={handlers.onTouchStart}
				onTouchMove={handlers.onTouchMove}
				onTouchEnd={handlers.onTouchEnd}
				onTouchCancel={handlers.onTouchCancel}
				onContextMenu={handlers.onContextMenu}
				onPointerEnter={handlers.onPointerEnter}
				onPointerLeave={handlers.onPointerLeave}
			>
				<CardCover
					cover={cover}
					cards={cards}
					isSelected={isSelected}
					disabled={isBeingDragged || isClickDisabled}
					onClick={() => handleClick(onClick)}
					onDelete={onDelete}
					onRename={onRename}
					onTogglePin={onTogglePin}
					onMoveToCollection={onMoveToCollection}
				/>
			</motion.div>

			{/* Drag preview following cursor */}
			<AnimatePresence>
				{isBeingDragged && (
					<DragPreview cover={cover} position={state.dragPosition} />
				)}
			</AnimatePresence>

			{/* Stack indicator when hovering over this card */}
			<AnimatePresence>
				{isStackTarget && state.draggedCover && (
					<StackIndicator
						sourceCover={state.draggedCover}
						targetCover={cover}
						position={state.dragPosition}
						isStackReady={state.isStackReady}
					/>
				)}
			</AnimatePresence>
		</>
	);
}
