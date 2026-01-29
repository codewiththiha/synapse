/**
 * Store Selectors
 * Memoized selectors to prevent unnecessary re-renders
 *
 * Usage:
 * const sortedCovers = useFlashcardStore(selectSortedCovers);
 */

import { CardCover, CardCollection } from "@/lib/types/flashcard";

// Flashcard Store Selectors

interface FlashcardState {
	covers: CardCover[];
	collections: CardCollection[];
}

/**
 * Select standalone covers (not in any collection), sorted by pin status and update time
 */
export const selectSortedStandaloneCovers = (
	state: FlashcardState,
): CardCover[] => {
	return [...state.covers]
		.filter((c) => !c.collectionId)
		.sort((a, b) => {
			if (a.isPinned && !b.isPinned) return -1;
			if (!a.isPinned && b.isPinned) return 1;
			return b.updatedAt - a.updatedAt;
		});
};

/**
 * Select all collections, sorted by pin status and update time
 */
export const selectSortedCollections = (
	state: FlashcardState,
): CardCollection[] => {
	return [...state.collections].sort((a, b) => {
		if (a.isPinned && !b.isPinned) return -1;
		if (!a.isPinned && b.isPinned) return 1;
		return b.updatedAt - a.updatedAt;
	});
};

/**
 * Select covers by collection ID
 */
export const selectCoversByCollection = (
	state: FlashcardState,
	collectionId: string,
): CardCover[] => {
	return state.covers.filter((c) => c.collectionId === collectionId);
};

/**
 * Check if there's any content (covers or collections)
 */
export const selectHasContent = (state: FlashcardState): boolean => {
	return state.covers.length > 0 || state.collections.length > 0;
};

/**
 * Select unorganized covers (not in any collection)
 */
export const selectUnorganizedCovers = (state: FlashcardState): CardCover[] => {
	return state.covers.filter((c) => !c.collectionId);
};

// Sessions Store Selectors

/**
 * Get sessions by type
 */
export const selectSessionsByType = <T extends { type: string }>(
	sessions: T[],
	type: string,
): T[] => {
	return sessions.filter((s) => s.type === type);
};

/**
 * Get folders by type
 */
export const selectFoldersByType = <T extends { type: string }>(
	folders: T[],
	type: string,
): T[] => {
	return folders.filter((f) => f.type === type);
};
