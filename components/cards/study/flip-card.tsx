"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Flashcard } from "@/lib/types/flashcard";

interface FlipCardProps {
	card: Flashcard;
	isFlipped: boolean;
	compact?: boolean;
	onClick?: () => void;
}

export function FlipCard({ card, isFlipped, compact, onClick }: FlipCardProps) {
	return (
		<div
			className={cn("absolute inset-0 w-full h-full cursor-pointer")}
			onClick={onClick}
			style={{ perspective: "1000px" }}
		>
			<motion.div
				className="absolute inset-0 w-full h-full"
				style={{ transformStyle: "preserve-3d" }}
				animate={{ rotateY: isFlipped ? 180 : 0 }}
				transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
			>
				{/* Front - Question */}
				<div
					className={cn(
						"absolute inset-0 w-full h-full rounded-xl border-2 bg-card shadow-xl flex flex-col select-none pointer-events-none",
						compact ? "p-4" : "p-6",
					)}
					style={{
						backfaceVisibility: "hidden",
						WebkitBackfaceVisibility: "hidden",
					}}
				>
					<div
						className={cn(
							"text-muted-foreground uppercase tracking-wider shrink-0",
							compact ? "text-[10px] mb-2" : "text-xs mb-4",
						)}
					>
						Question
					</div>
					<div className="flex-1 flex items-center justify-center text-center min-h-0">
						<p
							className={cn(
								"font-medium leading-relaxed overflow-auto max-h-full",
								compact ? "text-sm" : "text-base",
							)}
						>
							{card.question}
						</p>
					</div>
					{!compact && (
						<p className="text-xs text-muted-foreground text-center mt-4 shrink-0">
							Tap to flip • Drag to navigate
						</p>
					)}
				</div>

				{/* Back - Answer */}
				<div
					className={cn(
						"absolute inset-0 w-full h-full rounded-xl border-2 border-primary bg-primary text-primary-foreground shadow-xl flex flex-col select-none pointer-events-none",
						compact ? "p-4" : "p-6",
					)}
					style={{
						backfaceVisibility: "hidden",
						WebkitBackfaceVisibility: "hidden",
						transform: "rotateY(180deg)",
					}}
				>
					<div
						className={cn(
							"opacity-70 uppercase tracking-wider shrink-0",
							compact ? "text-[10px] mb-2" : "text-xs mb-4",
						)}
					>
						Answer
					</div>
					<div className="flex-1 flex items-center justify-center text-center min-h-0">
						<p
							className={cn(
								"font-medium leading-relaxed overflow-auto max-h-full",
								compact ? "text-sm" : "text-base",
							)}
						>
							{card.answer}
						</p>
					</div>
				</div>
			</motion.div>
		</div>
	);
}
