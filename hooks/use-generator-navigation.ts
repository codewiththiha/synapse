"use client";

/**
 * useGeneratorNavigation Hook
 *
 * PURPOSE:
 * Manages all navigation state and UI flow for the card generator wizard.
 * Handles dialog open/close, step transitions, minimize/restore, and extraction indicator events.
 *
 * PARAMETERS:
 * None - uses internal state and subscriptions to services
 *
 * RETURNS:
 * STATE:
 * - isOpen: boolean - Whether the generator dialog is open
 * - inputMode: InputMode | null - Current input mode ('upload' | 'text' | null)
 * - step: GenerationStep - Current wizard step
 * - extractionState: ExtractionState | null - Current image extraction state
 * - isExtracting: boolean - Whether image extraction is in progress
 * - hasPendingExtraction: boolean - Whether there are extracted images waiting to be used
 * - showMinimizeOnly: boolean - Whether to show minimize button instead of close
 *
 * ACTIONS:
 * - setIsOpen: (open: boolean) => void - Control dialog visibility
 * - setInputMode: (mode: InputMode | null) => void - Switch between upload/text modes
 * - setStep: (step: GenerationStep) => void - Navigate to specific wizard step
 * - resetState: () => void - Reset to initial state
 * - handleClose: () => void - Close dialog with cleanup logic
 * - handleMinimize: () => void - Minimize dialog and save view state
 * - handleRestore: () => void - Restore dialog from minimized state
 * - handleFabClick: () => void - Handle FAB button click with smart state detection
 *
 * WHAT IT DOES:
 * 1. Manages dialog open/close state with minimize/restore persistence
 * 2. Tracks current step in the generation wizard (input → configure → generating → complete)
 * 3. Handles input mode selection (upload images vs text input)
 * 4. Subscribes to extraction indicator events from other routes
 * 5. Listens for background task manager config requests
 * 6. Determines when to show minimize vs close button
 * 7. Saves/restores view state when minimizing/restoring
 *
 * BENEFITS:
 * - Centralizes all navigation logic (no scattered setters across components)
 * - Handles complex state transitions (e.g., FAB click with multiple scenarios)
 * - Persists view state across minimize/restore cycles
 * - Integrates with extraction indicator for cross-route awareness
 * - Prevents accidental dialog closure during active operations
 * - Type-safe step and mode enums
 *
 * USAGE EXAMPLE:
 * const navigation = useGeneratorNavigation();
 * // In component:
 * <Dialog open={navigation.isOpen} onOpenChange={navigation.setIsOpen}>
 *   {navigation.step === 'input' && <StepInput />}
 *   {navigation.step === 'configure' && <StepConfigure />}
 * </Dialog>
 */

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useBackgroundTaskStore } from "@/stores/use-background-task-store";
import { useFlashcardStore } from "@/stores/use-flashcard-store";
import {
	imageExtractionService,
	ExtractionState,
} from "@/lib/services/image-extraction";
import {
	extractionIndicatorEvents,
	ExtractionIndicatorEvent,
} from "@/components/cards/extraction-indicator";
import {
	generationIndicatorEvents,
	GenerationIndicatorEvent,
} from "@/components/cards/generation-indicator";

export type InputMode = "upload" | "text";
export type GenerationStep =
	| "input"
	| "pending-choice"
	| "configure"
	| "generating"
	| "complete";

interface ViewState {
	inputMode: InputMode | null;
	step: GenerationStep;
}

export function useGeneratorNavigation() {
	const router = useRouter();
	const pathname = usePathname();

	const [isOpen, setIsOpen] = React.useState(false);
	const [inputMode, setInputMode] = React.useState<InputMode | null>(null);
	const [step, setStep] = React.useState<GenerationStep>("input");
	const [extractionState, setExtractionState] =
		React.useState<ExtractionState | null>(null);

	const viewStateRef = React.useRef<ViewState | null>(null);

	// Subscribe to extraction state
	React.useEffect(() => {
		const unsubscribe = imageExtractionService.subscribeState((state) => {
			setExtractionState(state);
		});
		return unsubscribe;
	}, []);

	// Listen for extraction indicator events (from other routes)
	React.useEffect(() => {
		const unsubscribe = extractionIndicatorEvents.subscribe(
			(event: ExtractionIndicatorEvent) => {
				// Check if generation is in progress from either source
				const backgroundTask = useBackgroundTaskStore.getState().currentTask;
				const storeIsGenerating = useFlashcardStore.getState().isGenerating;
				const isCurrentlyGenerating =
					storeIsGenerating ||
					(backgroundTask?.type === "generating" &&
						backgroundTask?.status === "running");

				if (isCurrentlyGenerating) {
					setStep("generating");
					setIsOpen(true);
					return;
				}

				const isCurrentlyExtracting = imageExtractionService.isExtracting();
				const hasCurrentTasks = imageExtractionService.getTasks().length > 0;

				if (isCurrentlyExtracting || hasCurrentTasks) {
					setInputMode("upload");
					setStep("input");
					setIsOpen(true);
					return;
				}

				switch (event.viewMode) {
					case "status":
					case "upload":
						setInputMode("upload");
						setStep("input");
						break;
					case "pending-choice":
						setInputMode(null);
						setStep("pending-choice");
						break;
				}
				setIsOpen(true);
			},
		);
		return unsubscribe;
	}, []);

	// Listen for config requests from background task manager
	const onConfigRequest = useBackgroundTaskStore(
		(state) => state.onConfigRequest,
	);
	React.useEffect(() => {
		const unsubscribe = onConfigRequest(() => {
			if (!pathname.startsWith("/cards")) {
				router.push("/cards");
			}
			setStep("configure");
			setIsOpen(true);
		});
		return unsubscribe;
	}, [pathname, router, onConfigRequest]);

	// Listen for generation indicator events (from other routes)
	React.useEffect(() => {
		const unsubscribe = generationIndicatorEvents.subscribe(
			(_event: GenerationIndicatorEvent) => {
				setStep("generating");
				setIsOpen(true);
			},
		);
		return unsubscribe;
	}, []);

	const resetState = React.useCallback(() => {
		setInputMode(null);
		setStep("input");
	}, []);

	const handleClose = React.useCallback(() => {
		const task = useBackgroundTaskStore.getState().currentTask;
		const isExtractionActive = imageExtractionService.isExtracting();
		const hasTasks = imageExtractionService.getTasks().length > 0;

		if (!isExtractionActive && !hasTasks) {
			if (!task || task.status === "completed" || task.status === "failed") {
				imageExtractionService.clearTasks();
			}
		}
		setIsOpen(false);
	}, []);

	const handleMinimize = React.useCallback(() => {
		viewStateRef.current = { inputMode, step };
		setIsOpen(false);
	}, [inputMode, step]);

	const handleRestore = React.useCallback(() => {
		setIsOpen(true);

		// Check if generation is in progress from either source
		// - backgroundTask: generation triggered from image extraction flow
		// - flashcardStore: generation triggered from @card command in chat
		const backgroundTask = useBackgroundTaskStore.getState().currentTask;
		const storeIsGenerating = useFlashcardStore.getState().isGenerating;
		const isCurrentlyGenerating =
			storeIsGenerating ||
			(backgroundTask?.type === "generating" &&
				backgroundTask?.status === "running");

		if (isCurrentlyGenerating) {
			setStep("generating");
			viewStateRef.current = null;
			return;
		}

		const isCurrentlyExtracting = imageExtractionService.isExtracting();
		const hasCurrentTasks = imageExtractionService.getTasks().length > 0;

		if (isCurrentlyExtracting || hasCurrentTasks) {
			setInputMode("upload");
			setStep("input");
			viewStateRef.current = null;
			return;
		}

		if (viewStateRef.current) {
			setInputMode(viewStateRef.current.inputMode);
			setStep(viewStateRef.current.step);
			viewStateRef.current = null;
		}
	}, []);

	const handleFabClick = React.useCallback(() => {
		// Check if generation is in progress from either source
		// - backgroundTask: generation triggered from image extraction flow
		// - flashcardStore: generation triggered from @card command in chat
		const backgroundTask = useBackgroundTaskStore.getState().currentTask;
		const storeIsGenerating = useFlashcardStore.getState().isGenerating;
		const isCurrentlyGenerating =
			storeIsGenerating ||
			(backgroundTask?.type === "generating" &&
				backgroundTask?.status === "running");

		if (isCurrentlyGenerating) {
			setStep("generating");
			setIsOpen(true);
			return;
		}

		const isCurrentlyExtracting = imageExtractionService.isExtracting();
		const hasCurrentTasks = imageExtractionService.getTasks().length > 0;

		if (isCurrentlyExtracting || hasCurrentTasks) {
			if (viewStateRef.current) {
				setInputMode(viewStateRef.current.inputMode);
				setStep(viewStateRef.current.step);
				viewStateRef.current = null;
			} else {
				setInputMode("upload");
				setStep("input");
			}
		} else if (imageExtractionService.hasPendingExtraction()) {
			setInputMode(null);
			setStep("pending-choice");
		} else {
			setInputMode(null);
			setStep("input");
		}
		setIsOpen(true);
	}, []);

	const isExtracting = extractionState?.isExtracting || false;
	const hasPendingExtraction = imageExtractionService.hasPendingExtraction();
	const showMinimizeOnly =
		isExtracting || step === "generating" || step === "pending-choice";

	return {
		// State
		isOpen,
		inputMode,
		step,
		extractionState,
		isExtracting,
		hasPendingExtraction,
		showMinimizeOnly,

		// Setters
		setIsOpen,
		setInputMode,
		setStep,

		// Actions
		resetState,
		handleClose,
		handleMinimize,
		handleRestore,
		handleFabClick,
	};
}
