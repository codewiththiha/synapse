"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Flashcard } from "@/lib/types/flashcard";
import { SpreadCard } from "./spread-card";
import { STACK_ROTATIONS, CARDS_PER_PAGE } from "./types";
import { useSwipe } from "@/hooks/use-swipe";

interface SpreadViewProps {
	cards: Flashcard[];
	pageCards: Flashcard[];
	currentPage: number;
	totalPages: number;
	totalCards: number;
	masteredCount: number;
	isMobile: boolean;
	onCardClick: (index: number, e: React.MouseEvent) => void;
	onPrevPage: (e?: React.MouseEvent) => void;
	onNextPage: (e?: React.MouseEvent) => void;
	onShowMastered: () => void;
}

function getSpreadPositions(count: number) {
	const positions: Array<{ x: number; y: number; rotate: number }> = [];
	const spacing = 120;
	const startX = -((count - 1) * spacing) / 2;
	for (let i = 0; i < count; i++) {
		positions.push({
			x: startX + i * spacing,
			y: Math.sin((i / Math.max(count - 1, 1)) * Math.PI) * 15,
			rotate: (i - Math.floor(count / 2)) * 5,
		});
	}
	return positions;
}

export function SpreadView({
	pageCards,
	currentPage,
	totalPages,
	totalCards,
	masteredCount,
	isMobile,
	onCardClick,
	onPrevPage,
	onNextPage,
	onShowMastered,
}: SpreadViewProps) {
	const spreadPositions = getSpreadPositions(pageCards.length);

	const canGoPrev = currentPage > 0;
	const canGoNext = currentPage < totalPages - 1;

	const { x, dragProps } = useSwipe(
		{
			onSwipeLeft: canGoNext ? onNextPage : undefined,
			onSwipeRight: canGoPrev ? onPrevPage : undefined,
		},
		{ threshold: 80, rotateAmount: 5 },
	);

	return (
		<>
			<motion.div
				className="relative flex items-center justify-center w-full h-full select-none cursor-grab active:cursor-grabbing"
				style={{ x }}
				drag="x"
				dragConstraints={{ left: 0, right: 0 }}
				dragElastic={0.3}
				onDragEnd={dragProps.onDragEnd}
			>
				{canGoPrev && (
					<Button
						variant="outline"
						size="icon"
						className="absolute left-4 z-20"
						onClick={onPrevPage}
					>
						<ChevronLeft size={24} />
					</Button>
				)}

				<div className="relative flex items-center justify-center">
					{pageCards.map((card, i) => (
						<motion.div
							key={card.id}
							layoutId={`card-${card.id}`}
							className="absolute cursor-pointer select-none"
							style={{ width: 180 }}
							initial={{
								x: 0,
								y: 0,
								rotate: STACK_ROTATIONS[i % 5],
								scale: 0.8,
								opacity: 0,
							}}
							animate={{
								x: spreadPositions[i]?.x || 0,
								y: spreadPositions[i]?.y || 0,
								rotate: spreadPositions[i]?.rotate || 0,
								scale: 1,
								opacity: 1,
							}}
							exit={{ scale: 0.8, opacity: 0 }}
							transition={{
								type: "spring",
								stiffness: 200,
								damping: 25,
								delay: i * 0.05,
							}}
							whileHover={{
								scale: 1.1,
								rotate: 0,
								y: (spreadPositions[i]?.y || 0) - 20,
								zIndex: 100,
							}}
							onClick={(e) => onCardClick(i, e)}
						>
							<SpreadCard
								card={card}
								index={currentPage * CARDS_PER_PAGE + i + 1}
								total={totalCards}
							/>
						</motion.div>
					))}
				</div>

				{canGoNext && (
					<Button
						variant="outline"
						size="icon"
						className="absolute right-4 z-20"
						onClick={onNextPage}
					>
						<ChevronRight size={24} />
					</Button>
				)}

				{totalPages > 1 && (
					<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
						{Array.from({ length: totalPages }).map((_, i) => (
							<div
								key={i}
								className={cn(
									"w-2 h-2 rounded-full transition-colors",
									i === currentPage ? "bg-primary" : "bg-muted",
								)}
							/>
						))}
					</div>
				)}
			</motion.div>

			{/* Footer */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className="relative z-20 flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-t bg-background/50 gap-2"
			>
				<p className="text-xs md:text-sm text-muted-foreground">
					{isMobile
						? "Tap to study • Swipe pages"
						: "Click a card to study • Swipe or ESC to close"}
				</p>
				{masteredCount > 0 && (
					<Button
						variant="outline"
						size="sm"
						onClick={(e) => {
							e.stopPropagation();
							onShowMastered();
						}}
						className="text-green-500 border-green-500/30 hover:bg-green-500/10 shrink-0 text-xs md:text-sm"
					>
						<Trophy size={14} className="mr-1 md:mr-2" />
						<span className="hidden md:inline">{masteredCount} Mastered</span>
						<span className="md:hidden">{masteredCount}</span>
					</Button>
				)}
			</motion.div>
		</>
	);
}
