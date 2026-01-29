/**
 * Puter Sync Hook
 *
 * React hook for managing Puter cloud sync.
 * Provides sync status, triggers, and utilities for components.
 *
 * ENHANCED FEATURES:
 * - isSyncing and syncDirection for UI feedback
 * - forceSync for manual reconciliation
 * - Hot/Cold tiering awareness
 */

import { useEffect, useState, useCallback } from "react";
import { useSettingsStore } from "@/stores/use-settings-store";
import { useSessionsStore } from "@/stores/use-sessions-store";
import { useFlashcardStore } from "@/stores/use-flashcard-store";
import { usePlannerStore } from "@/stores/use-planner-store";
import { useAuthStore } from "@/stores/use-auth-store";
import {
	dataSyncManager,
	sessionSync,
	folderSync,
	flashcardSync,
	plannerSync,
} from "@/lib/services/data-sync";
import { puterSync, SyncStatus } from "@/lib/services/puter-sync";
import { usePuterSyncContext } from "@/providers/puter-sync-provider";
import { devLog } from "@/lib/utils/dev-logger";
import { StorageMode } from "@/lib/types";

export interface UsePuterSyncReturn {
	// Status
	isInitialized: boolean;
	isPuterAvailable: boolean;
	storageMode: StorageMode;
	syncStatus: SyncStatus;

	// Actions
	syncToCloud: () => Promise<void>;
	syncFromCloud: () => Promise<void>;
	setStorageMode: (mode: StorageMode) => void;
	forceSync: () => Promise<void>;

	// Sync state
	isSyncing: boolean;
	syncDirection: "up" | "down" | "idle";
	lastSyncTime: number | null;
	syncError: string | null;
	isInitialSyncing: boolean; // True during initial download from cloud
}

export function usePuterSync(): UsePuterSyncReturn {
	const { settings, updateSettings } = useSettingsStore();
	const sessionsStore = useSessionsStore();
	const flashcardStore = useFlashcardStore();
	const plannerStore = usePlannerStore();
	const { isSignedIn } = useAuthStore();

	// Get context from provider (if available)
	const syncContext = usePuterSyncContext();

	const [isInitialized, setIsInitialized] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
	const [syncError, setSyncError] = useState<string | null>(null);
	const [syncStatus, setSyncStatus] = useState<SyncStatus>({
		isOnline: false,
		lastSync: null,
		pendingChanges: 0,
		error: null,
		isSyncing: false,
		syncDirection: "idle",
	});

	const storageMode = settings.storageMode || "local";
	const isPuterAvailable = puterSync.isPuterAvailable();

	// Initialize sync service when mode is 'puter' and user is signed in
	useEffect(() => {
		if (
			storageMode === "puter" &&
			isPuterAvailable &&
			isSignedIn &&
			!isInitialized
		) {
			dataSyncManager.initialize().then((success) => {
				setIsInitialized(success);
				if (success) {
					devLog("[usePuterSync] Initialized");
				}
			});
		}
	}, [storageMode, isPuterAvailable, isSignedIn, isInitialized]);

	// Reset when user signs out
	useEffect(() => {
		if (!isSignedIn && isInitialized) {
			setIsInitialized(false);
			dataSyncManager.reset();
		}
	}, [isSignedIn, isInitialized]);

	// Update sync status periodically
	useEffect(() => {
		if (storageMode !== "puter") return;

		const updateStatus = () => {
			setSyncStatus(dataSyncManager.getSyncStatus());
		};

		updateStatus();
		const interval = setInterval(updateStatus, 2000);
		return () => clearInterval(interval);
	}, [storageMode]);

	// Manual sync to cloud
	const syncToCloud = useCallback(async () => {
		if (storageMode !== "puter" || !isInitialized || !isSignedIn) {
			setSyncError("Puter sync not available");
			return;
		}

		setIsSyncing(true);
		setSyncError(null);

		try {
			await sessionSync.saveAllSessions(sessionsStore.sessions);
			await folderSync.saveFolders(sessionsStore.folders);
			await flashcardSync.saveAll({
				cards: flashcardStore.cards,
				covers: flashcardStore.covers,
				collections: flashcardStore.collections,
				memos: flashcardStore.memos,
			});
			await plannerSync.saveBlocks(plannerStore.blocks);

			setLastSyncTime(Date.now());
			devLog("[usePuterSync] Manual sync complete");
		} catch (error) {
			setSyncError(error instanceof Error ? error.message : "Sync failed");
			devLog("[usePuterSync] Manual sync error:", error);
		} finally {
			setIsSyncing(false);
		}
	}, [
		storageMode,
		isInitialized,
		isSignedIn,
		sessionsStore,
		flashcardStore,
		plannerStore,
	]);

	// Sync from cloud (restore data)
	const syncFromCloud = useCallback(async () => {
		if (storageMode !== "puter" || !isInitialized || !isSignedIn) {
			setSyncError("Puter sync not available");
			return;
		}

		setIsSyncing(true);
		setSyncError(null);

		try {
			const cloudData = await dataSyncManager.syncFromCloud();

			devLog("[usePuterSync] Loaded from cloud:", {
				sessions: cloudData.sessions.length,
				folders: cloudData.folders.length,
				cards: cloudData.flashcards.cards.length,
				blocks: cloudData.blocks.length,
			});

			setLastSyncTime(Date.now());
		} catch (error) {
			setSyncError(error instanceof Error ? error.message : "Sync failed");
			devLog("[usePuterSync] Sync from cloud error:", error);
		} finally {
			setIsSyncing(false);
		}
	}, [storageMode, isInitialized, isSignedIn]);

	// Change storage mode
	const setStorageMode = useCallback(
		(mode: StorageMode) => {
			updateSettings({ storageMode: mode });

			if (mode === "puter" && isPuterAvailable && isSignedIn) {
				// Initialize and sync to cloud
				dataSyncManager.initialize().then((success) => {
					if (success) {
						setIsInitialized(true);
						// Initial sync to cloud after a delay
						setTimeout(() => {
							syncToCloud();
						}, 1000);
					}
				});
			} else if (mode === "local") {
				// Reset sync state
				setIsInitialized(false);
				dataSyncManager.reset();
			}
		},
		[updateSettings, isPuterAvailable, isSignedIn, syncToCloud],
	);

	// Force sync - manual reconciliation
	const forceSync = useCallback(async () => {
		// Use context forceSync if available (preferred)
		if (syncContext?.forceSync) {
			await syncContext.forceSync();
			setLastSyncTime(Date.now());
			return;
		}

		// Fallback to manual sync
		await syncToCloud();
		await syncFromCloud();
		setLastSyncTime(Date.now());
		devLog("[usePuterSync] Force sync complete");
	}, [syncContext, syncToCloud, syncFromCloud]);

	// Derive sync direction from context or local state
	const syncDirection = syncContext?.syncDirection || syncStatus.syncDirection;
	const effectiveIsSyncing =
		syncContext?.isSyncing || isSyncing || syncStatus.isSyncing;

	return {
		isInitialized,
		isPuterAvailable,
		storageMode,
		syncStatus: syncContext?.syncStatus || syncStatus,
		syncToCloud,
		syncFromCloud,
		setStorageMode,
		forceSync,
		isSyncing: effectiveIsSyncing,
		syncDirection,
		lastSyncTime,
		syncError,
		isInitialSyncing: syncContext?.isInitialSyncing || false,
	};
}
