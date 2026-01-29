"use client";

/**
 * useCardGeneration Hook
 *
 * PURPOSE:
 * Encapsulates all flashcard generation logic, separating business logic from UI components.
 * Handles AI-powered card generation, store updates, background task management, and error handling.
 *
 * PARAMETERS:
 * - options.onComplete?: (coverId: string) => void
 *   Callback fired when generation completes successfully with the created cover ID
 * - options.onGenerationStart?: () => void
 *   Callback fired when generation begins (useful for UI state transitions)
 * - options.onGenerationEnd?: (success: boolean) => void
 *   Callback fired when generation ends (success or failure)
 *
 * RETURNS:
 * - extractedText: string - The text to be used for card generation
 * - setExtractedText: (text: string) => void - Updates the extracted text
 * - startGeneration: (count: number) => void - Initiates card generation with specified count
 * - runGeneration: (text: string, count: number) => Promise<void> - Core generation function
 * - isGenerating: boolean - Whether generation is currently in progress
 * - generationProgress: number - Progress percentage (0-100)
 * - backgroundTask: BackgroundTask | null - Current background task state
 *
 * WHAT IT DOES:
 * 1. Manages extracted text state for card generation
 * 2. Calls flashcardAI service to generate cover name and cards
 * 3. Updates Zustand store with generated cards and covers
 * 4. Tracks generation progress and updates background task manager
 * 5. Handles errors with user-friendly toast notifications
 * 6. Cleans up extraction service state on successful generation
 * 7. Registers generation callback with background task manager
 *
 * BENEFITS:
 * - Decouples generation logic from UI components (single responsibility)
 * - Reusable across different UI implementations
 * - Handles all side effects (store updates, toasts, cleanup) in one place
 * - Provides progress tracking for long-running operations
 * - Integrates with background task manager for cross-route state persistence
 * - Type-safe with TypeScript interfaces
 *
 * USAGE EXAMPLE:
 * const { extractedText, setExtractedText, startGeneration, isGenerating } = useCardGeneration({
 *   onComplete: (coverId) => console.log('Cards created:', coverId),
 *   onGenerationEnd: (success) => console.log('Generation', success ? 'succeeded' : 'failed')
 * });
 */

import * as React from "react";
import { flashcardAI } from "@/lib/services/flashcard-ai";
import { useSettingsStore } from "@/stores/use-settings-store";
import {
	useBackgroundTaskStore,
	backgroundTaskManager,
} from "@/stores/use-background-task-store";
import { imageExtractionService } from "@/lib/services/image-extraction";
import { useFlashcardStore } from "@/stores/use-flashcard-store";
import { toast } from "@/stores/use-global-store";
import { Flashcard, CardCover } from "@/lib/types/flashcard";
import { getPuterErrorMessage } from "@/lib/utils/puter-helpers";

interface UseCardGenerationOptions {
	onComplete?: (coverId: string) => void;
	onGenerationStart?: () => void;
	onGenerationEnd?: (success: boolean) => void;
}

export function useCardGeneration(options: UseCardGenerationOptions = {}) {
	const { onComplete, onGenerationStart, onGenerationEnd } = options;
	const onCompleteRef = React.useRef(onComplete);

	React.useEffect(() => {
		onCompleteRef.current = onComplete;
	}, [onComplete]);

	const [extractedText, setExtractedText] = React.useState("");

	// Use Zustand store for background task (reactive)
	const backgroundTask = useBackgroundTaskStore((state) => state.currentTask);

	const {
		addCover,
		addCards,
		setGenerating,
		setGenerationProgress,
		generationProgress,
		isGenerating: storeIsGenerating,
	} = useFlashcardStore();

	// Generation function (returns void to match backgroundTaskManager callback type)
	const runGeneration = React.useCallback(
		async (text: string, count: number): Promise<void> => {
			setGenerating(true);
			setGenerationProgress(0);
			onGenerationStart?.();

			const { cardLanguage } = useSettingsStore.getState().settings;

			try {
				const coverName = await flashcardAI.generateCoverName(text);
				const coverId = `cover-${Date.now()}`;
				const cover: CardCover = {
					id: coverId,
					name: coverName,
					cardCount: 0,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				};
				addCover(cover);

				const generatedCards = await flashcardAI.generateCards(
					text,
					count,
					(progress) => {
						setGenerationProgress(progress);
						backgroundTaskManager.updateProgress(progress);
					},
					cardLanguage || "en",
				);

				const flashcards: Flashcard[] = generatedCards.map((card, index) => ({
					id: `card-${Date.now()}-${index}`,
					question: card.q,
					answer: card.a,
					createdAt: Date.now(),
					coverId,
				}));

				addCards(flashcards);
				backgroundTaskManager.completeTask(coverId);

				// Only reset persisted state on SUCCESS
				imageExtractionService.resetPersistedState();
				imageExtractionService.clearTasks();

				toast({
					title: "Cards Generated!",
					description: `Created ${flashcards.length} flashcards in "${coverName}".`,
					action: {
						label: "View Cards",
						onClick: () => {
							window.location.href = `/cards?cover=${coverId}`;
						},
					},
					duration: 5000,
				});

				onCompleteRef.current?.(coverId);
				onGenerationEnd?.(true);
			} catch (error) {
				console.error("Generation error:", error);
				const errorMessage = getPuterErrorMessage(error);
				backgroundTaskManager.failTask(errorMessage);
				toast({
					title: "Generation Failed",
					description: errorMessage,
					variant: "destructive",
				});
				onGenerationEnd?.(false);
			} finally {
				setGenerating(false);
			}
		},
		[
			addCover,
			addCards,
			setGenerating,
			setGenerationProgress,
			onGenerationStart,
			onGenerationEnd,
		],
	);

	// Register callback with background task manager
	React.useEffect(() => {
		backgroundTaskManager.setGenerateCallback(runGeneration);
	}, [runGeneration]);

	const startGeneration = React.useCallback(
		(count: number) => {
			if (!extractedText) return;
			backgroundTaskManager.startGeneration(count);
			runGeneration(extractedText, count);
		},
		[extractedText, runGeneration],
	);

	const isGenerating =
		storeIsGenerating ||
		(backgroundTask?.type === "generating" &&
			backgroundTask?.status === "running");

	return {
		extractedText,
		setExtractedText,
		startGeneration,
		runGeneration,
		isGenerating,
		generationProgress,
		backgroundTask,
	};
}
