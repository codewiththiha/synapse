/**
 * StackedCardVisuals Component
 * Pure UI component for the stacked card cover animation
 * No logic - just Framer Motion stack animation
 */

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
	Layers,
	Pin,
	MoreVertical,
	Trash2,
	Edit2,
	FolderInput,
	Trophy,
} from "lucide-react";
import { CardCover as CardCoverType } from "@/lib/types/flashcard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PerspectiveWrapper } from "./study/perspective-wrapper";
import { STACK_ROTATIONS, STACK_OFFSETS } from "./study/types";

interface StackedCardVisualsProps {
	cover: CardCoverType;
	activeCardCount: number;
	masteredCardCount: number;
	isSelected?: boolean;
	isHovered: boolean;
	onClick: () => void;
	onHoverStart: () => void;
	onHoverEnd: () => void;
	onDelete?: () => void;
	onRename?: () => void;
	onTogglePin?: () => void;
	onMoveToCollection?: () => void;
	onShowMastered?: () => void;
}

export function StackedCardVisuals({
	cover,
	activeCardCount,
	masteredCardCount,
	isSelected,
	isHovered,
	onClick,
	onHoverStart,
	onHoverEnd,
	onDelete,
	onRename,
	onTogglePin,
	onMoveToCollection,
	onShowMastered,
}: StackedCardVisualsProps) {
	const displayCount = Math.min(cover.cardCount, 5);

	return (
		<motion.div
			layoutId={`cover-${cover.id}`}
			className={cn("relative group cursor-pointer", "w-full aspect-3/4")}
			onClick={onClick}
			onHoverStart={onHoverStart}
			onHoverEnd={onHoverEnd}
			whileHover={{ scale: 1.02 }}
			whileTap={{ scale: 0.98 }}
		>
			<PerspectiveWrapper>
				{/* Background stack cards */}
				{Array.from({ length: displayCount }).map((_, i) => {
					const stackIndex = displayCount - 1 - i;
					if (stackIndex === 0) return null;
					return (
						<motion.div
							key={`stack-${i}`}
							className="absolute inset-0 rounded-xl border bg-card shadow-md"
							animate={{
								rotate: isHovered
									? STACK_ROTATIONS[stackIndex] * 1.5
									: STACK_ROTATIONS[stackIndex],
								x: STACK_OFFSETS[stackIndex].x,
								y: STACK_OFFSETS[stackIndex].y,
								scale: 1 - stackIndex * 0.02,
							}}
							transition={{ type: "spring", stiffness: 300, damping: 25 }}
							style={{ zIndex: i }}
						/>
					);
				})}

				{/* Front card */}
				<motion.div
					className={cn(
						"relative h-full rounded-xl border-2 bg-card shadow-lg p-4 flex flex-col transition-colors",
						isSelected ? "border-primary" : "border-border",
						"hover:border-primary/50",
					)}
					style={{ zIndex: displayCount }}
					animate={{ rotate: isHovered ? 2 : 0 }}
					transition={{ type: "spring", stiffness: 300, damping: 25 }}
				>
					{/* Pin indicator */}
					{cover.isPinned && (
						<div className="absolute top-2 left-2">
							<Pin size={14} className="text-primary fill-primary" />
						</div>
					)}

					{/* Dropdown menu */}
					<div className="absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7"
									onClick={(e) => e.stopPropagation()}
								>
									<MoreVertical size={14} />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										onTogglePin?.();
									}}
								>
									<Pin size={14} className="mr-2" />
									{cover.isPinned ? "Unpin" : "Pin"}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										onRename?.();
									}}
								>
									<Edit2 size={14} className="mr-2" />
									Rename
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										onMoveToCollection?.();
									}}
								>
									<FolderInput size={14} className="mr-2" />
									Move to Collection
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										onDelete?.();
									}}
									className="text-destructive"
								>
									<Trash2 size={14} className="mr-2" />
									Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					{/* Center icon */}
					<div className="flex-1 flex items-center justify-center">
						<div className="p-4 rounded-full bg-primary/10">
							<Layers size={32} className="text-primary" />
						</div>
					</div>

					{/* Bottom info */}
					<div className="space-y-1">
						<h3 className="font-semibold text-sm truncate">{cover.name}</h3>
						<p className="text-xs text-muted-foreground">
							{activeCardCount}/{cover.cardCount} cards
						</p>
						{masteredCardCount > 0 && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onShowMastered?.();
								}}
								className="text-xs text-green-500 hover:underline flex items-center gap-1"
							>
								<Trophy size={12} />
								{masteredCardCount} mastered
							</button>
						)}
					</div>
				</motion.div>
			</PerspectiveWrapper>
		</motion.div>
	);
}
