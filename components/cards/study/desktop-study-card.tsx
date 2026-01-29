"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import {
	ChevronLeft,
	ChevronRight,
	Lightbulb,
	Check,
	Shuffle,
	Trophy,
	X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DesktopStudyCardProps } from "./types";
import { ExplanationPanel } from "./explanation-panel";

export function DesktopStudyCard({
	card,
	index,
	total,
	isFlipped,
	explanation,
	isExplaining,
	isLoadingExplanation,
	masteredCount,
	hasMemo,
	isShuffling,
	hasReturnIndex,
	onFlip,
	onExplain,
	onCancelExplain,
	onSaveMemo,
	onEnough,
	onBack,
	onShuffle,
	onPrev,
	onNext,
	onShowMastered,
}: DesktopStudyCardProps) {
	const hasExplanation = !!explanation;

	// Swipe gesture support
	const x = useMotionValue(0);
	const rotate = useTransform(x, [-200, 200], [-10, 10]);
	const opacity = useTransform(
		x,
		[-200, -100, 0, 100, 200],
		[0.7, 1, 1, 1, 0.7],
	);

	const handleDragEnd = (
		_: unknown,
		info: { offset: { x: number }; velocity: { x: number } },
	) => {
		const threshold = 80;
		const velocityThreshold = 500;

		const isSwipeLeft =
			info.offset.x < -threshold || info.velocity.x < -velocityThreshold;
		const isSwipeRight =
			info.offset.x > threshold || info.velocity.x > velocityThreshold;

		if (isSwipeLeft && onNext) {
			onNext();
		} else if (isSwipeRight && onPrev) {
			onPrev();
		}
		x.set(0);
	};

	return (
		<motion.div
			layoutId={`card-${card.id}`}
			className={cn("flex gap-6", hasExplanation ? "max-w-4xl" : "max-w-md")}
		>
			{/* Card Section */}
			<div
				className={cn(
					"space-y-4 min-w-0",
					hasExplanation ? "w-[280px] shrink-0" : "flex-1",
				)}
			>
				{/* Navigation */}
				<div className="flex items-center justify-between">
					<Button
						variant="ghost"
						size="sm"
						onClick={onBack}
						className={hasExplanation ? "text-xs px-2" : ""}
					>
						<ChevronLeft size={hasExplanation ? 14 : 16} className="mr-1" />
						{hasExplanation ? "Back" : "Back to cards"}
					</Button>
					<span
						className={cn(
							"text-muted-foreground",
							hasExplanation ? "text-xs" : "text-sm",
						)}
					>
						{index + 1} / {total}
					</span>
					{onShuffle ? (
						<Button
							variant="ghost"
							size="sm"
							onClick={onShuffle}
							disabled={isShuffling}
							className={hasExplanation ? "text-xs px-2" : ""}
						>
							<motion.div
								animate={isShuffling ? { rotate: 360 } : { rotate: 0 }}
								transition={{ duration: 0.3 }}
							>
								<Shuffle size={hasExplanation ? 14 : 16} />
							</motion.div>
						</Button>
					) : (
						<div className={hasExplanation ? "w-12" : "w-16"} />
					)}
				</div>

				{/* Card */}
				<motion.div
					className="relative aspect-[3/4] cursor-grab active:cursor-grabbing select-none"
					style={{ x, rotate, opacity }}
					drag="x"
					dragConstraints={{ left: 0, right: 0 }}
					dragElastic={0.5}
					onDragEnd={handleDragEnd}
				>
					<div
						className="absolute inset-0 w-full h-full"
						style={{ perspective: "1000px" }}
						onClick={onFlip}
					>
						<motion.div
							className="absolute inset-0 w-full h-full pointer-events-none"
							style={{ transformStyle: "preserve-3d" }}
							animate={{ rotateY: isFlipped ? 180 : 0 }}
							transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
						>
							<div
								className={cn(
									"absolute inset-0 w-full h-full rounded-xl border-2 bg-card shadow-xl flex flex-col select-none",
									hasExplanation ? "p-4" : "p-6",
								)}
								style={{
									backfaceVisibility: "hidden",
									WebkitBackfaceVisibility: "hidden",
								}}
							>
								<div
									className={cn(
										"text-muted-foreground uppercase tracking-wider shrink-0",
										hasExplanation ? "text-[10px] mb-2" : "text-xs mb-4",
									)}
								>
									Question
								</div>
								<div className="flex-1 flex items-center justify-center text-center min-h-0">
									<p
										className={cn(
											"font-medium leading-relaxed overflow-auto max-h-full",
											hasExplanation ? "text-sm" : "text-lg",
										)}
									>
										{card.question}
									</p>
								</div>
								<p
									className={cn(
										"text-muted-foreground text-center shrink-0",
										hasExplanation ? "text-[10px] mt-2" : "text-xs mt-4",
									)}
								>
									Click to flip • Drag to navigate
								</p>
							</div>
							<div
								className={cn(
									"absolute inset-0 w-full h-full rounded-xl border-2 border-primary bg-primary text-primary-foreground shadow-xl flex flex-col select-none",
									hasExplanation ? "p-4" : "p-6",
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
										hasExplanation ? "text-[10px] mb-2" : "text-xs mb-4",
									)}
								>
									Answer
								</div>
								<div className="flex-1 flex items-center justify-center text-center min-h-0">
									<p
										className={cn(
											"font-medium leading-relaxed overflow-auto max-h-full",
											hasExplanation ? "text-sm" : "text-lg",
										)}
									>
										{card.answer}
									</p>
								</div>
							</div>
						</motion.div>
					</div>
				</motion.div>

				{/* Left/Right navigation */}
				<div className="flex items-center justify-between">
					<Button
						variant="outline"
						size="icon"
						onClick={onPrev}
						disabled={!onPrev}
						className={hasExplanation ? "h-8 w-8" : ""}
					>
						<ChevronLeft size={hasExplanation ? 16 : 20} />
					</Button>
					<div className="flex gap-2">
						<Button
							variant={isLoadingExplanation ? "secondary" : "outline"}
							onClick={isLoadingExplanation ? onCancelExplain : onExplain}
							disabled={isExplaining && !isLoadingExplanation}
							size={hasExplanation ? "sm" : "default"}
							className={cn(
								hasExplanation ? "text-xs" : "",
								isLoadingExplanation && "explain-loading",
							)}
						>
							{isLoadingExplanation ? (
								<>
									<X
										size={hasExplanation ? 14 : 16}
										className={hasExplanation ? "mr-1" : "mr-2"}
									/>
									Cancel
								</>
							) : (
								<>
									<Lightbulb
										size={hasExplanation ? 14 : 16}
										className={hasExplanation ? "mr-1" : "mr-2"}
									/>
									Explain
								</>
							)}
						</Button>
						<Button
							onClick={onEnough}
							size={hasExplanation ? "sm" : "default"}
							className={hasExplanation ? "text-xs" : ""}
						>
							<Check
								size={hasExplanation ? 14 : 16}
								className={hasExplanation ? "mr-1" : "mr-2"}
							/>
							Enough
						</Button>
					</div>
					<Button
						variant="outline"
						size="icon"
						onClick={onNext}
						disabled={!onNext}
						className={hasExplanation ? "h-8 w-8" : ""}
					>
						<ChevronRight size={hasExplanation ? 16 : 20} />
					</Button>
				</div>

				{/* Footer with mastered button */}
				<div className="flex items-center justify-between">
					<p
						className={cn(
							"text-muted-foreground",
							hasExplanation ? "text-[10px]" : "text-xs",
						)}
					>
						ESC to go back • Drag to navigate
					</p>
					{masteredCount > 0 && (
						<Button
							variant="outline"
							size="sm"
							onClick={onShowMastered}
							className={cn(
								"text-green-500 border-green-500/30 hover:bg-green-500/10",
								hasExplanation ? "text-xs h-7" : "",
							)}
						>
							<Trophy
								size={hasExplanation ? 12 : 14}
								className={hasExplanation ? "mr-1" : "mr-2"}
							/>
							{masteredCount} {hasExplanation ? "" : "Mastered"}
						</Button>
					)}
				</div>
			</div>

			{/* Explanation Panel */}
			<ExplanationPanel
				explanation={explanation}
				hasMemo={hasMemo}
				hasReturnIndex={hasReturnIndex}
				onSaveMemo={onSaveMemo}
				variant="desktop"
			/>
		</motion.div>
	);
}
