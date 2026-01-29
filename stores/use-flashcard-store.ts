import { createStore } from "@/lib/createStore";
import {
	Flashcard,
	CardCover,
	CardCollection,
	CardMemo,
} from "@/lib/types/flashcard";

// NOTE: Deleted IDs tracking removed - using immediate cloud deletion instead
// The PuterSyncProvider now handles deletions via store subscription

type State = {
	cards: Flashcard[];
	covers: CardCover[];
	collections: CardCollection[];
	memos: CardMemo[];
	currentCoverId: string | null;
	currentCollectionId: string | null;
	isGenerating: boolean;
	generationProgress: number;
	isOrganizing: boolean;
	isInitialized: boolean;
};

type Actions = {
	// Initialization
	initializeFlashcards: () => void;

	// Cards
	addCards: (cards: Flashcard[]) => void;
	deleteCard: (cardId: string) => void;
	getCardsByCover: (coverId: string) => Flashcard[];
	toggleCardMastered: (cardId: string) => void;
	isCardMastered: (cardId: string) => boolean;

	// Covers
	addCover: (cover: CardCover) => void;
	updateCover: (coverId: string, updates: Partial<CardCover>) => void;
	deleteCover: (coverId: string) => void;
	selectCover: (coverId: string | null) => void;
	togglePinCover: (coverId: string) => void;
	moveCoverToCollection: (coverId: string, collectionId: string | null) => void;

	// Collections
	addCollection: (collection: CardCollection) => void;
	updateCollection: (
		collectionId: string,
		updates: Partial<CardCollection>,
	) => void;
	deleteCollection: (collectionId: string) => void;
	selectCollection: (collectionId: string | null) => void;
	togglePinCollection: (collectionId: string) => void;
	renameCollection: (collectionId: string, newName: string) => boolean;
	createCollectionFromCovers: (
		coverId1: string,
		coverId2: string,
		collectionName: string,
	) => CardCollection | null;

	// Memos
	addMemo: (memo: CardMemo) => void;
	deleteMemo: (memoId: string) => void;
	getMemoByCard: (cardId: string) => CardMemo | undefined;
	getMemosByCover: (coverId: string) => CardMemo[];
	getAllMemos: () => CardMemo[];

	// Generation state
	setGenerating: (isGenerating: boolean) => void;
	setGenerationProgress: (progress: number) => void;
	setOrganizing: (isOrganizing: boolean) => void;

	// Bulk operations
	clearAllCards: () => void;
};

type Store = State & Actions;

const useFlashcardStore = createStore<Store>(
	(set, get) => ({
		cards: [],
		covers: [],
		collections: [],
		memos: [],
		currentCoverId: null,
		currentCollectionId: null,
		isGenerating: false,
		generationProgress: 0,
		isOrganizing: false,
		isInitialized: false,

		initializeFlashcards: () => {
			set((state) => {
				state.isInitialized = true;
			});
		},

		// Cards
		addCards: (cards) =>
			set((state) => {
				state.cards.push(...cards);
				// Update cover card count
				const coverIds = [...new Set(cards.map((c) => c.coverId))];
				for (const coverId of coverIds) {
					const cover = state.covers.find((c) => c.id === coverId);
					if (cover) {
						cover.cardCount = state.cards.filter(
							(c) => c.coverId === coverId,
						).length;
						cover.updatedAt = Date.now();
					}
				}
			}),

		deleteCard: (cardId) =>
			set((state) => {
				const card = state.cards.find((c) => c.id === cardId);
				if (card) {
					state.cards = state.cards.filter((c) => c.id !== cardId);
					// Update cover card count
					const cover = state.covers.find((c) => c.id === card.coverId);
					if (cover) {
						cover.cardCount = state.cards.filter(
							(c) => c.coverId === card.coverId,
						).length;
						cover.updatedAt = Date.now();
					}
					// Delete associated memo
					state.memos = state.memos.filter((m) => m.cardId !== cardId);
				}
			}),

		getCardsByCover: (coverId) => {
			return get().cards.filter((c) => c.coverId === coverId);
		},

		toggleCardMastered: (cardId) =>
			set((state) => {
				const card = state.cards.find((c) => c.id === cardId);
				if (card) {
					card.isMastered = !card.isMastered;
				}
			}),

		isCardMastered: (cardId) => {
			const card = get().cards.find((c) => c.id === cardId);
			return card?.isMastered ?? false;
		},

		// Covers
		addCover: (cover) =>
			set((state) => {
				state.covers.push(cover);
				// Update collection cover count if in collection
				if (cover.collectionId) {
					const collection = state.collections.find(
						(c) => c.id === cover.collectionId,
					);
					if (collection) {
						collection.coverCount = state.covers.filter(
							(c) => c.collectionId === cover.collectionId,
						).length;
						collection.updatedAt = Date.now();
					}
				}
			}),

		updateCover: (coverId, updates) =>
			set((state) => {
				const cover = state.covers.find((c) => c.id === coverId);
				if (cover) {
					Object.assign(cover, updates, { updatedAt: Date.now() });
				}
			}),

		deleteCover: (coverId) => {
			// NOTE: Cloud deletion is handled by PuterSyncProvider subscription
			set((state) => {
				const cover = state.covers.find((c) => c.id === coverId);
				if (cover) {
					// Delete all cards in this cover
					state.cards = state.cards.filter((c) => c.coverId !== coverId);
					// Delete associated memos by coverId
					state.memos = state.memos.filter((m) => m.coverId !== coverId);
					// Update collection cover count
					if (cover.collectionId) {
						const collection = state.collections.find(
							(c) => c.id === cover.collectionId,
						);
						if (collection) {
							collection.coverCount--;
							collection.updatedAt = Date.now();
						}
					}
					// Remove cover
					state.covers = state.covers.filter((c) => c.id !== coverId);
					// Clear selection if needed
					if (state.currentCoverId === coverId) {
						state.currentCoverId = null;
					}
				}
			});
		},

		selectCover: (coverId) =>
			set((state) => {
				state.currentCoverId = coverId;
			}),

		togglePinCover: (coverId) =>
			set((state) => {
				const cover = state.covers.find((c) => c.id === coverId);
				if (cover) {
					cover.isPinned = !cover.isPinned;
					cover.updatedAt = Date.now();
				}
			}),

		moveCoverToCollection: (coverId, collectionId) =>
			set((state) => {
				const cover = state.covers.find((c) => c.id === coverId);
				if (cover) {
					// Update old collection count
					if (cover.collectionId) {
						const oldCollection = state.collections.find(
							(c) => c.id === cover.collectionId,
						);
						if (oldCollection) {
							oldCollection.coverCount--;
							oldCollection.updatedAt = Date.now();
						}
					}
					// Update new collection count
					if (collectionId) {
						const newCollection = state.collections.find(
							(c) => c.id === collectionId,
						);
						if (newCollection) {
							newCollection.coverCount++;
							newCollection.updatedAt = Date.now();
						}
					}
					cover.collectionId = collectionId || undefined;
					cover.updatedAt = Date.now();
				}
			}),

		// Collections
		addCollection: (collection) =>
			set((state) => {
				state.collections.push(collection);
			}),

		updateCollection: (collectionId, updates) =>
			set((state) => {
				const collection = state.collections.find((c) => c.id === collectionId);
				if (collection) {
					Object.assign(collection, updates, { updatedAt: Date.now() });
				}
			}),

		deleteCollection: (collectionId) => {
			// NOTE: Cloud deletion is handled by PuterSyncProvider subscription
			set((state) => {
				// Move all covers out of collection
				state.covers.forEach((cover) => {
					if (cover.collectionId === collectionId) {
						cover.collectionId = undefined;
						cover.updatedAt = Date.now();
					}
				});
				// Remove collection
				state.collections = state.collections.filter(
					(c) => c.id !== collectionId,
				);
				// Clear selection if needed
				if (state.currentCollectionId === collectionId) {
					state.currentCollectionId = null;
				}
			});
		},

		selectCollection: (collectionId) =>
			set((state) => {
				state.currentCollectionId = collectionId;
			}),

		togglePinCollection: (collectionId) =>
			set((state) => {
				const collection = state.collections.find((c) => c.id === collectionId);
				if (collection) {
					collection.isPinned = !collection.isPinned;
					collection.updatedAt = Date.now();
				}
			}),

		renameCollection: (collectionId, newName) => {
			// Validate name - reject empty or whitespace-only strings
			if (!newName || newName.trim().length === 0) {
				return false;
			}

			set((state) => {
				const collection = state.collections.find((c) => c.id === collectionId);
				if (collection) {
					collection.name = newName.trim();
					collection.updatedAt = Date.now();
				}
			});

			return true;
		},

		createCollectionFromCovers: (coverId1, coverId2, collectionName) => {
			// Validate name - reject empty or whitespace-only strings
			const trimmedName = collectionName?.trim();
			if (!trimmedName || trimmedName.length === 0) {
				return null;
			}

			const state = get();
			const cover1 = state.covers.find((c) => c.id === coverId1);
			const cover2 = state.covers.find((c) => c.id === coverId2);

			// Both covers must exist
			if (!cover1 || !cover2) {
				return null;
			}

			// Create new collection
			const now = Date.now();
			const newCollection: CardCollection = {
				id: `collection-${now}-${Math.random().toString(36).substr(2, 9)}`,
				name: trimmedName,
				coverCount: 2,
				createdAt: now,
				updatedAt: now,
			};

			set((state) => {
				// Add the new collection
				state.collections.push(newCollection);

				// Update old collection counts for both covers
				const cover1State = state.covers.find((c) => c.id === coverId1);
				const cover2State = state.covers.find((c) => c.id === coverId2);

				if (cover1State?.collectionId) {
					const oldCollection1 = state.collections.find(
						(c) => c.id === cover1State.collectionId,
					);
					if (oldCollection1) {
						oldCollection1.coverCount--;
						oldCollection1.updatedAt = now;
					}
				}

				if (cover2State?.collectionId) {
					const oldCollection2 = state.collections.find(
						(c) => c.id === cover2State.collectionId,
					);
					if (oldCollection2) {
						oldCollection2.coverCount--;
						oldCollection2.updatedAt = now;
					}
				}

				// Move both covers to the new collection
				if (cover1State) {
					cover1State.collectionId = newCollection.id;
					cover1State.updatedAt = now;
				}

				if (cover2State) {
					cover2State.collectionId = newCollection.id;
					cover2State.updatedAt = now;
				}
			});

			return newCollection;
		},

		// Memos
		addMemo: (memo) =>
			set((state) => {
				// Replace existing memo for same card
				state.memos = state.memos.filter((m) => m.cardId !== memo.cardId);
				state.memos.push(memo);
			}),

		deleteMemo: (memoId) =>
			set((state) => {
				state.memos = state.memos.filter((m) => m.id !== memoId);
			}),

		getMemoByCard: (cardId) => {
			return get().memos.find((m) => m.cardId === cardId);
		},

		getMemosByCover: (coverId) => {
			return get().memos.filter((m) => m.coverId === coverId);
		},

		getAllMemos: () => {
			return get().memos;
		},

		// Generation state
		setGenerating: (isGenerating) =>
			set((state) => {
				state.isGenerating = isGenerating;
				if (!isGenerating) {
					state.generationProgress = 0;
				}
			}),

		setGenerationProgress: (progress) =>
			set((state) => {
				state.generationProgress = progress;
			}),

		setOrganizing: (isOrganizing) =>
			set((state) => {
				state.isOrganizing = isOrganizing;
			}),

		// Bulk operations
		clearAllCards: () =>
			set((state) => {
				state.cards = [];
				state.covers = [];
				state.collections = [];
				state.memos = [];
				state.currentCoverId = null;
				state.currentCollectionId = null;
			}),
	}),
	{
		name: "puter-flashcards",
		excludeFromPersist: [
			"isGenerating",
			"generationProgress",
			"isOrganizing",
			"isInitialized",
		],
	},
);

export { useFlashcardStore };
