/**
 * useCardExplanation Hook
 * Handles all AI explanation complexity for flashcard study mode
 *
 * Features:
 * - Abort controller management for cancellation
 * - Navigation locking during explanation
 * - Return-to-index tracking when user navigates away
 * - Memo save functionality
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { flashcardAI } from "@/lib/services/flashcard-ai";
import { useFlashcardStore } from "@/stores/use-flashcard-store";
import { useSettingsStore } from "@/stores/use-settings-store";
import { Flashcard, CardMemo } from "@/lib/types/flashcard";

interface PendingExplanation {
	cardId: string;
	cardIndex: number;
	text: string;
}

interface UseCardExplanationOptions {
	coverId: string;
	activeCards: Flashcard[];
	studyingCardIndex: number;
	setStudyingCardIndex: (index: number) => void;
	setIsFlipped: (flipped: boolean) => void;
}

interface UseCardExplanationReturn {
	/** Current pending explanation */
	pendingExplanation: PendingExplanation | null;
	/** Whether an explanation is being fetched */
	isExplaining: boolean;
	/** ID of card being explained */
	explainRequestCardId: string | null;
	/** Index to return to after viewing explanation */
	returnToIndex: number | null;
	/** Whether navigation is temporarily locked */
	isNavigationLocked: boolean;
	/** Request explanation for current card */
	explain: () => Promise<void>;
	/** Cancel ongoing explanation request */
	cancelExplain: () => void;
	/** Save current explanation as memo */
	saveMemo: () => void;
	/** Check if current card has a memo */
	hasMemo: () => boolean;
	/** Reset all explanation state */
	reset: () => void;
	/** Handle navigation with return-to-index support */
	handleNavigationWithReturn: (direction: "prev" | "next") => boolean;
}

export function useCardExplanation({
	coverId,
	activeCards,
	studyingCardIndex,
	setStudyingCardIndex,
	setIsFlipped,
}: UseCardExplanationOptions): UseCardExplanationReturn {
	const { addMemo, getMemoByCard } = useFlashcardStore();

	const [pendingExplanation, setPendingExplanation] =
		useState<PendingExplanation | null>(null);
	const [isExplaining, setIsExplaining] = useState(false);
	const [explainRequestCardId, setExplainRequestCardId] = useState<
		string | null
	>(null);
	const [returnToIndex, setReturnToIndex] = useState<number | null>(null);
	const [isNavigationLocked, setIsNavigationLocked] = useState(false);

	// AbortController for cancelling explain requests
	const abortControllerRef = useRef<AbortController | null>(null);

	// Ref to track current card index for async operations
	const studyingCardIndexRef = useRef(studyingCardIndex);
	useEffect(() => {
		studyingCardIndexRef.current = studyingCardIndex;
	}, [studyingCardIndex]);

	const currentCard = activeCards[studyingCardIndex];

	const reset = useCallback(() => {
		setPendingExplanation(null);
		setReturnToIndex(null);
		setIsFlipped(false);
	}, [setIsFlipped]);

	const cancelExplain = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
		setIsExplaining(false);
		setExplainRequestCardId(null);
	}, []);

	const explain = useCallback(async () => {
		if (!currentCard || isExplaining) return;

		// Cancel any existing request
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		// Create new AbortController
		const abortController = new AbortController();
		abortControllerRef.current = abortController;

		const requestedCardId = currentCard.id;
		const requestedIndex = studyingCardIndex;
		setExplainRequestCardId(requestedCardId);
		setIsExplaining(true);

		// Get language setting
		const { explainLanguage } = useSettingsStore.getState().settings;

		try {
			const result = await flashcardAI.explainCard(
				currentCard.question,
				currentCard.answer,
				explainLanguage || "en",
				abortController.signal,
			);

			// Check if user navigated away during request
			const currentIndexAtCompletion = studyingCardIndexRef.current;
			const userNavigatedAway = currentIndexAtCompletion !== requestedIndex;

			if (userNavigatedAway) {
				// Store return index and navigate back to explained card
				setReturnToIndex(currentIndexAtCompletion);
				setStudyingCardIndex(requestedIndex);
			}

			// Set the explanation
			setPendingExplanation({
				cardId: requestedCardId,
				cardIndex: requestedIndex,
				text: result,
			});

			// Reset flip state to show question side with explanation
			setIsFlipped(false);

			// Lock navigation briefly to prevent accidental swipe
			setIsNavigationLocked(true);
			setTimeout(() => {
				setIsNavigationLocked(false);
			}, 800);
		} catch (error) {
			// Only log if not aborted
			if (!(error instanceof DOMException && error.name === "AbortError")) {
				console.error("Explain error:", error);
			}
		} finally {
			// Only reset state if this is still the current request
			if (abortControllerRef.current === abortController) {
				setIsExplaining(false);
				setExplainRequestCardId(null);
				abortControllerRef.current = null;
			}
		}
	}, [
		currentCard,
		isExplaining,
		studyingCardIndex,
		setStudyingCardIndex,
		setIsFlipped,
	]);

	const saveMemo = useCallback(() => {
		if (!currentCard || !pendingExplanation) return;

		const memo: CardMemo = {
			id: `memo-${Date.now()}`,
			cardId: currentCard.id,
			coverId,
			question: currentCard.question,
			answer: currentCard.answer,
			explanation: pendingExplanation.text,
			createdAt: Date.now(),
		};
		addMemo(memo);
	}, [currentCard, pendingExplanation, coverId, addMemo]);

	const hasMemo = useCallback(() => {
		return currentCard ? !!getMemoByCard(currentCard.id) : false;
	}, [currentCard, getMemoByCard]);

	const handleNavigationWithReturn = useCallback(
		(direction: "prev" | "next"): boolean => {
			if (isNavigationLocked) return false;

			// If there's a pending explanation with return index, go back to where user was
			if (pendingExplanation && returnToIndex !== null) {
				setStudyingCardIndex(returnToIndex);
				setReturnToIndex(null);
				setPendingExplanation(null);
				setIsFlipped(false);
				return true;
			}

			// Normal navigation
			if (direction === "prev" && studyingCardIndex > 0) {
				setStudyingCardIndex(studyingCardIndex - 1);
				setIsFlipped(false);
				setPendingExplanation(null);
				return true;
			}

			if (direction === "next" && studyingCardIndex < activeCards.length - 1) {
				setStudyingCardIndex(studyingCardIndex + 1);
				setIsFlipped(false);
				setPendingExplanation(null);
				return true;
			}

			return false;
		},
		[
			isNavigationLocked,
			pendingExplanation,
			returnToIndex,
			studyingCardIndex,
			activeCards.length,
			setStudyingCardIndex,
			setIsFlipped,
		],
	);

	return {
		pendingExplanation,
		isExplaining,
		explainRequestCardId,
		returnToIndex,
		isNavigationLocked,
		explain,
		cancelExplain,
		saveMemo,
		hasMemo,
		reset,
		handleNavigationWithReturn,
	};
}
