"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { MobileStudyCardProps } from "./types";
import { FlipCard } from "./flip-card";
import { ExplanationPanel } from "./explanation-panel";
import { StudyControls, StudyHeader } from "./study-controls";

export function MobileStudyCard({
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
	onSwipe,
	onShuffle,
	onPrev,
	onNext,
	onClose,
	onShowMastered,
}: MobileStudyCardProps) {
	const x = useMotionValue(0);
	const rotate = useTransform(x, [-200, 200], [-15, 15]);
	const opacity = useTransform(
		x,
		[-200, -100, 0, 100, 200],
		[0.5, 1, 1, 1, 0.5],
	);

	const hasExplanation = !!explanation;

	return (
		<motion.div className="space-y-3">
			<StudyHeader
				index={index}
				total={total}
				isShuffling={isShuffling}
				onClose={onClose}
				onShuffle={onShuffle}
			/>

			{/* Animated container for smooth height transition */}
			<motion.div
				className="relative"
				animate={{
					aspectRatio: hasExplanation ? 4 / 3 : 3 / 4,
				}}
				transition={{
					aspectRatio: {
						type: "spring",
						stiffness: 300,
						damping: 30,
					},
				}}
			>
				{/* Swipeable card - separate from layout animation */}
				<motion.div
					className="absolute inset-0"
					style={{ x, rotate, opacity }}
					drag="x"
					dragConstraints={{ left: 0, right: 0 }}
					dragElastic={0.7}
					onDragEnd={(_, info) => {
						onSwipe(info);
						x.set(0);
					}}
				>
					<FlipCard
						card={card}
						isFlipped={isFlipped}
						compact={hasExplanation}
						onClick={onFlip}
					/>
				</motion.div>
			</motion.div>

			<StudyControls
				index={index}
				total={total}
				masteredCount={masteredCount}
				isExplaining={isExplaining}
				isLoadingExplanation={isLoadingExplanation}
				isShuffling={isShuffling}
				compact={hasExplanation}
				onExplain={onExplain}
				onCancelExplain={onCancelExplain}
				onEnough={onEnough}
				onShuffle={onShuffle}
				onPrev={onPrev}
				onNext={onNext}
				onShowMastered={onShowMastered}
			/>

			<ExplanationPanel
				explanation={explanation}
				hasMemo={hasMemo}
				hasReturnIndex={hasReturnIndex}
				onSaveMemo={onSaveMemo}
				variant="mobile"
			/>
		</motion.div>
	);
}
