/**
 * useCardsPage Hook
 * Extracts page logic from app/cards/page.tsx
 *
 * Features:
 * - Memoized sorted collections and covers
 * - AI organization with optimistic updates
 * - Dialog state management
 * - Drag-drop handling
 */

import * as React from "react";
import { useFlashcardStore } from "@/stores/use-flashcard-store";
import { flashcardAI } from "@/lib/services/flashcard-ai";
import { toast } from "@/stores/use-global-store";
import { CardCollection } from "@/lib/types/flashcard";
import {
	selectSortedStandaloneCovers,
	selectSortedCollections,
	selectHasContent,
	selectUnorganizedCovers,
} from "@/stores/selectors";

interface UseCardsPageReturn {
	// Data
	sortedCovers: ReturnType<typeof selectSortedStandaloneCovers>;
	sortedCollections: ReturnType<typeof selectSortedCollections>;
	hasContent: boolean;
	isInitialized: boolean;
	isOrganizing: boolean;
	memos: ReturnType<typeof useFlashcardStore.getState>["memos"];
	currentCoverId: string | null;

	// Actions
	handleOrganizeAll: () => Promise<void>;
	handleCreateCollection: (name: string) => void;
	handleMoveToCollection: (coverId: string) => void;
	handleSelectCollection: (collectionId: string | null) => void;
	handleRenameCover: (coverId: string) => void;
	handleConfirmRename: (newName: string) => void;
	handleCoverClick: (coverId: string) => void;
	handleDragDrop: (
		coverId: string,
		targetId: string,
		targetType: "collection" | "cover",
	) => void;
	handleCreateCollectionFromStack: (collectionName: string) => void;

	// Collection editing
	editingCollectionId: string | null;
	handleStartCollectionEdit: (collectionId: string) => void;
	handleSaveCollectionName: (collectionId: string, newName: string) => void;
	handleCancelCollectionEdit: () => void;

	// Dialog state
	showNewCollection: boolean;
	setShowNewCollection: (show: boolean) => void;
	showMoveDialog: boolean;
	setShowMoveDialog: (show: boolean) => void;
	showSettings: boolean;
	setShowSettings: (show: boolean) => void;
	showRenameDialog: boolean;
	setShowRenameDialog: (show: boolean) => void;
	renamingCover: { id: string; name: string } | null;
	showStackDialog: boolean;
	setShowStackDialog: (show: boolean) => void;
	stackingCovers: { sourceId: string; targetId: string } | null;
	setStackingCovers: (
		covers: { sourceId: string; targetId: string } | null,
	) => void;

	// Store actions (pass-through)
	initializeFlashcards: () => void;
	deleteCover: (id: string) => void;
	togglePinCover: (id: string) => void;
	getCardsByCover: (
		coverId: string,
	) => ReturnType<typeof useFlashcardStore.getState>["cards"];
	deleteCollection: (id: string) => void;
	collections: CardCollection[];
	covers: ReturnType<typeof useFlashcardStore.getState>["covers"];
}

export function useCardsPage(): UseCardsPageReturn {
	const {
		isInitialized,
		initializeFlashcards,
		covers,
		collections,
		memos,
		currentCoverId,
		selectCover,
		deleteCover,
		togglePinCover,
		getCardsByCover,
		addCollection,
		deleteCollection,
		moveCoverToCollection,
		createCollectionFromCovers,
		renameCollection,
		updateCover,
		isOrganizing,
		setOrganizing,
	} = useFlashcardStore();

	// Dialog state
	const [showNewCollection, setShowNewCollection] = React.useState(false);
	const [showMoveDialog, setShowMoveDialog] = React.useState(false);
	const [movingCoverId, setMovingCoverId] = React.useState<string | null>(null);
	const [showSettings, setShowSettings] = React.useState(false);
	const [showRenameDialog, setShowRenameDialog] = React.useState(false);
	const [renamingCover, setRenamingCover] = React.useState<{
		id: string;
		name: string;
	} | null>(null);
	const [showStackDialog, setShowStackDialog] = React.useState(false);
	const [stackingCovers, setStackingCovers] = React.useState<{
		sourceId: string;
		targetId: string;
	} | null>(null);
	const [editingCollectionId, setEditingCollectionId] = React.useState<
		string | null
	>(null);

	// Memoized selectors
	const sortedCovers = React.useMemo(
		() => selectSortedStandaloneCovers({ covers, collections }),
		[covers, collections],
	);

	const sortedCollections = React.useMemo(
		() => selectSortedCollections({ covers, collections }),
		[covers, collections],
	);

	const hasContent = React.useMemo(
		() => selectHasContent({ covers, collections }),
		[covers, collections],
	);

	// Handlers
	const handleCoverClick = React.useCallback(
		(coverId: string) => {
			selectCover(coverId);
		},
		[selectCover],
	);

	const handleCreateCollection = React.useCallback(
		(name: string) => {
			const collection: CardCollection = {
				id: `collection-${Date.now()}`,
				name,
				coverCount: 0,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};
			addCollection(collection);
			toast({ description: `Collection "${collection.name}" created!` });
		},
		[addCollection],
	);

	const handleMoveToCollection = React.useCallback((coverId: string) => {
		setMovingCoverId(coverId);
		setShowMoveDialog(true);
	}, []);

	const handleSelectCollection = React.useCallback(
		(collectionId: string | null) => {
			if (movingCoverId) {
				moveCoverToCollection(movingCoverId, collectionId);
				setMovingCoverId(null);
				toast({
					description: collectionId
						? "Moved to collection!"
						: "Removed from collection!",
				});
			}
		},
		[movingCoverId, moveCoverToCollection],
	);

	const handleRenameCover = React.useCallback(
		(coverId: string) => {
			const cover = covers.find((c) => c.id === coverId);
			if (cover) {
				setRenamingCover({ id: cover.id, name: cover.name });
				setShowRenameDialog(true);
			}
		},
		[covers],
	);

	const handleConfirmRename = React.useCallback(
		(newName: string) => {
			if (renamingCover) {
				updateCover(renamingCover.id, { name: newName });
				toast({ description: "Card set renamed!" });
			}
		},
		[renamingCover, updateCover],
	);

	const handleStartCollectionEdit = React.useCallback(
		(collectionId: string) => {
			setEditingCollectionId(collectionId);
		},
		[],
	);

	const handleSaveCollectionName = React.useCallback(
		(collectionId: string, newName: string) => {
			const collection = collections.find((c) => c.id === collectionId);
			if (collection && collection.name === newName.trim()) {
				setEditingCollectionId(null);
				return;
			}

			const success = renameCollection(collectionId, newName);
			if (success) {
				toast({ description: "Collection renamed!" });
			} else {
				toast({ description: "Name cannot be empty", variant: "destructive" });
			}
			setEditingCollectionId(null);
		},
		[renameCollection, collections],
	);

	const handleCancelCollectionEdit = React.useCallback(() => {
		setEditingCollectionId(null);
	}, []);

	const handleDragDrop = React.useCallback(
		(coverId: string, targetId: string, targetType: "collection" | "cover") => {
			if (targetType === "collection") {
				moveCoverToCollection(coverId, targetId);
				const targetCollection = collections.find((c) => c.id === targetId);
				toast({
					description: `Moved to "${targetCollection?.name || "collection"}"!`,
				});
			} else if (targetType === "cover") {
				setStackingCovers({ sourceId: coverId, targetId });
				setShowStackDialog(true);
			}
		},
		[moveCoverToCollection, collections],
	);

	const handleCreateCollectionFromStack = React.useCallback(
		(collectionName: string) => {
			if (!stackingCovers) return;

			const newCollection = createCollectionFromCovers(
				stackingCovers.sourceId,
				stackingCovers.targetId,
				collectionName,
			);

			if (newCollection) {
				toast({
					title: "Collection Created!",
					description: `"${newCollection.name}" now contains 2 card sets.`,
				});
			} else {
				toast({
					title: "Failed to create collection",
					description: "Please try again.",
					variant: "destructive",
				});
			}

			setStackingCovers(null);
		},
		[stackingCovers, createCollectionFromCovers],
	);

	const handleOrganizeAll = React.useCallback(async () => {
		const unorganizedCovers = selectUnorganizedCovers({ covers, collections });
		if (unorganizedCovers.length === 0) {
			toast({ description: "All covers are already organized!" });
			return;
		}

		setOrganizing(true);
		toast({ description: "Analyzing card sets..." });

		try {
			const result = await flashcardAI.organizeCovers(
				unorganizedCovers.map((c) => ({ id: c.id, name: c.name })),
				collections.map((c) => ({ id: c.id, name: c.name })),
				(phase, progress) => {
					if (phase === "planning" && progress === 50) {
						toast({ description: "Planning collections..." });
					}
				},
			);

			// Create new collections with delay for visual effect
			if (result.newCollections.length > 0) {
				toast({ description: "Creating collections..." });
				for (const newCol of result.newCollections) {
					const collection: CardCollection = {
						id: newCol.id,
						name: newCol.name,
						coverCount: 0,
						createdAt: Date.now(),
						updatedAt: Date.now(),
					};
					addCollection(collection);
					await new Promise((resolve) => setTimeout(resolve, 300));
				}
			}

			await new Promise((resolve) => setTimeout(resolve, 500));
			toast({ description: "Organizing card sets..." });

			// Apply assignments with animation delay
			for (const assignment of result.assignments) {
				moveCoverToCollection(assignment.coverId, assignment.collectionId);
				await new Promise((resolve) => setTimeout(resolve, 150));
			}

			toast({
				title: "Organization Complete!",
				description: `Organized ${result.assignments.length} card sets into ${result.newCollections.length + collections.length} collections.`,
			});
		} catch (error) {
			console.error("Organize error:", error);
			toast({
				title: "Organization Failed",
				description: "Could not organize card sets.",
				variant: "destructive",
			});
		} finally {
			setOrganizing(false);
		}
	}, [
		covers,
		collections,
		setOrganizing,
		addCollection,
		moveCoverToCollection,
	]);

	return {
		// Data
		sortedCovers,
		sortedCollections,
		hasContent,
		isInitialized,
		isOrganizing,
		memos,
		currentCoverId,

		// Actions
		handleOrganizeAll,
		handleCreateCollection,
		handleMoveToCollection,
		handleSelectCollection,
		handleRenameCover,
		handleConfirmRename,
		handleCoverClick,
		handleDragDrop,
		handleCreateCollectionFromStack,

		// Collection editing
		editingCollectionId,
		handleStartCollectionEdit,
		handleSaveCollectionName,
		handleCancelCollectionEdit,

		// Dialog state
		showNewCollection,
		setShowNewCollection,
		showMoveDialog,
		setShowMoveDialog,
		showSettings,
		setShowSettings,
		showRenameDialog,
		setShowRenameDialog,
		renamingCover,
		showStackDialog,
		setShowStackDialog,
		stackingCovers,
		setStackingCovers,

		// Store actions
		initializeFlashcards,
		deleteCover,
		togglePinCover,
		getCardsByCover,
		deleteCollection,
		collections,
		covers,
	};
}
