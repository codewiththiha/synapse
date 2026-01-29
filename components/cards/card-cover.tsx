/**
 * CardCover Component (Refactored)
 * Orchestrator component that manages state and delegates to child components
 *
 * Extracted:
 * - useCardExplanation hook: AI explanation logic
 * - StackedCardVisuals: Visual presentation
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { CardCover as CardCoverType, Flashcard } from "@/lib/types/flashcard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useFlashcardStore } from "@/stores/use-flashcard-store";
import { useGlobalStore } from "@/stores/use-global-store";
import { useMobile } from "@/hooks/use-mobile";
import { useCardExplanation } from "@/hooks/use-card-explanation";

import { ViewState, CARDS_PER_PAGE } from "./study/types";
import { StackedCardVisuals } from "./stacked-card-visuals";
import { MobileStudyCard } from "./study/mobile-study-card";
import { DesktopStudyCard } from "./study/desktop-study-card";
import { MasteredView } from "./study/mastered-view";
import { SpreadView } from "./study/spread-view";

interface CardCoverProps {
	cover: CardCoverType;
	cards?: Flashcard[];
	isSelected?: boolean;
	disabled?: boolean;
	onClick?: () => void;
	onDelete?: () => void;
	onRename?: () => void;
	onTogglePin?: () => void;
	onMoveToCollection?: () => void;
}

export function CardCover({
	cover,
	cards = [],
	isSelected,
	disabled,
	onClick,
	onDelete,
	onRename,
	onTogglePin,
	onMoveToCollection,
}: CardCoverProps) {
	const { toggleCardMastered } = useFlashcardStore();
	const { setStudyModeOpen } = useGlobalStore();
	const isMobile = useMobile();

	// View state
	const [viewState, setViewState] = React.useState<ViewState>("closed");
	const [previousViewState, setPreviousViewState] =
		React.useState<ViewState>("closed");
	const [isHovered, setIsHovered] = React.useState(false);

	// Navigation state
	const [currentPage, setCurrentPage] = React.useState(0);
	const [studyingCardIndex, setStudyingCardIndex] = React.useState(0);
	const [isFlipped, setIsFlipped] = React.useState(false);

	// Shuffle state
	const [shuffledOrder, setShuffledOrder] = React.useState<number[]>([]);
	const [isShuffling, setIsShuffling] = React.useState(false);

	// Computed card lists
	const activeCards = React.useMemo(() => {
		const unmastered = cards.filter((c) => !c.isMastered);
		if (shuffledOrder.length === 0) return unmastered;
		return shuffledOrder.map((i) => unmastered[i]).filter(Boolean);
	}, [cards, shuffledOrder]);

	const masteredCards = React.useMemo(
		() => cards.filter((c) => c.isMastered),
		[cards],
	);

	// Explanation hook
	const explanation = useCardExplanation({
		coverId: cover.id,
		activeCards,
		studyingCardIndex,
		setStudyingCardIndex,
		setIsFlipped,
	});

	// Derived values
	const totalPages = Math.ceil(activeCards.length / CARDS_PER_PAGE);
	const pageCards = activeCards.slice(
		currentPage * CARDS_PER_PAGE,
		(currentPage + 1) * CARDS_PER_PAGE,
	);
	const currentStudyCard = activeCards[studyingCardIndex];

	// Sync study mode state with global store
	React.useEffect(() => {
		setStudyModeOpen(viewState !== "closed");
		return () => setStudyModeOpen(false);
	}, [viewState, setStudyModeOpen]);

	// ESC key handler
	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (viewState === "mastered") {
					setViewState(
						previousViewState === "study" || previousViewState === "spread"
							? previousViewState
							: "closed",
					);
				} else if (viewState === "study") {
					if (isMobile) {
						setViewState("closed");
					} else {
						setCurrentPage(Math.floor(studyingCardIndex / CARDS_PER_PAGE));
						setViewState("spread");
					}
					explanation.reset();
				} else if (viewState === "spread") {
					setViewState("closed");
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [viewState, studyingCardIndex, previousViewState, isMobile, explanation]);

	// Handlers
	const handleCoverClick = () => {
		if (disabled) return;

		if (activeCards.length > 0) {
			if (isMobile) {
				setStudyingCardIndex(0);
				setViewState("study");
			} else {
				setViewState("spread");
				setCurrentPage(0);
			}
		} else if (masteredCards.length > 0) {
			handleGoToMastered();
		} else {
			onClick?.();
		}
	};

	const handleClose = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		setViewState("closed");
		setStudyingCardIndex(0);
		explanation.reset();
	};

	const handleGoToMastered = () => {
		setPreviousViewState(viewState);
		setViewState("mastered");
	};

	const handleBackFromMastered = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		setViewState(
			previousViewState === "study" || previousViewState === "spread"
				? previousViewState
				: "closed",
		);
	};

	const handleBackToSpread = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		setCurrentPage(Math.floor(studyingCardIndex / CARDS_PER_PAGE));
		setViewState("spread");
		explanation.reset();
	};

	const handleCardClick = (index: number, e: React.MouseEvent) => {
		e.stopPropagation();
		setStudyingCardIndex(currentPage * CARDS_PER_PAGE + index);
		setViewState("study");
		explanation.reset();
	};

	const handleShuffle = async () => {
		if (isShuffling) return;
		setIsShuffling(true);

		const indices = Array.from(
			{ length: cards.filter((c) => !c.isMastered).length },
			(_, i) => i,
		);
		for (let i = indices.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[indices[i], indices[j]] = [indices[j], indices[i]];
		}

		setShuffledOrder(indices);
		setStudyingCardIndex(0);
		setCurrentPage(0);
		explanation.reset();

		await new Promise((resolve) => setTimeout(resolve, 300));
		setIsShuffling(false);
	};

	const handleMarkEnough = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		const card = activeCards[studyingCardIndex];
		if (card) {
			toggleCardMastered(card.id);
			if (activeCards.length <= 1) {
				setViewState("closed");
			} else if (studyingCardIndex >= activeCards.length - 1) {
				setStudyingCardIndex(Math.max(0, studyingCardIndex - 1));
			}
			explanation.reset();
		}
	};

	const handleUnmaster = (cardId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		toggleCardMastered(cardId);
	};

	const handlePrevCard = () => {
		explanation.handleNavigationWithReturn("prev");
	};
	const handleNextCard = () => {
		explanation.handleNavigationWithReturn("next");
	};

	const handleSwipe = (info: PanInfo) => {
		if (explanation.isNavigationLocked) return;
		const threshold = 50;
		if (info.offset.x > threshold) handlePrevCard();
		else if (info.offset.x < -threshold) handleNextCard();
	};

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			if (viewState === "mastered") {
				handleBackFromMastered();
			} else if (viewState === "study") {
				if (isMobile) {
					handleClose();
				} else {
					handleBackToSpread();
				}
			} else {
				handleClose();
			}
		}
	};

	// Current explanation (only show if card matches)
	const currentExplanation =
		currentStudyCard &&
		explanation.pendingExplanation?.cardId === currentStudyCard.id
			? explanation.pendingExplanation.text
			: null;

	const isCurrentCardExplaining =
		explanation.isExplaining &&
		explanation.explainRequestCardId === currentStudyCard?.id;

	return (
		<>
			{/* Stacked Card Cover */}
			<StackedCardVisuals
				cover={cover}
				activeCardCount={activeCards.length}
				masteredCardCount={masteredCards.length}
				isSelected={isSelected}
				isHovered={isHovered}
				onClick={handleCoverClick}
				onHoverStart={() => setIsHovered(true)}
				onHoverEnd={() => setIsHovered(false)}
				onDelete={onDelete}
				onRename={onRename}
				onTogglePin={onTogglePin}
				onMoveToCollection={onMoveToCollection}
				onShowMastered={handleGoToMastered}
			/>

			{/* Expanded Views */}
			<AnimatePresence>
				{viewState !== "closed" && (
					<>
						{/* Backdrop */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl"
							onClick={handleBackdropClick}
						/>

						{/* Content container */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 z-50 flex flex-col pointer-events-none"
						>
							{/* Header */}
							<motion.div
								initial={{ opacity: 0, y: -20 }}
								animate={{ opacity: 1, y: 0 }}
								className="relative z-20 flex items-center justify-between p-2 md:p-4 border-b bg-background/50 gap-2 pointer-events-auto"
							>
								<div className="flex items-center gap-2 min-w-0 flex-1">
									<div className="min-w-0 flex-1">
										<h2 className="text-sm md:text-lg font-semibold truncate">
											{cover.name}
										</h2>
										<span
											className={cn(
												"text-xs md:text-sm",
												viewState === "mastered"
													? "text-green-500"
													: "text-muted-foreground",
											)}
										>
											{viewState === "mastered"
												? `${masteredCards.length} mastered`
												: `${activeCards.length} cards`}
										</span>
									</div>
								</div>
								<Button variant="outline" size="icon" onClick={handleClose}>
									<X size={18} />
								</Button>
							</motion.div>

							{/* Content */}
							<div className="relative z-10 flex-1 flex flex-col items-center justify-center overflow-hidden pointer-events-auto">
								{viewState === "mastered" ? (
									<MasteredView
										cards={masteredCards}
										isMobile={isMobile}
										previousViewState={previousViewState}
										onBack={handleBackFromMastered}
										onUnmaster={handleUnmaster}
									/>
								) : viewState === "spread" ? (
									<SpreadView
										cards={activeCards}
										pageCards={pageCards}
										currentPage={currentPage}
										totalPages={totalPages}
										totalCards={activeCards.length}
										masteredCount={masteredCards.length}
										isMobile={isMobile}
										onCardClick={handleCardClick}
										onPrevPage={(e) => {
											e?.stopPropagation();
											setCurrentPage((p) => Math.max(0, p - 1));
										}}
										onNextPage={(e) => {
											e?.stopPropagation();
											setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
										}}
										onShowMastered={handleGoToMastered}
									/>
								) : (
									currentStudyCard && (
										<div className="w-full max-w-md px-4">
											{isMobile ? (
												<MobileStudyCard
													card={currentStudyCard}
													index={studyingCardIndex}
													total={activeCards.length}
													isFlipped={isFlipped}
													explanation={currentExplanation}
													isExplaining={isCurrentCardExplaining}
													isLoadingExplanation={explanation.isExplaining}
													masteredCount={masteredCards.length}
													hasMemo={explanation.hasMemo()}
													isShuffling={isShuffling}
													hasReturnIndex={explanation.returnToIndex !== null}
													onFlip={() => setIsFlipped(!isFlipped)}
													onExplain={explanation.explain}
													onCancelExplain={explanation.cancelExplain}
													onSaveMemo={explanation.saveMemo}
													onEnough={handleMarkEnough}
													onSwipe={handleSwipe}
													onShuffle={
														activeCards.length > 1 ? handleShuffle : undefined
													}
													onPrev={
														studyingCardIndex > 0 &&
														!explanation.isNavigationLocked
															? handlePrevCard
															: undefined
													}
													onNext={
														studyingCardIndex < activeCards.length - 1 &&
														!explanation.isNavigationLocked
															? handleNextCard
															: undefined
													}
													onClose={handleClose}
													onShowMastered={handleGoToMastered}
												/>
											) : (
												<DesktopStudyCard
													card={currentStudyCard}
													index={studyingCardIndex}
													total={activeCards.length}
													isFlipped={isFlipped}
													explanation={currentExplanation}
													isExplaining={isCurrentCardExplaining}
													isLoadingExplanation={explanation.isExplaining}
													masteredCount={masteredCards.length}
													hasMemo={explanation.hasMemo()}
													isShuffling={isShuffling}
													hasReturnIndex={explanation.returnToIndex !== null}
													onFlip={() => setIsFlipped(!isFlipped)}
													onExplain={explanation.explain}
													onCancelExplain={explanation.cancelExplain}
													onSaveMemo={explanation.saveMemo}
													onEnough={handleMarkEnough}
													onBack={handleBackToSpread}
													onShuffle={
														activeCards.length > 1 ? handleShuffle : undefined
													}
													onPrev={
														studyingCardIndex > 0 &&
														!explanation.isNavigationLocked
															? handlePrevCard
															: undefined
													}
													onNext={
														studyingCardIndex < activeCards.length - 1 &&
														!explanation.isNavigationLocked
															? handleNextCard
															: undefined
													}
													onShowMastered={handleGoToMastered}
												/>
											)}
										</div>
									)
								)}
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	);
}
