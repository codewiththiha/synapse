"use client";

/**
 * Puter Sync Provider
 *
 * Initializes and manages Puter cloud sync at the app level.
 * Handles automatic syncing when storage mode is set to 'puter'.
 *
 * OPTIMIZED SYNC ARCHITECTURE:
 *
 * 1. PARALLEL FETCHING (Speed):
 *    - All data types fetched concurrently with Promise.all
 *    - Reduces sync time from Sum(all_requests) to Max(longest_request)
 *
 * 2. HOT/COLD TIERING (Performance):
 *    - Hot path: Recent messages written to KV (2s debounce)
 *    - Cold path: Full session debounced to FS (10s delay)
 *
 * 3. LWW CONFLICT RESOLUTION (Data Integrity):
 *    - Compare updatedAt timestamps for sessions existing both locally and in cloud
 *    - Only overwrite local if cloudSession.updatedAt > localSession.updatedAt
 *
 * 4. SYNC MUTEX (Concurrency):
 *    - Prevents race conditions between upload/download
 *    - Queues requests if sync is in progress
 *
 * 5. HEARTBEAT POLLING (Auto-Rerender):
 *    - 30s interval checks for remote changes via KV timestamp
 *    - Triggers reload when changes detected from other devices
 *
 * 6. ATOMIC INDEXING (Efficiency):
 *    - Batch manifest updates - sessions_index.json written once per sync cycle
 *
 * 7. ZERO-ZOMBIE DELETION:
 *    - File deleted FIRST, then manifest updated
 *    - Tombstones prevent resurrection from directory scan
 */

import {
	useEffect,
	useRef,
	useCallback,
	useState,
	createContext,
	useContext,
} from "react";
import { useSettingsStore } from "@/stores/use-settings-store";
import { useSessionsStore } from "@/stores/use-sessions-store";
import { useFlashcardStore } from "@/stores/use-flashcard-store";
import { usePlannerStore } from "@/stores/use-planner-store";
import { useAuthStore } from "@/stores/use-auth-store";
import { useGamificationStore } from "@/stores/use-gamification-store";
import {
	dataSyncManager,
	sessionSync,
	folderSync,
	flashcardSync,
	plannerSync,
	gamificationSync,
} from "@/lib/services/data-sync";
import {
	puterSync,
	SyncStatus,
	HOT_PATH_DEBOUNCE_MS,
} from "@/lib/services/puter-sync";
import { ChatSession, ChatFolder } from "@/lib/types";

// Debug mode - set to true to see sync logs
const DEBUG_PROVIDER = false;

function providerLog(...args: unknown[]) {
	if (DEBUG_PROVIDER) {
		console.log("[PuterSyncProvider]", ...args);
	}
}

// Context for exposing sync controls to components
interface PuterSyncContextValue {
	syncStatus: SyncStatus;
	forceSync: () => Promise<void>;
	isSyncing: boolean;
	syncDirection: "up" | "down" | "idle";
	isInitialSyncing: boolean; // True during initial download from cloud
}

const PuterSyncContext = createContext<PuterSyncContextValue | null>(null);

export function usePuterSyncContext() {
	return useContext(PuterSyncContext);
}

interface PuterSyncProviderProps {
	children: React.ReactNode;
}

export function PuterSyncProvider({ children }: PuterSyncProviderProps) {
	const { settings } = useSettingsStore();
	// NOTE: We don't destructure stores here because we use getState() inside callbacks
	// to avoid stale closure issues. The stores are accessed via:
	// - useSessionsStore.getState()
	// - useFlashcardStore.getState()
	// - usePlannerStore.getState()
	const {
		isSignedIn: storeIsSignedIn,
		user,
		isInitialized: authInitialized,
	} = useAuthStore();

	const isInitializedRef = useRef(false);
	const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const initAttemptedRef = useRef(false);
	// CRITICAL: Block uploads until initial download completes
	// This prevents stale local data from overwriting cloud data on page load
	const initialDownloadCompleteRef = useRef(false);
	// Track if we're currently doing initial sync (for loading screen)
	const [isInitialSyncing, setIsInitialSyncing] = useState(false);

	// Sync status state for UI
	const [syncStatus, setSyncStatus] = useState<SyncStatus>(
		puterSync.getSyncStatus(),
	);

	// Dirty state tracking (using refs to avoid re-renders)
	const dirtySessionIdsRef = useRef<Set<string>>(new Set());
	const dirtyFoldersRef = useRef(false);
	const dirtyFlashcardsRef = useRef(false);
	const dirtyPlannerRef = useRef(false);
	const dirtyGamificationRef = useRef(false);
	// Flag to suppress dirty tracking during cloud sync
	// This prevents the subscription from marking data as dirty when we're loading from cloud
	const isSyncingFromCloudRef = useRef(false);

	// Track previous state for change detection
	const prevSessionsRef = useRef<Map<string, string>>(new Map());
	const prevFoldersHashRef = useRef<string>("");
	const prevFlashcardsHashRef = useRef<string>("");
	const prevPlannerHashRef = useRef<string>("");
	const prevGamificationHashRef = useRef<string>("");

	const storageMode = settings.storageMode || "local";
	const isPuterAvailable = puterSync.isPuterAvailable();

	// Check Puter's actual sign-in state directly (source of truth)
	const [puterSignedIn, setPuterSignedIn] = useState(false);

	// Check Puter auth state directly on mount and when store changes
	useEffect(() => {
		const checkPuterAuth = () => {
			if (typeof window !== "undefined" && window.puter?.auth) {
				const signedIn = window.puter.auth.isSignedIn();
				setPuterSignedIn(signedIn);
				return signedIn;
			}
			return false;
		};

		checkPuterAuth();

		if (storeIsSignedIn) {
			checkPuterAuth();
		}

		// Periodic check for first few seconds (Puter SDK might load late)
		let checkCount = 0;
		const maxChecks = 10;
		const intervalId = setInterval(() => {
			checkCount++;
			const signedIn = checkPuterAuth();
			if (signedIn || checkCount >= maxChecks) {
				clearInterval(intervalId);
			}
		}, 1000);

		return () => clearInterval(intervalId);
	}, [storeIsSignedIn, authInitialized]);

	// Use the direct Puter check as the source of truth
	const isSignedIn = puterSignedIn || storeIsSignedIn;

	// Log state changes only in debug mode
	useEffect(() => {
		providerLog("State:", {
			storageMode,
			isPuterAvailable,
			isSignedIn,
			authInitialized,
			syncInitialized: isInitializedRef.current,
		});
	}, [storageMode, isPuterAvailable, isSignedIn, authInitialized]);

	// Generate hash for a session (for change detection)
	const getSessionHash = useCallback((session: ChatSession): string => {
		return `${session.messages.length}:${session.updatedAt}:${session.title}:${session.folderId || ""}:${session.isPinned || false}`;
	}, []);

	// Generate hash for folders
	const getFoldersHash = useCallback((folders: ChatFolder[]): string => {
		return folders.map((f) => `${f.id}:${f.name}:${f.updatedAt}`).join("|");
	}, []);

	// LWW (Last-Write-Wins) merge for sessions
	// Cloud is source of truth for deletions and when timestamps are equal
	const mergeSessionsLWW = useCallback(
		(
			cloudSessions: ChatSession[],
			localSessions: ChatSession[],
		): { merged: ChatSession[]; deletedIds: string[] } => {
			const merged: ChatSession[] = [];
			const deletedIds: string[] = [];
			const localMap = new Map(localSessions.map((s) => [s.id, s]));
			const processedIds = new Set<string>();

			// Process cloud sessions with LWW
			for (const cloudSession of cloudSessions) {
				const localSession = localMap.get(cloudSession.id);

				if (localSession) {
					// Session exists both locally and in cloud - use LWW
					// Cloud wins when: cloud is newer OR timestamps are equal (cloud is source of truth)
					// Local wins ONLY when: local is strictly newer
					if (localSession.updatedAt > cloudSession.updatedAt) {
						// Local is strictly newer - local wins
						merged.push(localSession);
						providerLog(
							`LWW: Local wins for session ${localSession.id} (local: ${localSession.updatedAt} > cloud: ${cloudSession.updatedAt})`,
						);
					} else if (cloudSession.updatedAt > localSession.updatedAt) {
						// Cloud is strictly newer - cloud wins
						merged.push(cloudSession);
						providerLog(
							`LWW: Cloud wins for session ${cloudSession.id} (cloud: ${cloudSession.updatedAt} > local: ${localSession.updatedAt})`,
						);
					} else {
						// Timestamps are equal - compare content, prefer cloud if different
						const localMsgCount = localSession.messages?.length || 0;
						const cloudMsgCount = cloudSession.messages?.length || 0;

						if (cloudMsgCount > localMsgCount) {
							// Cloud has more messages - cloud wins
							merged.push(cloudSession);
							providerLog(
								`LWW: Cloud wins for session ${cloudSession.id} (same timestamp, cloud has more messages: ${cloudMsgCount} > ${localMsgCount})`,
							);
						} else if (cloudMsgCount < localMsgCount) {
							// Local has more messages - local wins
							merged.push(localSession);
							providerLog(
								`LWW: Local wins for session ${localSession.id} (same timestamp, local has more messages: ${localMsgCount} > ${cloudMsgCount})`,
							);
						} else {
							// Same timestamp and same message count - use cloud (source of truth)
							merged.push(cloudSession);
							providerLog(
								`LWW: Cloud wins for session ${cloudSession.id} (same timestamp and content, cloud is source of truth)`,
							);
						}
					}
				} else {
					// Session only in cloud
					merged.push(cloudSession);
				}

				processedIds.add(cloudSession.id);
			}

			// Add local sessions that don't exist in cloud ONLY if they're dirty (not yet synced)
			// If a session exists locally but not in cloud, it was either:
			// 1. Never synced (dirty) - keep it
			// 2. Deleted from cloud on another device - remove it
			for (const localSession of localSessions) {
				if (!processedIds.has(localSession.id)) {
					// Check if this session is in the dirty set (unsaved changes)
					if (dirtySessionIdsRef.current.has(localSession.id)) {
						merged.push(localSession);
						providerLog(
							`Keeping dirty local session not in cloud: ${localSession.id}`,
						);
					} else {
						// Session was deleted from cloud - don't add it back
						deletedIds.push(localSession.id);
						providerLog(
							`Removing local session deleted from cloud: ${localSession.id}`,
						);
						// Clean up the hash cache
						prevSessionsRef.current.delete(localSession.id);
					}
				}
			}

			return { merged, deletedIds };
		},
		[],
	);

	// LWW merge for folders - cloud is source of truth for deletions and when timestamps equal
	const mergeFoldersLWW = useCallback(
		(
			cloudFolders: ChatFolder[],
			localFolders: ChatFolder[],
		): { merged: ChatFolder[]; deletedIds: string[] } => {
			const merged: ChatFolder[] = [];
			const deletedIds: string[] = [];
			const localMap = new Map(localFolders.map((f) => [f.id, f]));
			const processedIds = new Set<string>();

			for (const cloudFolder of cloudFolders) {
				const localFolder = localMap.get(cloudFolder.id);

				if (localFolder) {
					// Folder exists both locally and in cloud - use LWW
					// Cloud wins when: cloud is newer OR timestamps are equal (cloud is source of truth)
					// Local wins ONLY when: local is strictly newer
					if (localFolder.updatedAt > cloudFolder.updatedAt) {
						// Local is strictly newer - local wins
						merged.push(localFolder);
						providerLog(
							`LWW: Local wins for folder ${localFolder.id} (local: ${localFolder.updatedAt} > cloud: ${cloudFolder.updatedAt})`,
						);
					} else if (cloudFolder.updatedAt > localFolder.updatedAt) {
						// Cloud is strictly newer - cloud wins
						merged.push(cloudFolder);
						providerLog(
							`LWW: Cloud wins for folder ${cloudFolder.id} (cloud: ${cloudFolder.updatedAt} > local: ${localFolder.updatedAt})`,
						);
					} else {
						// Timestamps are equal - use cloud (source of truth)
						merged.push(cloudFolder);
						providerLog(
							`LWW: Cloud wins for folder ${cloudFolder.id} (same timestamp, cloud is source of truth)`,
						);
					}
				} else {
					merged.push(cloudFolder);
				}

				processedIds.add(cloudFolder.id);
			}

			// Only keep local folders that are dirty (not yet synced)
			for (const localFolder of localFolders) {
				if (!processedIds.has(localFolder.id)) {
					if (dirtyFoldersRef.current) {
						// Folders are dirty, keep local-only folders
						merged.push(localFolder);
						providerLog(
							`Keeping dirty local folder not in cloud: ${localFolder.id}`,
						);
					} else {
						// Folder was deleted from cloud
						deletedIds.push(localFolder.id);
						providerLog(
							`Removing local folder deleted from cloud: ${localFolder.id}`,
						);
					}
				}
			}

			return { merged, deletedIds };
		},
		[],
	);

	// Load data from cloud with PARALLEL FETCHING and LWW conflict resolution
	// IMPORTANT: This function uses getState() to fetch FRESH state at execution time
	// This prevents stale closure issues when called from heartbeat callbacks
	const loadFromCloud = useCallback(async () => {
		// Acquire download lock (mutex)
		const lockAcquired = await puterSync.acquireDownloadLock();
		if (!lockAcquired) {
			providerLog("Download lock busy, request queued");
			return;
		}

		providerLog("Loading from cloud with PARALLEL fetching...");
		setSyncStatus(puterSync.getSyncStatus());

		// CRITICAL: Invalidate all caches before loading fresh data from cloud
		// This ensures we read the latest data from Puter, not stale cached data
		// This is especially important for heartbeat-triggered reloads
		puterSync.invalidateManifestCache();
		// Clear pending deletions since we're getting fresh data from cloud
		puterSync.clearPendingDeletions();

		// CRITICAL: Set flag to suppress dirty tracking during cloud sync
		// This prevents subscriptions from marking data as dirty when we update stores
		isSyncingFromCloudRef.current = true;

		// GET FRESH STATE IMPERATIVELY - prevents stale closure issues
		// Do NOT use component-scoped variables (sessionsStore, flashcardStore, etc.)
		const currentSessions = useSessionsStore.getState().sessions;
		const currentFolders = useSessionsStore.getState().folders;
		const currentFlashcards = useFlashcardStore.getState();
		const currentBlocks = usePlannerStore.getState().blocks;

		// IMPORTANT: Reset dirty flags BEFORE loading from cloud
		// This ensures cloud is treated as source of truth for deletions
		// Any local-only items that aren't in cloud will be removed
		const savedDirtySessions = new Set(dirtySessionIdsRef.current);
		dirtySessionIdsRef.current = new Set();
		dirtyFoldersRef.current = false;
		dirtyFlashcardsRef.current = false;
		dirtyPlannerRef.current = false;
		dirtyGamificationRef.current = false;

		try {
			// PARALLEL FETCH: Load all data types concurrently
			const [
				cloudSessions,
				cloudFolders,
				cloudFlashcards,
				cloudBlocks,
				cloudGamification,
			] = await Promise.all([
				sessionSync.loadAllSessions(),
				folderSync.loadFolders(),
				flashcardSync.loadAll(),
				plannerSync.loadBlocks(),
				gamificationSync.loadData(),
			]);

			providerLog("Parallel fetch complete:", {
				sessions: cloudSessions.length,
				folders: cloudFolders.length,
				flashcards: cloudFlashcards.cards.length,
				blocks: cloudBlocks.length,
				gamification: cloudGamification ? "loaded" : "none",
			});

			// Check if cloud is completely empty (user clicked "clear all" on another device)
			const cloudIsEmpty =
				cloudSessions.length === 0 &&
				cloudFolders.length === 0 &&
				cloudFlashcards.cards.length === 0 &&
				cloudFlashcards.covers.length === 0 &&
				cloudFlashcards.collections.length === 0 &&
				cloudFlashcards.memos.length === 0 &&
				cloudBlocks.length === 0;

			if (cloudIsEmpty && !initialDownloadCompleteRef.current) {
				// This is initial load and cloud is empty
				// Check if there's a sync timestamp - if yes, user cleared data
				// If no timestamp, this might be a new user
				const lastSyncTimestamp = puterSync.getLocalSyncTimestamp();

				if (lastSyncTimestamp > 0) {
					// There was previous sync data, but now cloud is empty
					// User must have cleared all data - respect that
					providerLog(
						"Cloud is empty but has sync history - user cleared all data, clearing local",
					);

					// Clear local data to match cloud
					useSessionsStore.getState().syncFromCloud([], []);
					useFlashcardStore.setState({
						cards: [],
						covers: [],
						collections: [],
						memos: [],
					});
					usePlannerStore.setState({ blocks: [] });

					// Clear hash caches
					prevSessionsRef.current.clear();
					prevFoldersHashRef.current = "";
					prevFlashcardsHashRef.current = "";
					prevPlannerHashRef.current = "";

					puterSync.setLocalSyncTimestamp(Date.now());
					console.log(
						"[PuterSyncProvider] ✅ Local data cleared to match empty cloud",
					);
					return;
				} else {
					providerLog(
						"Cloud is empty and no sync history - new user, keeping local data",
					);
				}
			}

			// Process sessions with LWW (using fresh currentSessions)
			let freshSessions: ChatSession[] = currentSessions;
			let freshFolders: ChatFolder[] = currentFolders;
			let sessionsChanged = false;
			let foldersChanged = false;

			if (cloudSessions.length > 0 || currentSessions.length > 0) {
				const { merged: mergedSessions, deletedIds: deletedSessionIds } =
					mergeSessionsLWW(cloudSessions, currentSessions);

				// CRITICAL: Force new array reference to trigger Zustand re-render
				// Spread each session to create new object references
				freshSessions = mergedSessions.map((s) => ({ ...s }));
				sessionsChanged = true;

				providerLog("LWW merged sessions:", freshSessions.length);

				// Log deleted sessions for debugging
				if (deletedSessionIds.length > 0) {
					providerLog(
						"Sessions deleted from cloud, removed locally:",
						deletedSessionIds,
					);
				}

				// Initialize session hash cache
				for (const session of mergedSessions) {
					prevSessionsRef.current.set(session.id, getSessionHash(session));
				}
			}

			// Process folders with LWW (using fresh currentFolders)
			if (cloudFolders.length > 0 || currentFolders.length > 0) {
				const { merged: mergedFolders, deletedIds: deletedFolderIds } =
					mergeFoldersLWW(cloudFolders, currentFolders);

				// CRITICAL: Force new array reference to trigger Zustand re-render
				freshFolders = mergedFolders.map((f) => ({ ...f }));
				foldersChanged = true;
				prevFoldersHashRef.current = getFoldersHash(freshFolders);

				// Log deleted folders for debugging
				if (deletedFolderIds.length > 0) {
					providerLog(
						"Folders deleted from cloud, removed locally:",
						deletedFolderIds,
					);
				}
			}

			// CRITICAL: Update sessions and folders in a SINGLE setState call
			// This ensures atomic update and proper Zustand notification
			if (sessionsChanged || foldersChanged) {
				// Use the store's syncFromCloud action which properly triggers immer
				useSessionsStore.getState().syncFromCloud(freshSessions, freshFolders);
				providerLog(
					"Store updated via syncFromCloud - sessions:",
					freshSessions.length,
					"folders:",
					freshFolders.length,
				);
			}

			// Process flashcards - cloud is source of truth
			// Only keep local items if flashcards are dirty (unsaved changes)
			const mergeArraysWithDeletion = <
				T extends { id: string; updatedAt?: number },
			>(
				cloud: T[],
				local: T[],
				isDirty: boolean,
			): { merged: T[]; deletedIds: string[] } => {
				const merged: T[] = [];
				const deletedIds: string[] = [];
				const localMap = new Map(local.map((item) => [item.id, item]));
				const processedIds = new Set<string>();

				for (const cloudItem of cloud) {
					const localItem = localMap.get(cloudItem.id);
					if (localItem && localItem.updatedAt && cloudItem.updatedAt) {
						// LWW for items with updatedAt
						merged.push(
							cloudItem.updatedAt > localItem.updatedAt ? cloudItem : localItem,
						);
					} else if (localItem) {
						merged.push(localItem);
					} else {
						merged.push(cloudItem);
					}
					processedIds.add(cloudItem.id);
				}

				// Only keep local items not in cloud if dirty
				for (const localItem of local) {
					if (!processedIds.has(localItem.id)) {
						if (isDirty) {
							merged.push(localItem);
						} else {
							// item was deleted from cloud
							deletedIds.push(localItem.id);
						}
					}
				}

				return { merged, deletedIds };
			};

			// Use fresh currentFlashcards state
			const isDirtyFlashcards = dirtyFlashcardsRef.current;
			const cardsResult = mergeArraysWithDeletion(
				cloudFlashcards.cards,
				currentFlashcards.cards,
				isDirtyFlashcards,
			);
			const coversResult = mergeArraysWithDeletion(
				cloudFlashcards.covers,
				currentFlashcards.covers,
				isDirtyFlashcards,
			);
			const collectionsResult = mergeArraysWithDeletion(
				cloudFlashcards.collections,
				currentFlashcards.collections,
				isDirtyFlashcards,
			);
			const memosResult = mergeArraysWithDeletion(
				cloudFlashcards.memos,
				currentFlashcards.memos,
				isDirtyFlashcards,
			);

			// Use partial setState - Zustand will merge and notify subscribers
			useFlashcardStore.setState({
				cards: cardsResult.merged.map((c) => ({ ...c })),
				covers: coversResult.merged.map((c) => ({ ...c })),
				collections: collectionsResult.merged.map((c) => ({ ...c })),
				memos: memosResult.merged.map((m) => ({ ...m })),
			});

			// Log deleted flashcard items
			const totalDeletedFlashcards =
				cardsResult.deletedIds.length +
				coversResult.deletedIds.length +
				collectionsResult.deletedIds.length +
				memosResult.deletedIds.length;
			if (totalDeletedFlashcards > 0) {
				providerLog(
					"Flashcard items deleted from cloud, removed locally:",
					totalDeletedFlashcards,
				);
			}

			// Process planner blocks - cloud is source of truth (using fresh currentBlocks)
			const isDirtyPlanner = dirtyPlannerRef.current;
			const mergedBlocks: typeof cloudBlocks = [];
			const deletedBlockIds: string[] = [];
			const localBlockMap = new Map(currentBlocks.map((b) => [b.id, b]));
			const processedBlockIds = new Set<string>();

			for (const cloudBlock of cloudBlocks) {
				const localBlock = localBlockMap.get(cloudBlock.id);
				if (localBlock) {
					// Use cloud version (or could add LWW here)
					mergedBlocks.push(cloudBlock);
				} else {
					mergedBlocks.push(cloudBlock);
				}
				processedBlockIds.add(cloudBlock.id);
			}

			// Only keep local blocks not in cloud if dirty
			for (const localBlock of currentBlocks) {
				if (!processedBlockIds.has(localBlock.id)) {
					if (isDirtyPlanner) {
						mergedBlocks.push(localBlock);
					} else {
						// block was deleted from cloud
						deletedBlockIds.push(localBlock.id);
					}
				}
			}

			// Use partial setState - Zustand will merge and notify subscribers
			usePlannerStore.setState({
				blocks: mergedBlocks.map((b) => ({ ...b })),
			});

			// Log deleted planner blocks
			if (deletedBlockIds.length > 0) {
				providerLog(
					"Planner blocks deleted from cloud, removed locally:",
					deletedBlockIds.length,
				);
			}

			// Process gamification data - use store's merge logic
			if (cloudGamification) {
				useGamificationStore.getState().loadFromCloud(cloudGamification);
				providerLog("Gamification data merged from cloud");
			}

			// Update local sync timestamp
			puterSync.setLocalSyncTimestamp(Date.now());

			console.log("[PuterSyncProvider] ✅ Cloud data loaded (parallel)");
		} catch (error) {
			console.log("[PuterSyncProvider] ❌ Load error:", error);
			// Restore dirty flags on error so we don't lose local changes
			for (const id of savedDirtySessions) {
				dirtySessionIdsRef.current.add(id);
			}
			throw error;
		} finally {
			// Release download lock
			puterSync.releaseDownloadLock();
			setSyncStatus(puterSync.getSyncStatus());
			// Reset the cloud sync flag after a short delay to allow subscriptions to settle
			// This ensures any synchronous subscription callbacks don't mark data as dirty
			setTimeout(() => {
				isSyncingFromCloudRef.current = false;
			}, 100);
		}
	}, [
		// CRITICAL: Removed stores from dependencies - we use getState() instead
		// This makes the function stable and prevents stale closure issues
		getSessionHash,
		getFoldersHash,
		mergeSessionsLWW,
		mergeFoldersLWW,
	]);

	// Sync to cloud (incremental - only dirty data) with mutex and atomic indexing
	// IMPORTANT: Uses getState() to fetch FRESH state at execution time
	const syncToCloud = useCallback(async () => {
		const syncInitialized = puterSync.isInitialized();

		if (storageMode !== "puter" || !syncInitialized || !isSignedIn) {
			return;
		}

		// CRITICAL: Block uploads until initial download completes
		// This prevents stale local data from overwriting cloud data on page load
		if (!initialDownloadCompleteRef.current) {
			providerLog("Blocking upload - initial download not complete yet");
			return;
		}

		const dirtySessionIds = dirtySessionIdsRef.current;
		const dirtyFolders = dirtyFoldersRef.current;
		const dirtyFlashcards = dirtyFlashcardsRef.current;
		const dirtyPlanner = dirtyPlannerRef.current;
		const dirtyGamification = dirtyGamificationRef.current;

		// Check if anything is dirty
		if (
			dirtySessionIds.size === 0 &&
			!dirtyFolders &&
			!dirtyFlashcards &&
			!dirtyPlanner &&
			!dirtyGamification
		) {
			providerLog("No dirty data, skipping sync");
			return;
		}

		// Acquire upload lock (mutex)
		const lockAcquired = await puterSync.acquireUploadLock();
		if (!lockAcquired) {
			providerLog("Upload lock busy, will retry via pending flag");
			// The pending flag in puterSync will trigger a retry
			return;
		}

		providerLog("Syncing dirty data...", {
			dirtySessions: dirtySessionIds.size,
			dirtyFolders,
			dirtyFlashcards,
			dirtyPlanner,
			dirtyGamification,
		});

		setSyncStatus(puterSync.getSyncStatus());

		// GET FRESH STATE IMPERATIVELY - prevents stale closure issues
		const currentSessions = useSessionsStore.getState().sessions;
		const currentFolders = useSessionsStore.getState().folders;
		const currentFlashcards = useFlashcardStore.getState();
		const currentBlocks = usePlannerStore.getState().blocks;

		try {
			// Build parallel upload tasks
			const uploadTasks: Promise<void>[] = [];

			// Sync only dirty sessions with ATOMIC INDEXING
			if (dirtySessionIds.size > 0) {
				const sessionsToSync = currentSessions.filter((s) =>
					dirtySessionIds.has(s.id),
				);

				if (sessionsToSync.length > 0) {
					uploadTasks.push(
						(async () => {
							// Save dirty sessions in parallel (no individual index updates)
							await sessionSync.saveSessions(sessionsToSync);
							// ATOMIC: Update the index ONCE after ALL file writes succeed
							await sessionSync.updateSessionsIndex(currentSessions);
							providerLog(
								`Synced ${sessionsToSync.length} sessions (atomic index)`,
							);
						})(),
					);
				}
			}

			// Sync folders if dirty
			if (dirtyFolders) {
				uploadTasks.push(folderSync.saveFolders(currentFolders));
			}

			// Sync flashcards if dirty
			if (dirtyFlashcards) {
				uploadTasks.push(
					flashcardSync.saveAll({
						cards: currentFlashcards.cards,
						covers: currentFlashcards.covers,
						collections: currentFlashcards.collections,
						memos: currentFlashcards.memos,
					}),
				);
			}

			// Sync planner if dirty
			if (dirtyPlanner) {
				uploadTasks.push(plannerSync.saveBlocks(currentBlocks));
			}

			// Sync gamification if dirty
			if (dirtyGamification) {
				const gamificationData = useGamificationStore.getState().getCloudData();
				uploadTasks.push(gamificationSync.saveData(gamificationData));
			}

			// Execute all uploads in parallel
			await Promise.all(uploadTasks);

			// Clear dirty flags only after successful sync
			dirtySessionIdsRef.current = new Set();
			dirtyFoldersRef.current = false;
			dirtyFlashcardsRef.current = false;
			dirtyPlannerRef.current = false;
			dirtyGamificationRef.current = false;

			// Update sync timestamp for heartbeat detection
			await puterSync.updateSyncTimestamp();

			providerLog("✅ Sync complete (parallel uploads)");
		} catch (error) {
			console.log("[PuterSyncProvider] ❌ Sync error:", error);
			// Don't clear dirty flags on error - will retry next cycle
		} finally {
			// Release upload lock
			puterSync.releaseUploadLock();
			setSyncStatus(puterSync.getSyncStatus());

			// Check if there was a pending upload request while we were syncing
			if (puterSync.hasPendingUpload()) {
				providerLog("Processing pending upload request");
				// Use setTimeout to avoid immediate recursion
				setTimeout(() => syncToCloudRef.current(), 100);
			}
		}
	}, [storageMode, isSignedIn]); // Removed stores from dependencies - we use getState() instead

	// Force sync - allows users to manually trigger reconciliation
	const forceSync = useCallback(async () => {
		providerLog("Force sync triggered by user");

		// Flush all pending writes
		await puterSync.forceSync();

		// GET FRESH STATE - mark everything as dirty to force full sync
		const currentSessions = useSessionsStore.getState().sessions;
		for (const session of currentSessions) {
			dirtySessionIdsRef.current.add(session.id);
		}
		dirtyFoldersRef.current = true;
		dirtyFlashcardsRef.current = true;
		dirtyPlannerRef.current = true;
		dirtyGamificationRef.current = true;

		// Trigger immediate sync
		await syncToCloud();

		// Reload from cloud to get any changes
		await loadFromCloud();
	}, [syncToCloud, loadFromCloud]); // Removed sessionsStore.sessions - we use getState()

	// Initialize sync service when user is signed in and mode is puter
	useEffect(() => {
		const initSync = async () => {
			if (storageMode !== "puter" || !isPuterAvailable) return;
			if (!authInitialized || !isSignedIn) return;
			if (isInitializedRef.current || initAttemptedRef.current) return;

			initAttemptedRef.current = true;
			initialDownloadCompleteRef.current = false; // Reset flag
			setIsInitialSyncing(true); // Show loading state
			providerLog("Initializing - DOWNLOAD FIRST before any uploads...");

			const success = await dataSyncManager.initialize();

			if (success) {
				isInitializedRef.current = true;

				try {
					// CRITICAL: Download from cloud FIRST
					// This is the source of truth - local data should not override cloud
					await loadFromCloud();
					providerLog("Initial download complete - uploads now allowed");
				} catch (err) {
					providerLog("Could not load cloud data:", err);
				}

				// NOW allow uploads after initial download is complete
				initialDownloadCompleteRef.current = true;
				setIsInitialSyncing(false);

				// Start heartbeat for remote change detection
				puterSync.startHeartbeat(() => {
					providerLog("Remote change detected via heartbeat, reloading...");
					loadFromCloud();
				});

				// No automatic upload after init - only upload when user makes changes
				// The subscription will handle dirty tracking from this point forward
			} else {
				initAttemptedRef.current = false;
				setIsInitialSyncing(false);
			}
		};

		initSync();
	}, [
		storageMode,
		isPuterAvailable,
		isSignedIn,
		storeIsSignedIn,
		puterSignedIn,
		authInitialized,
		user?.username,
		loadFromCloud,
	]);

	// Reset when user signs out
	useEffect(() => {
		if (!isSignedIn && isInitializedRef.current) {
			providerLog("User signed out, resetting");
			isInitializedRef.current = false;
			initAttemptedRef.current = false;
			initialDownloadCompleteRef.current = false;
			isSyncingFromCloudRef.current = false;
			dirtySessionIdsRef.current = new Set();
			dirtyFoldersRef.current = false;
			dirtyFlashcardsRef.current = false;
			dirtyPlannerRef.current = false;
			dirtyGamificationRef.current = false;
			prevSessionsRef.current = new Map();
			prevFoldersHashRef.current = "";
			prevFlashcardsHashRef.current = "";
			prevPlannerHashRef.current = "";
			prevGamificationHashRef.current = "";
			// This will also stop the heartbeat
			dataSyncManager.reset();
		}
	}, [isSignedIn]);

	// Use a ref to store the latest syncToCloud function
	const syncToCloudRef = useRef(syncToCloud);
	useEffect(() => {
		syncToCloudRef.current = syncToCloud;
	}, [syncToCloud]);

	// Schedule sync with debouncing - stable function that uses ref
	const scheduleSyncToCloud = useCallback(() => {
		const syncInitialized = puterSync.isInitialized();

		if (storageMode !== "puter" || !syncInitialized || !isSignedIn) {
			return;
		}

		if (syncTimeoutRef.current) {
			clearTimeout(syncTimeoutRef.current);
		}

		// Use faster hot path debounce (2s) for responsive sync
		syncTimeoutRef.current = setTimeout(() => {
			syncToCloudRef.current();
		}, HOT_PATH_DEBOUNCE_MS);
	}, [storageMode, isSignedIn]);

	// Subscribe to sessions store changes with dirty tracking
	useEffect(() => {
		if (storageMode !== "puter" || !isSignedIn) return;

		providerLog("Subscribing to sessions store");

		const unsubSessions = useSessionsStore.subscribe((state, prevState) => {
			// Skip dirty tracking if we're syncing from cloud
			// But still update the hash caches to track the new state
			if (isSyncingFromCloudRef.current) {
				// Update session hashes
				for (const session of state.sessions) {
					prevSessionsRef.current.set(session.id, getSessionHash(session));
				}
				// Update folders hash
				prevFoldersHashRef.current = getFoldersHash(state.folders);
				return;
			}

			// Track which sessions changed
			for (const session of state.sessions) {
				const currentHash = getSessionHash(session);
				const prevHash = prevSessionsRef.current.get(session.id);

				if (prevHash !== currentHash) {
					dirtySessionIdsRef.current.add(session.id);
					prevSessionsRef.current.set(session.id, currentHash);
				}
			}

			// Check for deleted sessions by comparing current vs previous state directly
			// This is more reliable than relying on prevSessionsRef which may not be fully populated
			const currentIds = new Set(state.sessions.map((s) => s.id));
			const prevIds = new Set(prevState.sessions.map((s) => s.id));

			for (const prevId of prevIds) {
				if (!currentIds.has(prevId)) {
					// Session was deleted - remove from tracking
					prevSessionsRef.current.delete(prevId);
					dirtySessionIdsRef.current.delete(prevId);

					// Trigger immediate cloud deletion
					const deletedSession = prevState.sessions.find(
						(s) => s.id === prevId,
					);
					if (deletedSession) {
						providerLog("Session deleted, triggering cloud deletion:", prevId);
						sessionSync.deleteSession(prevId, deletedSession.type || "chat");
					}
				}
			}

			// Check for folder changes
			const currentFoldersHash = getFoldersHash(state.folders);
			if (currentFoldersHash !== prevFoldersHashRef.current) {
				// Check for deleted folders
				const currentFolderIds = new Set(state.folders.map((f) => f.id));
				const prevFolderIds = new Set(prevState.folders.map((f) => f.id));

				for (const folderId of prevFolderIds) {
					if (!currentFolderIds.has(folderId)) {
						// Folder was deleted - trigger immediate cloud deletion
						providerLog("Folder deleted, triggering cloud deletion:", folderId);
						folderSync.deleteFolder(folderId);
					}
				}

				dirtyFoldersRef.current = true;
				prevFoldersHashRef.current = currentFoldersHash;
			}

			scheduleSyncToCloud();
		});

		return () => {
			unsubSessions();
		};
	}, [
		storageMode,
		isSignedIn,
		scheduleSyncToCloud,
		getSessionHash,
		getFoldersHash,
	]);

	// Subscribe to flashcards store changes
	useEffect(() => {
		if (storageMode !== "puter" || !isSignedIn) return;

		const unsubFlashcards = useFlashcardStore.subscribe((state) => {
			// Skip dirty tracking if we're syncing from cloud
			// This prevents re-uploading data we just downloaded
			if (isSyncingFromCloudRef.current) {
				// Still update the hash to track the new state
				prevFlashcardsHashRef.current = JSON.stringify({
					cards: state.cards.length,
					covers: state.covers.length,
					collections: state.collections.length,
					memos: state.memos.length,
				});
				return;
			}

			const currentHash = JSON.stringify({
				cards: state.cards.length,
				covers: state.covers.length,
				collections: state.collections.length,
				memos: state.memos.length,
			});

			if (currentHash !== prevFlashcardsHashRef.current) {
				dirtyFlashcardsRef.current = true;
				prevFlashcardsHashRef.current = currentHash;
				scheduleSyncToCloud();
			}
		});

		return () => {
			unsubFlashcards();
		};
	}, [storageMode, isSignedIn, scheduleSyncToCloud]);

	// Subscribe to planner store changes
	useEffect(() => {
		if (storageMode !== "puter" || !isSignedIn) return;

		const unsubPlanner = usePlannerStore.subscribe((state, prevState) => {
			// Skip dirty tracking if we're syncing from cloud
			if (isSyncingFromCloudRef.current) {
				prevPlannerHashRef.current = JSON.stringify({
					blocks: state.blocks.length,
					lastBlock: state.blocks[0]?.start || "",
				});
				return;
			}

			const currentHash = JSON.stringify({
				blocks: state.blocks.length,
				// Use first block's start time as a proxy for changes
				lastBlock: state.blocks[0]?.start || "",
			});

			// Check for deleted blocks - trigger immediate cloud sync
			const currentBlockIds = new Set(state.blocks.map((b) => b.id));
			const prevBlockIds = new Set(prevState.blocks.map((b) => b.id));

			// Find deleted blocks
			const deletedBlockIds: string[] = [];
			for (const blockId of prevBlockIds) {
				if (!currentBlockIds.has(blockId)) {
					deletedBlockIds.push(blockId);
				}
			}

			// If any blocks were deleted, sync immediately
			if (deletedBlockIds.length > 0) {
				providerLog(
					`Planner blocks deleted (${deletedBlockIds.length}), syncing immediately`,
				);
				// Save the updated blocks list immediately (single write for all deletions)
				plannerSync.saveBlocks(state.blocks);
			}

			if (currentHash !== prevPlannerHashRef.current) {
				dirtyPlannerRef.current = true;
				prevPlannerHashRef.current = currentHash;
				scheduleSyncToCloud();
			}
		});

		return () => {
			unsubPlanner();
		};
	}, [storageMode, isSignedIn, scheduleSyncToCloud]);

	// Subscribe to gamification store changes
	useEffect(() => {
		if (storageMode !== "puter" || !isSignedIn) return;

		const unsubGamification = useGamificationStore.subscribe((state) => {
			// Skip dirty tracking if we're syncing from cloud
			if (isSyncingFromCloudRef.current) {
				prevGamificationHashRef.current = JSON.stringify({
					totalFocusedMinutes: state.totalFocusedMinutes,
					totalXP: state.totalXP,
					currentCoins: state.currentCoins,
					dailyStreak: state.dailyStreak,
					purchaseCount: state.purchaseHistory.length,
				});
				return;
			}

			const currentHash = JSON.stringify({
				totalFocusedMinutes: state.totalFocusedMinutes,
				totalXP: state.totalXP,
				currentCoins: state.currentCoins,
				dailyStreak: state.dailyStreak,
				purchaseCount: state.purchaseHistory.length,
			});

			if (currentHash !== prevGamificationHashRef.current) {
				dirtyGamificationRef.current = true;
				prevGamificationHashRef.current = currentHash;
				scheduleSyncToCloud();
			}
		});

		return () => {
			unsubGamification();
		};
	}, [storageMode, isSignedIn, scheduleSyncToCloud]);

	// Context value for exposing sync controls
	const contextValue: PuterSyncContextValue = {
		syncStatus,
		forceSync,
		isSyncing: syncStatus.isSyncing,
		syncDirection: syncStatus.syncDirection,
		isInitialSyncing,
	};

	return (
		<PuterSyncContext.Provider value={contextValue}>
			{children}
		</PuterSyncContext.Provider>
	);
}
