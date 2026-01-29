/**
 * Background Task Store
 * Replaces BackgroundTaskManager class
 * Uses Zustand for reactive state management
 */

import { createStore } from "@/lib/createStore";

// --- Types ---
export type TaskType = "extracting" | "generating" | "waitingConfig";
export type TaskStatus = "running" | "completed" | "failed" | "waiting";

export interface BackgroundTask {
	id: string;
	type: TaskType;
	status: TaskStatus;
	progress: number;
	extractedText?: string;
	cardCount?: number;
	coverId?: string;
	error?: string;
}

interface BackgroundTaskState {
	currentTask: BackgroundTask | null;
}

interface BackgroundTaskActions {
	// Task lifecycle
	startTask: (type: TaskType, cardCount?: number) => string;
	updateProgress: (progress: number) => void;
	setExtractedTextAndWait: (text: string) => void;
	requestConfig: () => void;
	startGeneration: (cardCount: number) => void;
	completeTask: (coverId?: string) => void;
	failTask: (error: string) => void;
	clearTask: () => void;

	// Callback registration
	setGenerateCallback: (
		cb: (text: string, count: number) => Promise<void>,
	) => void;
	onConfigRequest: (cb: () => void) => () => void;

	// Computed helpers
	getTask: () => BackgroundTask | null;
	isRunning: () => boolean;
	isWaitingConfig: () => boolean;
}

type Store = BackgroundTaskState & BackgroundTaskActions;

// Constants
const AUTO_GENERATE_DELAY = 5000; // 5 seconds
const DEFAULT_CARD_COUNT = 10;

// --- Module State (Non-reactive / Non-persistable) ---
// Timeouts and callbacks outside the store to avoid serialization issues
let autoGenerateTimeout: ReturnType<typeof setTimeout> | null = null;
let generateCallback: ((text: string, count: number) => Promise<void>) | null =
	null;
const configRequestListeners: Set<() => void> = new Set();

export const useBackgroundTaskStore = createStore<Store>(
	(set, get) => ({
		currentTask: null,

		setGenerateCallback: (cb) => {
			generateCallback = cb;
		},

		onConfigRequest: (cb) => {
			configRequestListeners.add(cb);
			return () => {
				configRequestListeners.delete(cb);
			};
		},

		getTask: () => get().currentTask,

		isRunning: () => get().currentTask?.status === "running",

		isWaitingConfig: () => {
			const task = get().currentTask;
			return task?.type === "waitingConfig" && task?.status === "waiting";
		},

		startTask: (type, cardCount) => {
			if (autoGenerateTimeout) {
				clearTimeout(autoGenerateTimeout);
				autoGenerateTimeout = null;
			}

			const id = `task-${Date.now()}`;
			set((state) => {
				state.currentTask = {
					id,
					type,
					status: "running",
					progress: 0,
					cardCount,
				};
			});
			return id;
		},

		updateProgress: (progress) => {
			set((state) => {
				if (state.currentTask) {
					state.currentTask.progress = progress;
				}
			});
		},

		setExtractedTextAndWait: (text) => {
			set((state) => {
				if (state.currentTask) {
					state.currentTask.extractedText = text;
					state.currentTask.type = "waitingConfig";
					state.currentTask.status = "waiting";
				}
			});

			// Handle the timeout logic
			if (autoGenerateTimeout) {
				clearTimeout(autoGenerateTimeout);
			}

			autoGenerateTimeout = setTimeout(async () => {
				const task = get().currentTask;
				if (!task || !task.extractedText) return;

				// Update state to generating
				set((state) => {
					if (state.currentTask) {
						state.currentTask.type = "generating";
						state.currentTask.status = "running";
						state.currentTask.cardCount = DEFAULT_CARD_COUNT;
						state.currentTask.progress = 0;
					}
				});

				// Execute callback
				if (generateCallback) {
					await generateCallback(task.extractedText, DEFAULT_CARD_COUNT);
				}
			}, AUTO_GENERATE_DELAY);
		},

		requestConfig: () => {
			if (autoGenerateTimeout) {
				clearTimeout(autoGenerateTimeout);
				autoGenerateTimeout = null;
			}
			// Notify config request listeners
			configRequestListeners.forEach((cb) => cb());
		},

		startGeneration: (cardCount) => {
			if (autoGenerateTimeout) {
				clearTimeout(autoGenerateTimeout);
				autoGenerateTimeout = null;
			}

			set((state) => {
				if (state.currentTask) {
					state.currentTask.type = "generating";
					state.currentTask.status = "running";
					state.currentTask.cardCount = cardCount;
					state.currentTask.progress = 0;
				}
			});
		},

		completeTask: (coverId) => {
			if (autoGenerateTimeout) {
				clearTimeout(autoGenerateTimeout);
				autoGenerateTimeout = null;
			}

			set((state) => {
				if (state.currentTask) {
					state.currentTask.status = "completed";
					state.currentTask.progress = 100;
					state.currentTask.coverId = coverId;
				}
			});

			// Clear after delay (increased for better UX - user sees 100%)
			setTimeout(() => {
				get().clearTask();
			}, 1000);
		},

		failTask: (error) => {
			if (autoGenerateTimeout) {
				clearTimeout(autoGenerateTimeout);
				autoGenerateTimeout = null;
			}

			set((state) => {
				if (state.currentTask) {
					state.currentTask.status = "failed";
					state.currentTask.error = error;
				}
			});

			// Give user time to read error
			setTimeout(() => {
				get().clearTask();
			}, 3000);
		},

		clearTask: () => {
			if (autoGenerateTimeout) {
				clearTimeout(autoGenerateTimeout);
				autoGenerateTimeout = null;
			}

			set((state) => {
				state.currentTask = null;
			});
		},
	}),
	{
		name: "background-task-store",
		skipPersist: true, // Timeouts are non-serializable
	},
);

// Legacy compatibility - singleton-like access for non-React code
export const backgroundTaskManager = {
	getTask: () => useBackgroundTaskStore.getState().getTask(),
	isRunning: () => useBackgroundTaskStore.getState().isRunning(),
	isWaitingConfig: () => useBackgroundTaskStore.getState().isWaitingConfig(),
	setGenerateCallback: (cb: (text: string, count: number) => Promise<void>) =>
		useBackgroundTaskStore.getState().setGenerateCallback(cb),
	onConfigRequest: (cb: () => void) =>
		useBackgroundTaskStore.getState().onConfigRequest(cb),
	startTask: (type: TaskType, cardCount?: number) =>
		useBackgroundTaskStore.getState().startTask(type, cardCount),
	updateProgress: (progress: number) =>
		useBackgroundTaskStore.getState().updateProgress(progress),
	setExtractedTextAndWait: (text: string) =>
		useBackgroundTaskStore.getState().setExtractedTextAndWait(text),
	requestConfig: () => useBackgroundTaskStore.getState().requestConfig(),
	startGeneration: (cardCount: number) =>
		useBackgroundTaskStore.getState().startGeneration(cardCount),
	completeTask: (coverId?: string) =>
		useBackgroundTaskStore.getState().completeTask(coverId),
	failTask: (error: string) =>
		useBackgroundTaskStore.getState().failTask(error),
	clearTask: () => useBackgroundTaskStore.getState().clearTask(),
	// Legacy subscribe - use Zustand's subscribe instead
	subscribe: (callback: (task: BackgroundTask | null) => void) => {
		// Immediately call with current state
		callback(useBackgroundTaskStore.getState().currentTask);
		// Subscribe to changes
		return useBackgroundTaskStore.subscribe((state) =>
			callback(state.currentTask),
		);
	},
};
