/**
 * React Query key factory for consistent cache key management
 */
export const queryKeys = {
	all: ["sync"] as const,

	sessions: {
		all: () => [...queryKeys.all, "sessions"] as const,
		list: () => [...queryKeys.sessions.all(), "list"] as const,
		detail: (id: string) => [...queryKeys.sessions.all(), id] as const,
	},

	folders: () => [...queryKeys.all, "folders"] as const,

	flashcards: () => [...queryKeys.all, "flashcards"] as const,

	planner: () => [...queryKeys.all, "planner"] as const,
};
