"use client";

import { motion } from "framer-motion";
import {
	ChevronLeft,
	ChevronRight,
	Lightbulb,
	Check,
	Shuffle,
	Trophy,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StudyControlsProps {
	index: number;
	total: number;
	masteredCount: number;
	isExplaining: boolean;
	isLoadingExplanation: boolean;
	isShuffling?: boolean;
	compact?: boolean;
	onExplain: () => void;
	onCancelExplain?: () => void;
	onEnough: (e?: React.MouseEvent) => void;
	onShuffle?: () => void;
	onPrev?: () => void;
	onNext?: () => void;
	onShowMastered: () => void;
}

export function StudyControls({
	masteredCount,
	isExplaining,
	isLoadingExplanation,
	compact,
	onExplain,
	onCancelExplain,
	onEnough,
	onPrev,
	onNext,
	onShowMastered,
}: StudyControlsProps) {
	return (
		<>
			{/* Navigation arrows */}
			<div className="flex items-center justify-between">
				<Button
					variant="outline"
					size="icon"
					onClick={onPrev}
					disabled={!onPrev}
					className={compact ? "h-8 w-8" : ""}
				>
					<ChevronLeft size={compact ? 16 : 20} />
				</Button>
				<div className="flex gap-2">
					<Button
						variant={isLoadingExplanation ? "secondary" : "outline"}
						size="sm"
						onClick={isLoadingExplanation ? onCancelExplain : onExplain}
						disabled={isExplaining && !isLoadingExplanation}
						className={cn(
							compact ? "text-xs h-8" : "",
							isLoadingExplanation && "explain-loading",
						)}
					>
						{isLoadingExplanation ? (
							<>
								<X size={compact ? 14 : 16} className="mr-1" />
								Cancel
							</>
						) : (
							<>
								<Lightbulb size={compact ? 14 : 16} className="mr-1" />
								Explain
							</>
						)}
					</Button>
					<Button
						size="sm"
						onClick={onEnough}
						className={compact ? "text-xs h-8" : ""}
					>
						<Check size={compact ? 14 : 16} className="mr-1" />
						Enough
					</Button>
				</div>
				<Button
					variant="outline"
					size="icon"
					onClick={onNext}
					disabled={!onNext}
					className={compact ? "h-8 w-8" : ""}
				>
					<ChevronRight size={compact ? 16 : 20} />
				</Button>
			</div>

			{/* Mastered button */}
			{masteredCount > 0 && (
				<div className="w-full flex justify-center">
					<Button
						variant="outline"
						size="sm"
						onClick={onShowMastered}
						className="text-green-500 border-green-500/30 hover:bg-green-500/10"
					>
						<Trophy size={14} className="mr-2" />
						{masteredCount} Mastered
					</Button>
				</div>
			)}
		</>
	);
}

interface StudyHeaderProps {
	index: number;
	total: number;
	isShuffling?: boolean;
	compact?: boolean;
	onClose?: (e?: React.MouseEvent) => void;
	onBack?: (e?: React.MouseEvent) => void;
	onShuffle?: () => void;
	backLabel?: string;
}

export function StudyHeader({
	index,
	total,
	isShuffling,
	compact,
	onClose,
	onBack,
	onShuffle,
	backLabel = "Back to cards",
}: StudyHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			{onClose ? (
				<Button variant="ghost" size="sm" onClick={onClose}>
					<X size={16} className="mr-1" />
					Close
				</Button>
			) : onBack ? (
				<Button
					variant="ghost"
					size="sm"
					onClick={onBack}
					className={compact ? "text-xs px-2" : ""}
				>
					<ChevronLeft size={compact ? 14 : 16} className="mr-1" />
					{compact ? "Back" : backLabel}
				</Button>
			) : (
				<div className={compact ? "w-12" : "w-16"} />
			)}
			<span
				className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}
			>
				{index + 1} / {total}
			</span>
			{onShuffle ? (
				<Button
					variant="ghost"
					size="sm"
					onClick={onShuffle}
					disabled={isShuffling}
					className={compact ? "text-xs px-2" : ""}
				>
					<motion.div
						animate={isShuffling ? { rotate: 360 } : { rotate: 0 }}
						transition={{ duration: 0.3 }}
					>
						<Shuffle size={compact ? 14 : 16} />
					</motion.div>
				</Button>
			) : (
				<div className={compact ? "w-12" : "w-16"} />
			)}
		</div>
	);
}
