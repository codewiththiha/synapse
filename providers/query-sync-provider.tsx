"use client";

/**
 * Query Sync Provider (v2)
 *
 * FIXED: Previous version only hydrated once on mount.
 * This version uses useEffect to ALWAYS sync React Query data to Zustand
 * whenever the query data changes (initial load, refetch, invalidation).
 *
 * Architecture:
 * 1. React Query fetches from Puter (server state)
 * 2. useEffect watches query.data and syncs to Zustand (client state)
 * 3. Zustand subscriptions detect local changes and trigger mutations
 * 4. Mutations update Puter, then invalidate queries to refetch
 *
 * Key Fix: Data flows React Query -> Zustand on EVERY data change, not just mount
 */

import {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
	useRef,
} from "react";
import {
	QueryClient,
	QueryClientProvider,
	useQuery,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
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
	FlashcardData,
} from "@/lib/services/data-sync";
import { puterSync, SyncStatus } from "@/lib/services/puter-sync";
import { queryKeys } from "@/lib/query-keys";
import { ChatSession, ChatFolder } from "@/lib/types";
import { TimeBlock } from "@/lib/types/planner";

// Debug mode - set to false for production
const DEBUG_PROVIDER = process.env.NODE_ENV === "development";

function providerLog(...args: unknown[]) {
	if (DEBUG_PROVIDER) {
		console.log("[QuerySyncProvider]", ...args);
	}
}

// ============================================
// CONTEXT
// ============================================

interface QuerySyncContextValue {
	syncStatus: SyncStatus;
	forceSync: () => Promise<void>;
	isSyncing: boolean;
	syncDirection: "up" | "down" | "idle";
	isInitialSyncing: boolean;
}

const QuerySyncContext = createContext<QuerySyncContextValue | null>(null);

export function useQuerySyncContext() {
	return useContext(QuerySyncContext);
}

// Alias for backward compatibility
export const usePuterSyncContext = useQuerySyncContext;

// ============================================
// QUERY CLIENT
// ============================================

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 30, // 30 seconds
			gcTime: 1000 * 60 * 5, // 5 minutes
			retry: 3,
			retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
			refetchOnWindowFocus: false,
		},
		mutations: {
			retry: 2,
		},
	},
});

// ============================================
// LWW MERGE FUNCTIONS
// ============================================

function mergeSessionsLWW(
	cloudSessions: ChatSession[],
	localSessions: ChatSession[],
	dirtyIds: Set<string>,
): ChatSession[] {
	const merged: ChatSession[] = [];
	const localMap = new Map(localSessions.map((s) => [s.id, s]));
	const processedIds = new Set<string>();

	for (const cloudSession of cloudSessions) {
		const localSession = localMap.get(cloudSession.id);

		if (localSession) {
			// If local is dirty (has unsaved changes), keep local
			if (dirtyIds.has(localSession.id)) {
				merged.push(localSession);
			} else if (localSession.updatedAt > cloudSession.updatedAt) {
				merged.push(localSession);
			} else if (cloudSession.updatedAt > localSession.updatedAt) {
				merged.push(cloudSession);
			} else {
				// Same timestamp - prefer cloud (source of truth)
				merged.push(cloudSession);
			}
		} else {
			merged.push(cloudSession);
		}

		processedIds.add(cloudSession.id);
	}

	// Keep local-only sessions (new, not yet synced)
	for (const localSession of localSessions) {
		if (!processedIds.has(localSession.id)) {
			merged.push(localSession);
		}
	}

	return merged.sort((a, b) => b.updatedAt - a.updatedAt);
}

function mergeFoldersLWW(
	cloudFolders: ChatFolder[],
	localFolders: ChatFolder[],
): ChatFolder[] {
	const merged: ChatFolder[] = [];
	const localMap = new Map(localFolders.map((f) => [f.id, f]));
	const processedIds = new Set<string>();

	for (const cloudFolder of cloudFolders) {
		const localFolder = localMap.get(cloudFolder.id);

		if (localFolder) {
			merged.push(
				localFolder.updatedAt > cloudFolder.updatedAt
					? localFolder
					: cloudFolder,
			);
		} else {
			merged.push(cloudFolder);
		}

		processedIds.add(cloudFolder.id);
	}

	for (const localFolder of localFolders) {
		if (!processedIds.has(localFolder.id)) {
			merged.push(localFolder);
		}
	}

	return merged;
}

// ============================================
// SYNC BRIDGE COMPONENT
// ============================================

/**
 * SyncBridge: The core component that bridges React Query and Zustand
 *
 * KEY FIX: Uses useEffect to watch query.data and sync to Zustand
 * on EVERY change, not just initial mount.
 */
function SyncBridge({
	onInitialSyncComplete,
}: {
	onInitialSyncComplete: () => void;
}) {
	const queryClient = useQueryClient();
	const { settings } = useSettingsStore();
	const { isSignedIn } = useAuthStore();

	const storageMode = settings.storageMode || "local";
	const enabled =
		storageMode === "puter" && isSignedIn && puterSync.isInitialized();

	// Track dirty sessions (local changes not yet synced)
	const dirtySessionIdsRef = useRef<Set<string>>(new Set());
	const dirtyFoldersRef = useRef(false);
	const dirtyFlashcardsRef = useRef(false);
	const dirtyPlannerRef = useRef(false);

	// Track if we're currently syncing FROM cloud (to prevent dirty marking)
	const isSyncingFromCloudRef = useRef(false);

	// Track previous hashes for change detection
	const prevSessionHashesRef = useRef<Map<string, string>>(new Map());
	const prevFoldersHashRef = useRef("");
	const prevFlashcardsHashRef = useRef("");
	const prevPlannerHashRef = useRef("");

	// Track if initial sync is done
	const initialSyncDoneRef = useRef(false);

	// Save timeout ref
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// ============================================
	// QUERIES (Fetch from cloud)
	// ============================================

	const sessionsQuery = useQuery({
		queryKey: queryKeys.sessions.list(),
		queryFn: async () => {
			providerLog("Fetching sessions from cloud...");
			puterSync.invalidateManifestCache();
			return sessionSync.loadAllSessions();
		},
		enabled,
		staleTime: 1000 * 30,
	});

	const foldersQuery = useQuery({
		queryKey: queryKeys.folders(),
		queryFn: async () => {
			providerLog("Fetching folders from cloud...");
			return folderSync.loadFolders();
		},
		enabled,
		staleTime: 1000 * 30,
	});

	const flashcardsQuery = useQuery({
		queryKey: queryKeys.flashcards(),
		queryFn: async () => {
			providerLog("Fetching flashcards from cloud...");
			return flashcardSync.loadAll();
		},
		enabled,
		staleTime: 1000 * 60,
	});

	const plannerQuery = useQuery({
		queryKey: queryKeys.planner(),
		queryFn: async () => {
			providerLog("Fetching planner from cloud...");
			return plannerSync.loadBlocks();
		},
		enabled,
		staleTime: 1000 * 60,
	});

	// ============================================
	// MUTATIONS (Write to cloud)
	// ============================================

	// FIX: Only upload dirty sessions, not all sessions
	const saveSessionsMutation = useMutation({
		mutationFn: async ({
			sessions,
			dirtyIds,
		}: {
			sessions: ChatSession[];
			dirtyIds: Set<string>;
		}) => {
			// 1. Filter: Only upload the specific files that changed
			const sessionsToUpload = sessions.filter((s) => dirtyIds.has(s.id));

			// Log exactly what we're uploading
			console.log(
				`[QuerySyncProvider] 📤 Uploading ${sessionsToUpload.length} session(s):`,
				sessionsToUpload.map((s) => s.title || s.id),
			);

			// 2. Parallel Upload: Save only the dirty files with immediate: true
			await Promise.all(
				sessionsToUpload.map((session) =>
					sessionSync.saveSession(session, { immediate: true }),
				),
			);

			// 3. Manifest Update: Needs FULL list to keep the sidebar correct
			await sessionSync.updateSessionsIndex(sessions);
			await puterSync.updateSyncTimestamp();

			console.log(`[QuerySyncProvider] ✅ Upload complete`);
		},
		onSuccess: () => {
			providerLog("Sessions sync complete");
			// NOTE: We intentionally do NOT invalidate queries here
			// The data we just wrote is already in Zustand, no need to refetch
		},
	});

	const saveFoldersMutation = useMutation({
		mutationFn: async (folders: ChatFolder[]) => {
			providerLog("Saving folders to cloud...", folders.length);
			await folderSync.saveFolders(folders);
			await puterSync.updateSyncTimestamp();
		},
	});

	const saveFlashcardsMutation = useMutation({
		mutationFn: async (data: FlashcardData) => {
			providerLog("Saving flashcards to cloud...");
			await flashcardSync.saveAll(data);
			await puterSync.updateSyncTimestamp();
		},
	});

	const savePlannerMutation = useMutation({
		mutationFn: async (blocks: TimeBlock[]) => {
			providerLog("Saving planner to cloud...", blocks.length);
			await plannerSync.saveBlocks(blocks);
			await puterSync.updateSyncTimestamp();
		},
	});

	// ============================================
	// DEBOUNCED SAVE FUNCTION (defined before subscriptions)
	// ============================================

	const scheduleSave = useCallback(() => {
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		saveTimeoutRef.current = setTimeout(async () => {
			providerLog("Executing scheduled save...");

			const state = useSessionsStore.getState();
			const flashcardState = useFlashcardStore.getState();
			const plannerState = usePlannerStore.getState();

			try {
				// Save dirty sessions - FIX: Only upload changed files
				if (dirtySessionIdsRef.current.size > 0) {
					// Create a COPY of the set to pass to the mutation (snapshot)
					// This captures which IDs were dirty at this moment
					const dirtyIdsSnapshot = new Set(dirtySessionIdsRef.current);
					providerLog("Saving dirty sessions:", dirtyIdsSnapshot.size);

					// Pass object with both pieces of data
					await saveSessionsMutation.mutateAsync({
						sessions: state.sessions,
						dirtyIds: dirtyIdsSnapshot,
					});

					// Only clear the IDs we actually just saved
					// (In case user typed MORE while upload was happening)
					for (const id of dirtyIdsSnapshot) {
						dirtySessionIdsRef.current.delete(id);
					}
				}

				// Save folders if dirty
				if (dirtyFoldersRef.current) {
					providerLog("Saving dirty folders");
					await saveFoldersMutation.mutateAsync(state.folders);
					dirtyFoldersRef.current = false;
				}

				// Save flashcards if dirty
				if (dirtyFlashcardsRef.current) {
					providerLog("Saving dirty flashcards");
					await saveFlashcardsMutation.mutateAsync({
						cards: flashcardState.cards,
						covers: flashcardState.covers,
						collections: flashcardState.collections,
						memos: flashcardState.memos,
					});
					dirtyFlashcardsRef.current = false;
				}

				// Save planner if dirty
				if (dirtyPlannerRef.current) {
					providerLog("Saving dirty planner");
					await savePlannerMutation.mutateAsync(plannerState.blocks);
					dirtyPlannerRef.current = false;
				}
			} catch (error) {
				providerLog("Save error:", error);
			}
		}, 2000); // 2 second debounce
	}, [
		saveSessionsMutation,
		saveFoldersMutation,
		saveFlashcardsMutation,
		savePlannerMutation,
	]);

	// ============================================
	// SYNC: Cloud -> Zustand (on query data change)
	// ============================================

	// Sync sessions from cloud to Zustand
	useEffect(() => {
		if (!enabled || !sessionsQuery.data || !foldersQuery.data) return;
		if (sessionsQuery.isFetching || foldersQuery.isFetching) return;

		isSyncingFromCloudRef.current = true;
		providerLog("Syncing sessions/folders from cloud to Zustand...");

		const localSessions = useSessionsStore.getState().sessions;
		const localFolders = useSessionsStore.getState().folders;

		const mergedSessions = mergeSessionsLWW(
			sessionsQuery.data,
			localSessions,
			dirtySessionIdsRef.current,
		);
		const mergedFolders = mergeFoldersLWW(foldersQuery.data, localFolders);

		// Update Zustand store
		useSessionsStore.getState().syncFromCloud(mergedSessions, mergedFolders);

		// Update hash tracking
		for (const session of mergedSessions) {
			prevSessionHashesRef.current.set(
				session.id,
				`${session.messages.length}:${session.updatedAt}:${session.title}`,
			);
		}
		prevFoldersHashRef.current = mergedFolders
			.map((f) => `${f.id}:${f.updatedAt}`)
			.join("|");

		// Clear dirty flags for sessions that were synced
		dirtySessionIdsRef.current.clear();
		dirtyFoldersRef.current = false;

		// Mark initial sync complete
		if (!initialSyncDoneRef.current) {
			initialSyncDoneRef.current = true;
			onInitialSyncComplete();
			providerLog("✅ Initial sync complete");
		}

		puterSync.setLocalSyncTimestamp(Date.now());

		setTimeout(() => {
			isSyncingFromCloudRef.current = false;
		}, 100);
	}, [
		enabled,
		sessionsQuery.data,
		sessionsQuery.isFetching,
		foldersQuery.data,
		foldersQuery.isFetching,
		onInitialSyncComplete,
	]);

	// Sync flashcards from cloud to Zustand
	useEffect(() => {
		if (!enabled || !flashcardsQuery.data) return;
		if (flashcardsQuery.isFetching) return;
		if (dirtyFlashcardsRef.current) return; // Don't overwrite local changes

		providerLog("Syncing flashcards from cloud to Zustand...");

		useFlashcardStore.setState({
			cards: flashcardsQuery.data.cards,
			covers: flashcardsQuery.data.covers,
			collections: flashcardsQuery.data.collections,
			memos: flashcardsQuery.data.memos,
		});

		prevFlashcardsHashRef.current = JSON.stringify({
			cards: flashcardsQuery.data.cards.length,
			covers: flashcardsQuery.data.covers.length,
		});
	}, [enabled, flashcardsQuery.data, flashcardsQuery.isFetching]);

	// Sync planner from cloud to Zustand
	useEffect(() => {
		if (!enabled || !plannerQuery.data) return;
		if (plannerQuery.isFetching) return;
		if (dirtyPlannerRef.current) return;

		providerLog("Syncing planner from cloud to Zustand...");

		usePlannerStore.setState({ blocks: plannerQuery.data });

		prevPlannerHashRef.current = JSON.stringify({
			count: plannerQuery.data.length,
		});
	}, [enabled, plannerQuery.data, plannerQuery.isFetching]);

	// ============================================
	// SYNC: Zustand -> Cloud (on local changes)
	// ============================================

	// Subscribe to sessions store changes
	useEffect(() => {
		if (!enabled) return;

		const unsubscribe = useSessionsStore.subscribe((state, prevState) => {
			if (isSyncingFromCloudRef.current) return;

			// Detect changed sessions
			for (const session of state.sessions) {
				const hash = `${session.messages.length}:${session.updatedAt}:${session.title}`;
				const prevHash = prevSessionHashesRef.current.get(session.id);

				if (prevHash !== hash) {
					dirtySessionIdsRef.current.add(session.id);
					prevSessionHashesRef.current.set(session.id, hash);
				}
			}

			// Detect deleted sessions
			const currentIds = new Set(state.sessions.map((s) => s.id));
			for (const prevSession of prevState.sessions) {
				if (!currentIds.has(prevSession.id)) {
					prevSessionHashesRef.current.delete(prevSession.id);
					dirtySessionIdsRef.current.delete(prevSession.id);
					// Trigger immediate deletion
					sessionSync.deleteSession(prevSession.id, prevSession.type || "chat");
				}
			}

			// Detect folder changes
			const foldersHash = state.folders
				.map((f) => `${f.id}:${f.updatedAt}`)
				.join("|");
			if (foldersHash !== prevFoldersHashRef.current) {
				// Check for deleted folders
				const currentFolderIds = new Set(state.folders.map((f) => f.id));
				for (const prevFolder of prevState.folders) {
					if (!currentFolderIds.has(prevFolder.id)) {
						folderSync.deleteFolder(prevFolder.id);
					}
				}
				dirtyFoldersRef.current = true;
				prevFoldersHashRef.current = foldersHash;
			}

			// Debounced save
			scheduleSave();
		});

		return () => unsubscribe();
	}, [enabled, scheduleSave]);

	// Subscribe to flashcards store changes
	useEffect(() => {
		if (!enabled) return;

		const unsubscribe = useFlashcardStore.subscribe((state) => {
			if (isSyncingFromCloudRef.current) return;

			const hash = JSON.stringify({
				cards: state.cards.length,
				covers: state.covers.length,
			});

			if (hash !== prevFlashcardsHashRef.current) {
				dirtyFlashcardsRef.current = true;
				prevFlashcardsHashRef.current = hash;
				scheduleSave();
			}
		});

		return () => unsubscribe();
	}, [enabled, scheduleSave]);

	// Subscribe to planner store changes
	useEffect(() => {
		if (!enabled) return;

		const unsubscribe = usePlannerStore.subscribe((state) => {
			if (isSyncingFromCloudRef.current) return;

			const hash = JSON.stringify({ count: state.blocks.length });

			if (hash !== prevPlannerHashRef.current) {
				dirtyPlannerRef.current = true;
				prevPlannerHashRef.current = hash;
				scheduleSave();
			}
		});

		return () => unsubscribe();
	}, [enabled, scheduleSave]);

	// ============================================
	// HEARTBEAT (Remote change detection)
	// ============================================

	useEffect(() => {
		if (!enabled) return;

		puterSync.startHeartbeat(() => {
			providerLog("Remote change detected via heartbeat, refetching...");
			// Invalidate all queries to trigger refetch
			queryClient.invalidateQueries({ queryKey: queryKeys.all });
		});

		return () => {
			puterSync.stopHeartbeat();
		};
	}, [enabled, queryClient]);

	return null;
}

// ============================================
// MAIN PROVIDER
// ============================================

interface QuerySyncProviderProps {
	children: React.ReactNode;
}

function QuerySyncProviderInner({ children }: QuerySyncProviderProps) {
	const queryClient = useQueryClient();
	const { settings } = useSettingsStore();
	const { isSignedIn, isInitialized: authInitialized } = useAuthStore();

	const storageMode = settings.storageMode || "local";
	const isPuterAvailable = puterSync.isPuterAvailable();

	const [isInitialSyncing, setIsInitialSyncing] = useState(false);
	const [syncStatus, setSyncStatus] = useState<SyncStatus>(
		puterSync.getSyncStatus(),
	);
	const initAttemptedRef = useRef(false);
	const isInitializedRef = useRef(false);

	// Check Puter auth state
	const [puterSignedIn, setPuterSignedIn] = useState(false);

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

		let checkCount = 0;
		const intervalId = setInterval(() => {
			checkCount++;
			const signedIn = checkPuterAuth();
			if (signedIn || checkCount >= 10) {
				clearInterval(intervalId);
			}
		}, 1000);

		return () => clearInterval(intervalId);
	}, [isSignedIn, authInitialized]);

	const effectiveSignedIn = puterSignedIn || isSignedIn;

	// Initialize sync service
	useEffect(() => {
		const initSync = async () => {
			if (storageMode !== "puter" || !isPuterAvailable) return;
			if (!authInitialized || !effectiveSignedIn) return;
			if (isInitializedRef.current || initAttemptedRef.current) return;

			initAttemptedRef.current = true;
			setIsInitialSyncing(true);
			providerLog("Initializing sync service...");

			const success = await dataSyncManager.initialize();

			if (success) {
				isInitializedRef.current = true;
				providerLog("Sync service initialized");
			} else {
				initAttemptedRef.current = false;
				setIsInitialSyncing(false);
			}
		};

		initSync();
	}, [storageMode, isPuterAvailable, effectiveSignedIn, authInitialized]);

	// Reset on sign out
	useEffect(() => {
		if (!effectiveSignedIn && isInitializedRef.current) {
			providerLog("User signed out, resetting");
			isInitializedRef.current = false;
			initAttemptedRef.current = false;
			dataSyncManager.reset();
			queryClient.clear();
		}
	}, [effectiveSignedIn, queryClient]);

	// Update sync status periodically
	useEffect(() => {
		const interval = setInterval(() => {
			setSyncStatus(puterSync.getSyncStatus());
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	// Force sync
	const forceSync = useCallback(async () => {
		providerLog("Force sync triggered");
		await puterSync.forceSync();
		puterSync.invalidateManifestCache();
		puterSync.clearPendingDeletions();
		await queryClient.resetQueries({ queryKey: queryKeys.all });
	}, [queryClient]);

	const handleInitialSyncComplete = useCallback(() => {
		setIsInitialSyncing(false);
	}, []);

	const contextValue: QuerySyncContextValue = {
		syncStatus,
		forceSync,
		isSyncing: syncStatus.isSyncing,
		syncDirection: syncStatus.syncDirection,
		isInitialSyncing,
	};

	return (
		<QuerySyncContext.Provider value={contextValue}>
			{isInitializedRef.current && (
				<SyncBridge onInitialSyncComplete={handleInitialSyncComplete} />
			)}
			{children}
		</QuerySyncContext.Provider>
	);
}

export function QuerySyncProvider({ children }: QuerySyncProviderProps) {
	return (
		<QueryClientProvider client={queryClient}>
			<QuerySyncProviderInner>{children}</QuerySyncProviderInner>
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	);
}

// Re-export for backward compatibility
export { QuerySyncProvider as PuterSyncProvider };
