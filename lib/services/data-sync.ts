/**
 * Data Sync Service
 *
 * High-level sync utilities for each data type.
 * Based on official Puter.js documentation patterns.
 *
 * MANIFEST + INCREMENTAL SYNC ARCHITECTURE:
 *
 * 1. MANIFEST PATTERN (Fast Startup):
 *    - sessions_index.json: Lightweight list of {id, title, folderId, updatedAt}
 *    - On startup: Load ONLY the index to populate sidebar
 *    - Full session content loaded on-demand when user clicks a chat
 *
 * 2. DIRTY STATE TRACKING (Efficient Sync):
 *    - Track which session IDs have changed (dirtySessionIds Set)
 *    - On sync: Only upload files in the dirty set
 *    - Clear dirty set after successful sync
 *
 * 3. IMMEDIATE DELETION (No Zombies):
 *    - When user deletes, immediately remove from cloud index
 *    - No reliance on local "deleted IDs" filtering
 */

import {
	puterSync,
	KV_KEYS,
	SessionIndexEntry,
	FolderIndexEntry,
} from "./puter-sync";
import { storage } from "../utils/storage";
import { devLog } from "../utils/dev-logger";
import { ChatSession, ChatFolder, Message, SessionType } from "../types";
import {
	Flashcard,
	CardCover,
	CardCollection,
	CardMemo,
} from "../types/flashcard";
import { TimeBlock } from "../types/planner";

// Relative paths within .app-data/
const PATHS = {
	SESSIONS_CHAT: "sessions/chat",
	SESSIONS_TTS: "sessions/tts",
	FLASHCARDS: "flashcards",
	PLANNER: "planner",
	FOLDERS: "folders.json",
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

// Create a session index entry from a full session
function createSessionIndexEntry(session: ChatSession): SessionIndexEntry {
	const lastMessage = session.messages[session.messages.length - 1];
	const preview = lastMessage?.content?.slice(0, 50) || "";

	return {
		id: session.id,
		title: session.title,
		type: session.type || "chat",
		folderId: session.folderId,
		isPinned: session.isPinned,
		updatedAt: session.updatedAt,
		createdAt: session.createdAt,
		messageCount: session.messages.length,
		preview,
	};
}

// Create a folder index entry from a full folder
function createFolderIndexEntry(folder: ChatFolder): FolderIndexEntry {
	return {
		id: folder.id,
		name: folder.name,
		color: folder.color,
		type: folder.type,
		isPinned: folder.isPinned,
		updatedAt: folder.updatedAt,
		createdAt: folder.createdAt,
	};
}

// ============================================
// SESSION SYNC (with Manifest Pattern)
// ============================================

export const sessionSync = {
	/**
	 * Save a single session to cloud with Hot/Cold tiering
	 * - Hot path: Write recent messages to KV (fast, during streaming)
	 * - Cold path: Debounced full session write to FS
	 */
	async saveSession(
		session: ChatSession,
		options: { immediate?: boolean } = {},
	): Promise<boolean> {
		const { immediate = false } = options;

		// Skip if session is pending deletion (prevents resurrection)
		if (puterSync.isSessionPendingDeletion(session.id)) {
			devLog(`[DataSync] Skipping save for deleted session: ${session.id}`);
			return false;
		}

		// Mark session as active
		puterSync.markSessionActive(session.id);

		// HOT PATH: Always write recent messages to KV (fast)
		await puterSync.writeRecentMessages(session.id, session.messages);

		// Update session metadata in KV for fast access
		await puterSync.kvSet(puterSync.getSessionMetaKey(session.id), {
			id: session.id,
			title: session.title,
			type: session.type,
			folderId: session.folderId,
			isPinned: session.isPinned,
			messageCount: session.messages.length,
			updatedAt: session.updatedAt,
			createdAt: session.createdAt,
		});

		// COLD PATH: Debounced full file write (unless immediate)
		if (immediate || !puterSync.isSessionActive(session.id)) {
			// Write immediately if requested or session is not active
			const path = puterSync.getSessionPath(session.id, session.type || "chat");
			return puterSync.writeFile(path, session);
		}

		// Schedule debounced cold path write
		puterSync.scheduleColdPathWrite(session.id, async () => {
			// Double-check deletion status before writing
			if (puterSync.isSessionPendingDeletion(session.id)) {
				devLog(
					`[DataSync] Skipping cold path write for deleted session: ${session.id}`,
				);
				return false;
			}
			const path = puterSync.getSessionPath(session.id, session.type || "chat");
			await puterSync.writeFile(path, session);
			devLog(`[DataSync] Cold path write for session: ${session.id}`);
			return true;
		});

		return true;
	},

	/**
	 * Save multiple sessions (only the ones provided)
	 * Uses atomic indexing - index updated ONCE after all writes succeed
	 * Filters out any sessions pending deletion
	 */
	async saveSessions(sessions: ChatSession[]): Promise<void> {
		if (sessions.length === 0) return;

		// Filter out sessions pending deletion
		const validSessions = sessions.filter(
			(s) => !puterSync.isSessionPendingDeletion(s.id),
		);

		if (validSessions.length === 0) return;

		// Write all session files in parallel (no individual index updates)
		const results = await Promise.all(
			validSessions.map((session) =>
				this.saveSession(session, { immediate: true }),
			),
		);

		const successCount = results.filter(Boolean).length;
		devLog(`[DataSync] Saved ${successCount}/${validSessions.length} sessions`);
	},

	/**
	 * Update the sessions index manifest (atomic - single write)
	 * Called ONCE after all session writes succeed
	 * Filters out any sessions pending deletion
	 */
	async updateSessionsIndex(allSessions: ChatSession[]): Promise<boolean> {
		// Filter out sessions pending deletion
		const validSessions = allSessions.filter(
			(s) => !puterSync.isSessionPendingDeletion(s.id),
		);
		const index = validSessions.map(createSessionIndexEntry);
		return puterSync.saveSessionsIndex(index);
	},

	/**
	 * Load sessions index (lightweight manifest)
	 * Returns metadata only - no message content
	 */
	async loadSessionsIndex(): Promise<SessionIndexEntry[]> {
		return puterSync.getSessionsIndex();
	},

	/**
	 * Load a single session's full content (on-demand)
	 * Merges cold path (FS) with hot path (KV) for freshest data
	 * Tries KV metadata first for faster cross-device sync
	 */
	async loadSession(
		sessionId: string,
		type: SessionType = "chat",
	): Promise<ChatSession | null> {
		// Check for deletion tombstone first (zero-zombie protection)
		const hasTombstone = await puterSync.hasDeleteTombstone(sessionId);
		if (hasTombstone) {
			devLog(`[DataSync] Session ${sessionId} has tombstone, skipping`);
			return null;
		}

		// Try to get session metadata from KV first (faster for cross-device sync)
		const kvMeta = await puterSync.kvGet<{
			id: string;
			title: string;
			type: SessionType;
			folderId?: string;
			isPinned?: boolean;
			messageCount: number;
			updatedAt: number;
			createdAt: number;
		}>(puterSync.getSessionMetaKey(sessionId));

		// Try to get recent messages from KV (hot path)
		const recentMessages =
			await puterSync.getRecentMessages<Message>(sessionId);

		// Load full session from cold path (FS)
		const path = puterSync.getSessionPath(sessionId, type);
		const fsSession = await puterSync.readFile<ChatSession>(path);

		// If we have KV data but no FS data, construct session from KV
		// This handles the case where FS hasn't propagated yet across devices
		if (!fsSession && kvMeta && recentMessages) {
			devLog(
				`[DataSync] Constructing session from KV (FS not available): ${sessionId}`,
			);
			return {
				id: kvMeta.id,
				title: kvMeta.title,
				type: kvMeta.type || type,
				folderId: kvMeta.folderId,
				isPinned: kvMeta.isPinned,
				messages: recentMessages,
				aiHistory: recentMessages, // Use recent messages as aiHistory
				createdAt: kvMeta.createdAt,
				updatedAt: kvMeta.updatedAt,
			};
		}

		if (!fsSession) return null;

		// Merge FS session with hot path (KV) for any fresher messages
		if (recentMessages && recentMessages.length > 0) {
			// Find messages in KV that are newer than what's in FS
			const fsMessageIds = new Set(fsSession.messages.map((m) => m.id));
			const newMessages = recentMessages.filter((m) => !fsMessageIds.has(m.id));

			if (newMessages.length > 0) {
				fsSession.messages = [...fsSession.messages, ...newMessages];
				devLog(
					`[DataSync] Merged ${newMessages.length} hot path messages for session: ${sessionId}`,
				);
			}
		}

		// If KV metadata is newer, use it for session properties
		if (kvMeta && kvMeta.updatedAt > fsSession.updatedAt) {
			fsSession.title = kvMeta.title;
			fsSession.folderId = kvMeta.folderId;
			fsSession.isPinned = kvMeta.isPinned;
			fsSession.updatedAt = kvMeta.updatedAt;
		}

		return fsSession;
	},

	/**
	 * Load all sessions from cloud
	 * Uses index for efficiency, but also scans directories to catch any
	 * sessions that might not be in the index yet (cross-device sync)
	 * Filters out tombstoned sessions (zero-zombie protection)
	 */
	async loadAllSessions(): Promise<ChatSession[]> {
		const sessions: ChatSession[] = [];
		const loadedIds = new Set<string>();

		// Load from index first (fast path)
		const index = await this.loadSessionsIndex();

		if (index.length > 0) {
			// Load full sessions based on index
			const loadPromises = index.map((entry) =>
				this.loadSession(entry.id, entry.type),
			);
			const results = await Promise.all(loadPromises);

			for (const session of results) {
				if (session) {
					sessions.push(session);
					loadedIds.add(session.id);
				}
			}
		}

		// ALWAYS scan directories to catch sessions not in index
		// This handles cross-device sync where index might be stale
		const chatFiles = await puterSync.listFiles(PATHS.SESSIONS_CHAT);
		const ttsFiles = await puterSync.listFiles(PATHS.SESSIONS_TTS);

		// Load any chat sessions not already loaded from index
		for (const file of chatFiles) {
			if (file.endsWith(".json")) {
				const sessionId = file.replace(".json", "");
				if (!loadedIds.has(sessionId)) {
					// Check tombstone before loading (zero-zombie protection)
					const hasTombstone = await puterSync.hasDeleteTombstone(sessionId);
					if (!hasTombstone) {
						const session = await this.loadSession(sessionId, "chat");
						if (session) {
							sessions.push(session);
							loadedIds.add(session.id);
							devLog(`[DataSync] Found session not in index: ${sessionId}`);
						}
					}
				}
			}
		}

		// Load any TTS sessions not already loaded from index
		for (const file of ttsFiles) {
			if (file.endsWith(".json")) {
				const sessionId = file.replace(".json", "");
				if (!loadedIds.has(sessionId)) {
					const hasTombstone = await puterSync.hasDeleteTombstone(sessionId);
					if (!hasTombstone) {
						const session = await this.loadSession(sessionId, "tts");
						if (session) {
							sessions.push(session);
							loadedIds.add(session.id);
							devLog(`[DataSync] Found TTS session not in index: ${sessionId}`);
						}
					}
				}
			}
		}

		// Update index if we found sessions not in it
		if (sessions.length > index.length) {
			devLog(
				`[DataSync] Updating index with ${sessions.length - index.length} new sessions`,
			);
			await this.updateSessionsIndex(sessions);
		}

		return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
	},

	/**
	 * Get recent messages from KV (fast - hot path)
	 */
	async getRecentMessages(sessionId: string): Promise<Message[]> {
		const messages = await puterSync.getRecentMessages<Message>(sessionId);
		return messages || [];
	},

	/**
	 * Delete a session from cloud immediately (zero-zombie)
	 * No waiting for sync cycle - removes from index right away
	 */
	async deleteSession(
		sessionId: string,
		type: SessionType = "chat",
	): Promise<void> {
		await puterSync.deleteSessionFromCloud(sessionId, type);
	},

	/**
	 * Save all sessions with atomic index update
	 */
	async saveAllSessions(sessions: ChatSession[]): Promise<void> {
		await this.saveSessions(sessions);
		await this.updateSessionsIndex(sessions);
	},

	/**
	 * Force flush all pending file writes
	 * Call this before app close or when user explicitly saves
	 */
	async flushPendingWrites(): Promise<void> {
		await puterSync.flushColdPathWrites();
		devLog("[DataSync] Flushed all pending cold path writes");
	},
};

// ============================================
// FOLDER SYNC (with Manifest Pattern)
// ============================================

export const folderSync = {
	/**
	 * Save all folders and update index
	 */
	async saveFolders(folders: ChatFolder[]): Promise<void> {
		// Write full folders file
		await puterSync.writeFile(PATHS.FOLDERS, folders);

		// Update index
		const index = folders.map(createFolderIndexEntry);
		await puterSync.saveFoldersIndex(index);

		// Also cache in KV for fast reads
		await puterSync.kvSet(KV_KEYS.FOLDER_LIST, folders);

		devLog(`[DataSync] Saved ${folders.length} folders`);
	},

	/**
	 * Load folders index (lightweight)
	 */
	async loadFoldersIndex(): Promise<FolderIndexEntry[]> {
		return puterSync.getFoldersIndex();
	},

	/**
	 * Load full folders from cloud
	 * Reads from FS first (source of truth), falls back to KV
	 * This ensures we get the latest data during cross-device sync
	 */
	async loadFolders(): Promise<ChatFolder[]> {
		// Read from FS first (source of truth for cross-device sync)
		const fsFolders = await puterSync.readFile<ChatFolder[]>(PATHS.FOLDERS);
		if (fsFolders && fsFolders.length > 0) {
			// Update KV cache with fresh data
			await puterSync.kvSet(KV_KEYS.FOLDER_LIST, fsFolders);
			return fsFolders;
		}

		// Fallback to KV (might have data if FS read failed)
		const kvFolders = await puterSync.kvGet<ChatFolder[]>(KV_KEYS.FOLDER_LIST);
		if (kvFolders && kvFolders.length > 0) {
			return kvFolders;
		}

		return [];
	},

	/**
	 * Delete a folder from cloud immediately
	 */
	async deleteFolder(folderId: string): Promise<void> {
		await puterSync.deleteFolderFromCloud(folderId);
	},
};

// ============================================
// FLASHCARD SYNC
// ============================================

export interface FlashcardData {
	cards: Flashcard[];
	covers: CardCover[];
	collections: CardCollection[];
	memos: CardMemo[];
}

export const flashcardSync = {
	// Save all flashcard data to Puter
	async saveAll(data: FlashcardData): Promise<void> {
		await puterSync.writeFiles([
			{ path: `${PATHS.FLASHCARDS}/cards.json`, data: data.cards },
			{ path: `${PATHS.FLASHCARDS}/covers.json`, data: data.covers },
			{ path: `${PATHS.FLASHCARDS}/collections.json`, data: data.collections },
			{ path: `${PATHS.FLASHCARDS}/memos.json`, data: data.memos },
		]);

		// Cache counts in KV
		await puterSync.kvSet("flashcards:counts", {
			cards: data.cards.length,
			covers: data.covers.length,
			collections: data.collections.length,
			memos: data.memos.length,
		});

		devLog(`[DataSync] Saved flashcard data`);
	},

	// Load all flashcard data from Puter
	async loadAll(): Promise<FlashcardData> {
		const [cards, covers, collections, memos] = await puterSync.readFiles<
			Flashcard[] | CardCover[] | CardCollection[] | CardMemo[]
		>([
			`${PATHS.FLASHCARDS}/cards.json`,
			`${PATHS.FLASHCARDS}/covers.json`,
			`${PATHS.FLASHCARDS}/collections.json`,
			`${PATHS.FLASHCARDS}/memos.json`,
		]);

		return {
			cards: (cards as Flashcard[]) || [],
			covers: (covers as CardCover[]) || [],
			collections: (collections as CardCollection[]) || [],
			memos: (memos as CardMemo[]) || [],
		};
	},
};

// ============================================
// GAMIFICATION SYNC
// ============================================

import { GamificationCloudData } from "../types/gamification";

/**
 * Legacy gamification data format (v1 - score-based)
 * Used for migration from old data format
 */
interface LegacyGamificationData {
	currentScore?: number;
	totalScore?: number;
	totalFocusedMinutes?: number;
	currentStreak?: number;
	lastSessionDate?: string | null;
	purchaseHistory?: Array<{
		id: string;
		rewardId: string;
		rewardTitle: string;
		quantity: number;
		cost: number;
		timestamp: number;
	}>;
	lastUpdated?: number;
}

/**
 * Migrate legacy score-based data to new dual-currency format
 * Requirements: 13.2
 */
function migrateGamificationData(
	data: LegacyGamificationData | GamificationCloudData,
): GamificationCloudData {
	// Check if data is already in new format (has totalXP field)
	if ("totalXP" in data && typeof data.totalXP === "number") {
		// Already new format, ensure all fields exist with defaults
		return {
			totalXP: data.totalXP || 0,
			currentCoins: data.currentCoins || 0,
			lifetimeCoinsEarned: data.lifetimeCoinsEarned || 0,
			dailyStreak: data.dailyStreak || 0,
			lastSessionDate: data.lastSessionDate || null,
			totalFocusedMinutes: data.totalFocusedMinutes || 0,
			dailyFocusStats: data.dailyFocusStats || {},
			totalSessionsCompleted: data.totalSessionsCompleted || 0,
			unlockedAchievements: data.unlockedAchievements || [],
			purchaseHistory: data.purchaseHistory || [],
			lastUpdated: data.lastUpdated || Date.now(),
		};
	}

	// Legacy format detected - migrate to new format
	const legacy = data as LegacyGamificationData;
	devLog("[DataSync] Migrating legacy gamification data to v2 format");

	// Convert old score to XP (1:1 mapping)
	const totalXP = legacy.totalScore || legacy.currentScore || 0;

	// Convert old score to coins (start with same amount as XP for migration)
	const currentCoins = legacy.currentScore || 0;

	return {
		totalXP,
		currentCoins,
		lifetimeCoinsEarned: totalXP, // Assume all XP was earned as coins historically
		dailyStreak: legacy.currentStreak || 0,
		lastSessionDate: legacy.lastSessionDate || null,
		totalFocusedMinutes: legacy.totalFocusedMinutes || 0,
		dailyFocusStats: {},
		totalSessionsCompleted: 0,
		unlockedAchievements: [],
		purchaseHistory: legacy.purchaseHistory || [],
		lastUpdated: legacy.lastUpdated || Date.now(),
	};
}

export const gamificationSync = {
	/**
	 * Save gamification data to Puter
	 * Includes all new v2 fields: XP, coins, streak, combo, achievements
	 * Requirements: 13.1, 13.2
	 */
	async saveData(data: GamificationCloudData): Promise<void> {
		await puterSync.writeFile(`${PATHS.PLANNER}/gamification.json`, data);

		// Cache key stats in KV for fast access
		await puterSync.kvSet("gamification:stats", {
			// Dual currency
			totalXP: data.totalXP,
			currentCoins: data.currentCoins,
			lifetimeCoinsEarned: data.lifetimeCoinsEarned,
			// Streak
			dailyStreak: data.dailyStreak,
			lastSessionDate: data.lastSessionDate,
			// Stats
			totalFocusedMinutes: data.totalFocusedMinutes,
			totalSessionsCompleted: data.totalSessionsCompleted,
			// Counts
			achievementCount: data.unlockedAchievements.length,
			purchaseCount: data.purchaseHistory.length,
			lastUpdated: data.lastUpdated,
		});

		devLog(
			`[DataSync] Saved gamification data (XP: ${data.totalXP}, Coins: ${data.currentCoins}, Streak: ${data.dailyStreak})`,
		);
	},

	/**
	 * Load gamification data from Puter
	 * Handles migration from old score-based format
	 * Requirements: 13.1, 13.2
	 */
	async loadData(): Promise<GamificationCloudData | null> {
		const rawData = await puterSync.readFile<
			GamificationCloudData | LegacyGamificationData
		>(`${PATHS.PLANNER}/gamification.json`);

		if (!rawData) return null;

		// Migrate if needed and return normalized data
		return migrateGamificationData(rawData);
	},

	/**
	 * Get quick stats from KV (faster than loading full data)
	 */
	async getQuickStats(): Promise<{
		totalXP: number;
		currentCoins: number;
		dailyStreak: number;
		totalFocusedMinutes: number;
	} | null> {
		const stats = await puterSync.kvGet<{
			totalXP: number;
			currentCoins: number;
			dailyStreak: number;
			totalFocusedMinutes: number;
		}>("gamification:stats");
		return stats;
	},
};

// ============================================
// PLANNER SYNC
// ============================================

export const plannerSync = {
	// Save planner blocks to Puter
	async saveBlocks(blocks: TimeBlock[]): Promise<void> {
		await puterSync.writeFile(`${PATHS.PLANNER}/blocks.json`, blocks);
		await puterSync.kvSet("planner:blockCount", blocks.length);
		devLog(`[DataSync] Saved ${blocks.length} planner blocks`);
	},

	// Load planner blocks from Puter
	async loadBlocks(): Promise<TimeBlock[]> {
		const blocks = await puterSync.readFile<TimeBlock[]>(
			`${PATHS.PLANNER}/blocks.json`,
		);
		return blocks || [];
	},

	// Delete a block by saving the updated blocks list immediately
	// This ensures deletions are synced right away (zero-zombie pattern)
	async deleteBlock(
		blockId: string,
		remainingBlocks: TimeBlock[],
	): Promise<void> {
		devLog(`[DataSync] Deleting planner block: ${blockId}`);
		// Save the updated blocks list immediately (without the deleted block)
		await this.saveBlocks(remainingBlocks);
	},
};

// ============================================
// SETTINGS SYNC
// ============================================

export const settingsSync = {
	// Save settings to Puter KV
	async saveSettings(settings: Record<string, unknown>): Promise<void> {
		await puterSync.kvSet(KV_KEYS.SETTINGS, settings);
		devLog(`[DataSync] Saved settings`);
	},

	// Load settings from Puter KV
	async loadSettings<T>(): Promise<T | null> {
		return puterSync.kvGet<T>(KV_KEYS.SETTINGS);
	},
};

// ============================================
// FULL SYNC MANAGER
// ============================================

export const dataSyncManager = {
	// Initialize sync service
	async initialize(): Promise<boolean> {
		return puterSync.initialize();
	},

	// Check if Puter is available
	isPuterAvailable(): boolean {
		return puterSync.isPuterAvailable();
	},

	// Check if initialized
	isInitialized(): boolean {
		return puterSync.isInitialized();
	},

	// Get sync status
	getSyncStatus() {
		return puterSync.getSyncStatus();
	},

	// Sync all data from local to Puter
	async syncToCloud(): Promise<void> {
		devLog("[DataSync] Starting full sync to cloud...");

		// Get all local data
		const sessions = storage.getSessions();
		const folders = storage.getFolders();

		// Sync sessions and folders
		await sessionSync.saveAllSessions(sessions);
		await folderSync.saveFolders(folders);

		devLog("[DataSync] Full sync to cloud complete");
	},

	// Sync all data from Puter to local
	async syncFromCloud(): Promise<{
		sessions: ChatSession[];
		folders: ChatFolder[];
		flashcards: FlashcardData;
		blocks: TimeBlock[];
		gamification: GamificationCloudData | null;
	}> {
		devLog("[DataSync] Starting full sync from cloud...");

		// Invalidate manifest caches before loading fresh data
		puterSync.invalidateManifestCache();

		// Clear pending deletions since we're getting fresh data from cloud
		puterSync.clearPendingDeletions();

		const [sessions, folders, flashcards, blocks, gamification] =
			await Promise.all([
				sessionSync.loadAllSessions(),
				folderSync.loadFolders(),
				flashcardSync.loadAll(),
				plannerSync.loadBlocks(),
				gamificationSync.loadData(),
			]);

		devLog("[DataSync] Full sync from cloud complete");

		return { sessions, folders, flashcards, blocks, gamification };
	},

	// Clear all cloud data
	async clearCloudData(): Promise<void> {
		await puterSync.clearAllData();
	},

	// Reset sync state
	reset(): void {
		puterSync.reset();
	},
};
