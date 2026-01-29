/**
 * Unified Concurrency Store
 * Replaces ConcurrentChatManager, ConcurrentSummarizationManager
 * Uses Zustand for reactive state management
 */

import { createStore } from "@/lib/createStore";

type Scope = "chat" | "summarization" | "background";

// Define limits as constants so they're used consistently
export const MAX_CONCURRENT_CHATS = 5;
export const MAX_CONCURRENT_SUMMARIZATION = 5;
export const MAX_CONCURRENT_BACKGROUND = 3;

interface ConcurrencyState {
	// Track active task IDs per scope (reactive for UI)
	activeTasks: Record<Scope, string[]>;
	limits: Record<Scope, number>;
}

interface ConcurrencyActions {
	startTask: (scope: Scope, id: string) => AbortController | null;
	endTask: (scope: Scope, id: string) => void;
	cancelTask: (scope: Scope, id: string) => void;
	cancelAllTasks: (scope: Scope) => void;
	canStart: (scope: Scope) => boolean;
	isActive: (scope: Scope, id: string) => boolean;
	getActiveCount: (scope: Scope) => number;
	getActiveIds: (scope: Scope) => string[];
}

type Store = ConcurrencyState & ConcurrencyActions;

// Module-level cache for AbortControllers (non-serializable, kept outside store)
const controllers = new Map<string, AbortController>();

// Helper key generator
const getKey = (scope: string, id: string) => `${scope}:${id}`;

export const useConcurrencyStore = createStore<Store>(
	(set, get) => ({
		activeTasks: {
			chat: [],
			summarization: [],
			background: [],
		},
		limits: {
			chat: MAX_CONCURRENT_CHATS,
			summarization: MAX_CONCURRENT_SUMMARIZATION,
			background: MAX_CONCURRENT_BACKGROUND,
		},

		canStart: (scope) => {
			const state = get();
			return state.activeTasks[scope].length < state.limits[scope];
		},

		isActive: (scope, id) => {
			return get().activeTasks[scope].includes(id);
		},

		getActiveCount: (scope) => {
			return get().activeTasks[scope].length;
		},

		getActiveIds: (scope) => {
			return [...get().activeTasks[scope]];
		},

		startTask: (scope, id) => {
			const state = get();
			const key = getKey(scope, id);

			// Return existing if already active
			if (controllers.has(key)) {
				return controllers.get(key)!;
			}

			// Check limits
			if (state.activeTasks[scope].length >= state.limits[scope]) {
				return null;
			}

			// Create controller
			const controller = new AbortController();
			controllers.set(key, controller);

			// Update state
			set((state) => {
				state.activeTasks[scope].push(id);
			});

			return controller;
		},

		endTask: (scope, id) => {
			const key = getKey(scope, id);
			controllers.delete(key);

			set((state) => {
				state.activeTasks[scope] = state.activeTasks[scope].filter(
					(tid) => tid !== id,
				);
			});
		},

		cancelTask: (scope, id) => {
			const key = getKey(scope, id);
			const controller = controllers.get(key);

			if (controller) {
				controller.abort();
				controllers.delete(key);
			}

			set((state) => {
				state.activeTasks[scope] = state.activeTasks[scope].filter(
					(tid) => tid !== id,
				);
			});
		},

		cancelAllTasks: (scope) => {
			const state = get();
			const ids = state.activeTasks[scope];

			// Abort all controllers for this scope
			ids.forEach((id) => {
				const key = getKey(scope, id);
				const controller = controllers.get(key);
				if (controller) {
					controller.abort();
					controllers.delete(key);
				}
			});

			set((state) => {
				state.activeTasks[scope] = [];
			});
		},
	}),
	{
		name: "concurrency-store",
		skipPersist: true, // AbortControllers are non-serializable
	},
);
