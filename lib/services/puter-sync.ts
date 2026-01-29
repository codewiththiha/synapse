/**
 * Puter Sync Service
 *
 * Based on official Puter.js documentation.
 * Uses Cloud Storage (FS) for large data and Key-Value Store (KV) for fast access.
 *
 * IMPORTANT: Puter sandboxes apps by domain. Each domain gets its own isolated
 * storage in ~/AppData/<app-id>/. This means:
 * - localhost:3000 has different storage than yourapp.com
 * - But yourapp.com syncs across all browsers/devices for the same user
 *
 * Storage Structure (in app sandbox):
 * ~/AppData/<app-id>/
 *   ├── sessions/
 *   │   ├── chat/
 *   │   │   └── {sessionId}.json
 *   │   └── tts/
 *   │       └── {sessionId}.json
 *   ├── flashcards/
 *   │   ├── cards.json
 *   │   ├── covers.json
 *   │   ├── collections.json
 *   │   └── memos.json
 *   ├── planner/
 *   │   └── blocks.json
 *   ├── sessions_index.json  <- NEW: Lightweight manifest
 *   ├── folders_index.json   <- NEW: Lightweight manifest
 *   └── folders.json
 *
 * MANIFEST PATTERN:
 * - sessions_index.json contains lightweight metadata (id, title, folderId, updatedAt)
 * - Full session content loaded on-demand when user opens a chat
 * - Eliminates N+1 reads on startup
 */

// App data folder - relative path goes to app's sandbox automatically
const APP_DATA_DIR = "puter-chat-data";

// KV keys for fast access
const KV_KEYS = {
	RECENT_MESSAGES: (sessionId: string) => `recent:${sessionId}`,
	SESSION_META: (sessionId: string) => `meta:${sessionId}`,
	DELETED_TOMBSTONE: (sessionId: string) => `deleted:${sessionId}`,
	SETTINGS: "app:settings",
	LAST_SYNC: "app:lastSync",
	SESSION_LIST: "sessions:list",
	FOLDER_LIST: "folders:list",
	// Manifest keys
	SESSIONS_INDEX: "manifest:sessions",
	FOLDERS_INDEX: "manifest:folders",
	// Hot path keys for active sessions
	ACTIVE_SESSION: "active:session",
	// Heartbeat key for cross-device sync detection
	LAST_SYNC_TIMESTAMP: "sync:lastTimestamp",
} as const;

// Hot/Cold tiering constants
const HOT_PATH_MESSAGE_LIMIT = 10;
const HOT_PATH_ACTIVE_THRESHOLD_MS = 30 * 1000; // 30 seconds
const HOT_PATH_DEBOUNCE_MS = 2 * 1000; // 2 seconds (faster for KV)
const COLD_PATH_DEBOUNCE_MS = 10 * 1000; // 10 seconds (for FS)
const TOMBSTONE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (extended for offline devices)
const HEARTBEAT_INTERVAL_MS = 15 * 1000; // 15 seconds for remote change detection
const MANIFEST_LOCK_TIMEOUT_MS = 5000; // 5 seconds max wait for manifest lock

// Types
export type StorageMode = "local" | "puter";

export interface SyncStatus {
	isOnline: boolean;
	lastSync: number | null;
	pendingChanges: number;
	error: string | null;
	isSyncing: boolean;
	syncDirection: "up" | "down" | "idle";
}

// NEW: Lightweight session metadata for manifest
export interface SessionIndexEntry {
	id: string;
	title: string;
	type: "chat" | "tts";
	folderId?: string;
	isPinned?: boolean;
	updatedAt: number;
	createdAt: number;
	messageCount: number;
	preview?: string; // First ~50 chars of last message
}

// NEW: Lightweight folder metadata for manifest
export interface FolderIndexEntry {
	id: string;
	name: string;
	color?: string;
	type?: "chat" | "tts";
	isPinned?: boolean;
	updatedAt: number;
	createdAt: number;
}

// Debug mode - set to false to reduce console noise
const DEBUG_SYNC = false;

function syncLog(...args: unknown[]) {
	if (DEBUG_SYNC) {
		console.log("[PuterSync]", ...args);
	}
}

class PuterSyncService {
	private syncStatus: SyncStatus = {
		isOnline: false,
		lastSync: null,
		pendingChanges: 0,
		error: null,
		isSyncing: false,
		syncDirection: "idle",
	};
	private initialized = false;

	// Hot/Cold tiering: debounce timers for cold path writes
	private coldPathTimers: Map<string, NodeJS.Timeout> = new Map();
	// Hot path timer for KV writes (faster)
	private hotPathTimer: NodeJS.Timeout | null = null;
	// Track active sessions for hot path
	private activeSessionTimestamps: Map<string, number> = new Map();
	// Pending manifest updates for atomic batching
	private pendingManifestUpdates: Set<string> = new Set();
	private manifestUpdateTimer: NodeJS.Timeout | null = null;

	// Sync mutex to prevent race conditions
	private isSyncingUp = false;
	private isSyncingDown = false;
	private pendingSyncUp = false;
	private pendingSyncDown = false;

	// Manifest lock to prevent race conditions during index updates
	private manifestLock = false;
	private manifestLockQueue: Array<() => void> = [];
	// Canonical in-memory index to prevent stale reads
	private sessionsIndexCache: SessionIndexEntry[] | null = null;
	private foldersIndexCache: FolderIndexEntry[] | null = null;
	// Track sessions pending deletion to prevent resurrection
	private pendingDeletions: Set<string> = new Set();

	// Heartbeat for remote change detection
	private heartbeatInterval: NodeJS.Timeout | null = null;
	private localLastSyncTimestamp = 0;
	private onRemoteChangeCallback: (() => void) | null = null;

	// Check if Puter is available
	isPuterAvailable(): boolean {
		return typeof window !== "undefined" && !!window.puter;
	}

	// Check if user is signed in
	async isUserSignedIn(): Promise<boolean> {
		if (!this.isPuterAvailable()) return false;
		try {
			return window.puter.auth.isSignedIn();
		} catch {
			return false;
		}
	}

	// Initialize the service and create directory structure
	async initialize(): Promise<boolean> {
		if (this.initialized) return true;

		if (!this.isPuterAvailable()) {
			syncLog("Puter not available");
			return false;
		}

		const signedIn = await this.isUserSignedIn();
		if (!signedIn) {
			syncLog("User not signed in");
			return false;
		}

		try {
			syncLog("Initializing...");
			await this.ensureDirectories();
			this.initialized = true;
			this.syncStatus.isOnline = true;
			console.log("[PuterSync] ✅ Initialized");
			return true;
		} catch (error) {
			console.log("[PuterSync] ❌ Init failed:", error);
			this.syncStatus.error =
				error instanceof Error ? error.message : "Init failed";
			return false;
		}
	}

	// Ensure all required directories exist
	private async ensureDirectories(): Promise<void> {
		const dirs = [
			APP_DATA_DIR,
			`${APP_DATA_DIR}/sessions`,
			`${APP_DATA_DIR}/sessions/chat`,
			`${APP_DATA_DIR}/sessions/tts`,
			`${APP_DATA_DIR}/flashcards`,
			`${APP_DATA_DIR}/planner`,
		];

		for (const dir of dirs) {
			await this.ensureDirectory(dir);
		}
	}

	private async ensureDirectory(path: string): Promise<void> {
		try {
			await window.puter.fs.mkdir(path, { createMissingParents: true });
			syncLog("Directory ready:", path);
		} catch (error: unknown) {
			const err = error as { code?: string; message?: string };
			if (
				err.code !== "path_already_exists" &&
				!err.message?.includes("already exists") &&
				!err.message?.includes("exists")
			) {
				throw error;
			}
		}
	}

	// Get sync status
	getSyncStatus(): SyncStatus {
		return { ...this.syncStatus };
	}

	// Set sync direction (for UI feedback)
	setSyncDirection(direction: "up" | "down" | "idle"): void {
		this.syncStatus.syncDirection = direction;
		this.syncStatus.isSyncing = direction !== "idle";
	}

	// Check if initialized
	isInitialized(): boolean {
		return this.initialized;
	}

	// ============================================
	// MANIFEST LOCK (Prevents Race Conditions)
	// ============================================

	// Acquire manifest lock with timeout
	private async acquireManifestLock(): Promise<boolean> {
		if (!this.manifestLock) {
			this.manifestLock = true;
			return true;
		}

		// Wait for lock with timeout
		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				// Remove from queue and fail
				const idx = this.manifestLockQueue.indexOf(release);
				if (idx !== -1) this.manifestLockQueue.splice(idx, 1);
				syncLog("Manifest lock timeout");
				resolve(false);
			}, MANIFEST_LOCK_TIMEOUT_MS);

			const release = () => {
				clearTimeout(timeout);
				this.manifestLock = true;
				resolve(true);
			};

			this.manifestLockQueue.push(release);
		});
	}

	// Release manifest lock
	private releaseManifestLock(): void {
		if (this.manifestLockQueue.length > 0) {
			const next = this.manifestLockQueue.shift();
			next?.();
		} else {
			this.manifestLock = false;
		}
	}

	// ============================================
	// SYNC MUTEX (Prevents Race Conditions)
	// ============================================

	// Acquire upload lock
	async acquireUploadLock(): Promise<boolean> {
		if (this.isSyncingUp) {
			this.pendingSyncUp = true;
			syncLog("Upload lock busy, queued");
			return false;
		}
		this.isSyncingUp = true;
		this.setSyncDirection("up");
		return true;
	}

	// Release upload lock
	releaseUploadLock(): void {
		this.isSyncingUp = false;
		if (!this.isSyncingDown) {
			this.setSyncDirection("idle");
		}
		// Check if there's a pending sync
		if (this.pendingSyncUp) {
			this.pendingSyncUp = false;
			syncLog("Processing queued upload");
		}
	}

	// Acquire download lock
	async acquireDownloadLock(): Promise<boolean> {
		if (this.isSyncingDown) {
			this.pendingSyncDown = true;
			syncLog("Download lock busy, queued");
			return false;
		}
		this.isSyncingDown = true;
		this.setSyncDirection("down");
		return true;
	}

	// Release download lock
	releaseDownloadLock(): void {
		this.isSyncingDown = false;
		if (!this.isSyncingUp) {
			this.setSyncDirection("idle");
		}
		if (this.pendingSyncDown) {
			this.pendingSyncDown = false;
			syncLog("Processing queued download");
		}
	}

	// Check if any sync is in progress
	isSyncInProgress(): boolean {
		return this.isSyncingUp || this.isSyncingDown;
	}

	// Check if upload has pending request
	hasPendingUpload(): boolean {
		return this.pendingSyncUp;
	}

	// Check if download has pending request
	hasPendingDownload(): boolean {
		return this.pendingSyncDown;
	}

	// ============================================
	// HEARTBEAT (Remote Change Detection)
	// ============================================

	// Start heartbeat polling for remote changes
	startHeartbeat(onRemoteChange: () => void): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}

		this.onRemoteChangeCallback = onRemoteChange;

		// Initial check
		this.checkRemoteChanges();

		// Set up interval
		this.heartbeatInterval = setInterval(() => {
			this.checkRemoteChanges();
		}, HEARTBEAT_INTERVAL_MS);

		syncLog("Heartbeat started (interval:", HEARTBEAT_INTERVAL_MS, "ms)");
	}

	// Stop heartbeat polling
	stopHeartbeat(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
		this.onRemoteChangeCallback = null;
		syncLog("Heartbeat stopped");
	}

	// Check for remote changes via KV timestamp
	private async checkRemoteChanges(): Promise<void> {
		if (!this.isPuterAvailable() || !this.initialized) return;
		if (this.isSyncInProgress()) return; // Don't check during active sync

		try {
			const remoteTimestamp = await this.kvGet<number>(
				KV_KEYS.LAST_SYNC_TIMESTAMP,
			);

			if (remoteTimestamp && remoteTimestamp > this.localLastSyncTimestamp) {
				syncLog(
					"Remote change detected! Remote:",
					remoteTimestamp,
					"Local:",
					this.localLastSyncTimestamp,
				);
				this.localLastSyncTimestamp = remoteTimestamp;

				// Trigger callback to reload from cloud
				if (this.onRemoteChangeCallback) {
					this.onRemoteChangeCallback();
				}
			}
		} catch (error) {
			syncLog("Heartbeat check error:", error);
		}
	}

	// Update the sync timestamp (call after successful upload)
	async updateSyncTimestamp(): Promise<void> {
		const timestamp = Date.now();
		this.localLastSyncTimestamp = timestamp;
		await this.kvSet(KV_KEYS.LAST_SYNC_TIMESTAMP, timestamp);
		syncLog("Sync timestamp updated:", timestamp);
	}

	// Get the local sync timestamp
	getLocalSyncTimestamp(): number {
		return this.localLastSyncTimestamp;
	}

	// Set local timestamp without updating remote (for initial load)
	setLocalSyncTimestamp(timestamp: number): void {
		this.localLastSyncTimestamp = timestamp;
	}

	// ============================================
	// HOT/COLD TIERING OPERATIONS
	// ============================================

	// Check if a session is "active" (updated within threshold)
	isSessionActive(sessionId: string): boolean {
		const lastUpdate = this.activeSessionTimestamps.get(sessionId);
		if (!lastUpdate) return false;
		return Date.now() - lastUpdate < HOT_PATH_ACTIVE_THRESHOLD_MS;
	}

	// Mark a session as active
	markSessionActive(sessionId: string): void {
		this.activeSessionTimestamps.set(sessionId, Date.now());
	}

	// Write recent messages to KV (hot path - fast)
	async writeRecentMessages(
		sessionId: string,
		messages: unknown[],
	): Promise<boolean> {
		if (!this.isPuterAvailable() || !this.initialized) return false;

		// Only keep last N messages for hot path
		const recentMessages = messages.slice(-HOT_PATH_MESSAGE_LIMIT);
		return this.kvSet(KV_KEYS.RECENT_MESSAGES(sessionId), recentMessages);
	}

	// Get recent messages from KV (hot path - fast)
	async getRecentMessages<T>(sessionId: string): Promise<T[] | null> {
		return this.kvGet<T[]>(KV_KEYS.RECENT_MESSAGES(sessionId));
	}

	// Schedule a debounced cold path write
	scheduleColdPathWrite(
		sessionId: string,
		writeCallback: () => Promise<boolean>,
	): void {
		// Clear existing timer for this session
		const existingTimer = this.coldPathTimers.get(sessionId);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		// Schedule new debounced write
		const timer = setTimeout(async () => {
			this.coldPathTimers.delete(sessionId);
			await writeCallback();
		}, COLD_PATH_DEBOUNCE_MS);

		this.coldPathTimers.set(sessionId, timer);
	}

	// Force flush all pending cold path writes
	async flushColdPathWrites(): Promise<void> {
		// Clear all timers and execute writes immediately
		for (const [sessionId, timer] of this.coldPathTimers) {
			clearTimeout(timer);
			this.coldPathTimers.delete(sessionId);
			syncLog("Flushed cold path write for:", sessionId);
		}
	}

	// ============================================
	// FILE SYSTEM OPERATIONS (Cloud Storage)
	// ============================================

	// Write JSON data to a file
	async writeFile<T>(relativePath: string, data: T): Promise<boolean> {
		if (!this.isPuterAvailable() || !this.initialized) {
			return false;
		}

		const fullPath = `${APP_DATA_DIR}/${relativePath}`;

		try {
			const jsonStr = JSON.stringify(data, null, 2);
			await window.puter.fs.write(fullPath, jsonStr, {
				createMissingParents: true,
			});
			syncLog("Written:", fullPath);
			this.syncStatus.lastSync = Date.now();
			return true;
		} catch (error) {
			console.log("[PuterSync] Write error:", fullPath, error);
			this.syncStatus.error =
				error instanceof Error ? error.message : "Write failed";
			return false;
		}
	}

	// Read JSON data from a file
	async readFile<T>(relativePath: string): Promise<T | null> {
		if (!this.isPuterAvailable() || !this.initialized) {
			return null;
		}

		const fullPath = `${APP_DATA_DIR}/${relativePath}`;

		try {
			const blob = await window.puter.fs.read(fullPath);
			const text = await blob.text();
			syncLog("Read:", fullPath);
			return JSON.parse(text) as T;
		} catch (error: unknown) {
			const err = error as { code?: string; status?: number; message?: string };
			// Handle file not found - this is expected for new users
			if (
				err.code === "enoent" ||
				err.code === "ENOENT" ||
				err.status === 404 ||
				err.message?.includes("404") ||
				err.message?.includes("not found") ||
				err.message?.includes("does not exist")
			) {
				// Silent return for expected "file not found" cases
				return null;
			}
			syncLog("Read error:", fullPath, error);
			return null;
		}
	}

	// Delete a file
	// Returns true if file was deleted OR if file didn't exist (404)
	// This ensures local cleanup proceeds even when server file is already gone
	async deleteFile(relativePath: string): Promise<boolean> {
		if (!this.isPuterAvailable() || !this.initialized) return false;

		const fullPath = `${APP_DATA_DIR}/${relativePath}`;

		try {
			await window.puter.fs.delete(fullPath);
			syncLog("Deleted:", fullPath);
			return true;
		} catch (error: unknown) {
			const err = error as { code?: string; status?: number; message?: string };
			// 404 means file doesn't exist - that's fine, we wanted it gone anyway
			if (
				err.code === "enoent" ||
				err.code === "ENOENT" ||
				err.status === 404 ||
				err.message?.includes("404") ||
				err.message?.includes("not found") ||
				err.message?.includes("does not exist")
			) {
				syncLog("Delete: file already gone (404):", fullPath);
				return true; // Return true so cleanup continues
			}
			syncLog("Delete error:", fullPath, error);
			return false;
		}
	}

	// List files in a directory
	async listFiles(relativePath: string): Promise<string[]> {
		if (!this.isPuterAvailable() || !this.initialized) return [];

		const fullPath = `${APP_DATA_DIR}/${relativePath}`;

		try {
			const items = await window.puter.fs.readdir(fullPath);
			return items.filter((item) => !item.is_dir).map((item) => item.name);
		} catch (error: unknown) {
			// Directory not found is expected for new users - return empty array silently
			const err = error as { code?: string; status?: number; message?: string };
			if (
				err.code === "enoent" ||
				err.code === "ENOENT" ||
				err.status === 404 ||
				err.message?.includes("404") ||
				err.message?.includes("not found")
			) {
				return [];
			}
			syncLog("List files error:", fullPath, error);
			return [];
		}
	}

	// ============================================
	// KEY-VALUE STORE OPERATIONS
	// ============================================

	// Set a key-value pair
	async kvSet(key: string, value: unknown): Promise<boolean> {
		if (!this.isPuterAvailable() || !this.initialized) return false;

		try {
			const jsonStr = typeof value === "string" ? value : JSON.stringify(value);
			await window.puter.kv.set(key, jsonStr);
			syncLog("KV Set:", key);
			return true;
		} catch (error) {
			console.log("[PuterSync] KV Set error:", key, error);
			return false;
		}
	}

	// Get a value by key
	async kvGet<T>(key: string): Promise<T | null> {
		if (!this.isPuterAvailable() || !this.initialized) return null;

		try {
			const value = await window.puter.kv.get(key);
			if (!value) return null;
			try {
				return JSON.parse(value) as T;
			} catch {
				return value as T;
			}
		} catch {
			return null;
		}
	}

	// Delete a key
	async kvDelete(key: string): Promise<boolean> {
		if (!this.isPuterAvailable() || !this.initialized) return false;

		try {
			await window.puter.kv.del(key);
			syncLog("KV Del:", key);
			return true;
		} catch {
			return false;
		}
	}

	// Increment a numeric value (atomic)
	async kvIncr(key: string): Promise<number> {
		if (!this.isPuterAvailable() || !this.initialized) return 0;
		try {
			return await window.puter.kv.incr(key);
		} catch {
			return 0;
		}
	}

	// List all keys (optionally with pattern)
	async kvList(pattern?: string): Promise<string[]> {
		if (!this.isPuterAvailable() || !this.initialized) return [];
		try {
			const result = await window.puter.kv.list(pattern);
			if (!Array.isArray(result)) return [];
			if (result.length === 0) return [];
			if (typeof result[0] === "string") {
				return result as string[];
			}
			return (result as Array<{ key: string; value: string }>).map(
				(item) => item.key,
			);
		} catch {
			return [];
		}
	}

	// ============================================
	// BATCH OPERATIONS
	// ============================================

	// Write multiple files
	async writeFiles(
		files: Array<{ path: string; data: unknown }>,
	): Promise<boolean[]> {
		return Promise.all(files.map((f) => this.writeFile(f.path, f.data)));
	}

	// Read multiple files
	async readFiles<T>(paths: string[]): Promise<(T | null)[]> {
		return Promise.all(paths.map((p) => this.readFile<T>(p)));
	}

	// ============================================
	// MANIFEST OPERATIONS (Atomic Batching)
	// ============================================

	// Get sessions index (lightweight manifest) - uses cache to prevent stale reads
	async getSessionsIndex(): Promise<SessionIndexEntry[]> {
		// Return cached version if available (prevents stale reads during concurrent ops)
		if (this.sessionsIndexCache !== null) {
			return [...this.sessionsIndexCache];
		}

		// Try KV first (fastest)
		const kvIndex = await this.kvGet<SessionIndexEntry[]>(
			KV_KEYS.SESSIONS_INDEX,
		);
		if (kvIndex && kvIndex.length > 0) {
			// Filter out any pending deletions
			const filtered = kvIndex.filter((s) => !this.pendingDeletions.has(s.id));
			this.sessionsIndexCache = filtered;
			return [...filtered];
		}

		// Fallback to file
		const fileIndex = await this.readFile<SessionIndexEntry[]>(
			"sessions_index.json",
		);
		const result = fileIndex || [];
		// Filter out any pending deletions
		const filtered = result.filter((s) => !this.pendingDeletions.has(s.id));
		this.sessionsIndexCache = filtered;
		return [...filtered];
	}

	// Queue a session for manifest update (atomic batching)
	queueManifestUpdate(sessionId: string): void {
		// Skip if session is pending deletion
		if (this.pendingDeletions.has(sessionId)) {
			syncLog("Skipping manifest update for deleted session:", sessionId);
			return;
		}

		this.pendingManifestUpdates.add(sessionId);

		// Debounce manifest writes
		if (this.manifestUpdateTimer) {
			clearTimeout(this.manifestUpdateTimer);
		}

		this.manifestUpdateTimer = setTimeout(() => {
			this.flushManifestUpdates();
		}, 2000); // 2 second debounce for manifest
	}

	// Flush all pending manifest updates atomically
	async flushManifestUpdates(): Promise<void> {
		if (this.pendingManifestUpdates.size === 0) return;

		// Filter out any pending deletions before flushing
		for (const sessionId of this.pendingDeletions) {
			this.pendingManifestUpdates.delete(sessionId);
		}

		if (this.pendingManifestUpdates.size === 0) return;

		syncLog(
			"Flushing manifest updates for:",
			this.pendingManifestUpdates.size,
			"sessions",
		);
		this.pendingManifestUpdates.clear();
		this.manifestUpdateTimer = null;
	}

	// Save sessions index (atomic - single write) with lock
	async saveSessionsIndex(index: SessionIndexEntry[]): Promise<boolean> {
		const acquired = await this.acquireManifestLock();
		if (!acquired) {
			syncLog("Failed to acquire manifest lock for saveSessionsIndex");
			return false;
		}

		try {
			// Filter out any pending deletions before saving
			const filteredIndex = index.filter(
				(s) => !this.pendingDeletions.has(s.id),
			);

			// Update cache FIRST (prevents stale reads)
			this.sessionsIndexCache = [...filteredIndex];

			// Write to both KV (fast reads) and file (persistence)
			const kvSuccess = await this.kvSet(KV_KEYS.SESSIONS_INDEX, filteredIndex);
			const fileSuccess = await this.writeFile(
				"sessions_index.json",
				filteredIndex,
			);
			return kvSuccess && fileSuccess;
		} finally {
			this.releaseManifestLock();
		}
	}

	// Get folders index (lightweight manifest) - uses cache
	async getFoldersIndex(): Promise<FolderIndexEntry[]> {
		if (this.foldersIndexCache !== null) {
			return [...this.foldersIndexCache];
		}

		const kvIndex = await this.kvGet<FolderIndexEntry[]>(KV_KEYS.FOLDERS_INDEX);
		if (kvIndex && kvIndex.length > 0) {
			this.foldersIndexCache = kvIndex;
			return [...kvIndex];
		}

		const fileIndex =
			await this.readFile<FolderIndexEntry[]>("folders_index.json");
		const result = fileIndex || [];
		this.foldersIndexCache = result;
		return [...result];
	}

	// Save folders index with lock
	async saveFoldersIndex(index: FolderIndexEntry[]): Promise<boolean> {
		const acquired = await this.acquireManifestLock();
		if (!acquired) {
			syncLog("Failed to acquire manifest lock for saveFoldersIndex");
			return false;
		}

		try {
			// Update cache FIRST
			this.foldersIndexCache = [...index];

			const kvSuccess = await this.kvSet(KV_KEYS.FOLDERS_INDEX, index);
			const fileSuccess = await this.writeFile("folders_index.json", index);
			return kvSuccess && fileSuccess;
		} finally {
			this.releaseManifestLock();
		}
	}

	// Invalidate manifest caches (call after sync from cloud)
	invalidateManifestCache(): void {
		this.sessionsIndexCache = null;
		this.foldersIndexCache = null;
		syncLog("Manifest cache invalidated");
	}

	// ============================================
	// IMMEDIATE DELETE OPERATIONS (Zero-Zombie)
	// ============================================

	// Check if a session has a deletion tombstone
	async hasDeleteTombstone(sessionId: string): Promise<boolean> {
		// Check in-memory pending deletions first (fastest)
		if (this.pendingDeletions.has(sessionId)) {
			return true;
		}

		const tombstone = await this.kvGet<{ deletedAt: number }>(
			KV_KEYS.DELETED_TOMBSTONE(sessionId),
		);
		if (!tombstone) return false;

		// Check if tombstone has expired (7 days)
		if (Date.now() - tombstone.deletedAt > TOMBSTONE_TTL_MS) {
			// Clean up expired tombstone
			await this.kvDelete(KV_KEYS.DELETED_TOMBSTONE(sessionId));
			return false;
		}

		return true;
	}

	// Set a deletion tombstone (prevents resurrection from directory scan)
	async setDeleteTombstone(sessionId: string): Promise<boolean> {
		return this.kvSet(KV_KEYS.DELETED_TOMBSTONE(sessionId), {
			deletedAt: Date.now(),
		});
	}

	// Check if a session is pending deletion (in-memory check, very fast)
	isSessionPendingDeletion(sessionId: string): boolean {
		return this.pendingDeletions.has(sessionId);
	}

	// Delete session from cloud immediately (fire and forget)
	// Zero-Zombie: Uses manifest lock and in-memory tracking to prevent resurrection
	async deleteSessionFromCloud(
		sessionId: string,
		type: "chat" | "tts" = "chat",
	): Promise<void> {
		if (!this.isPuterAvailable() || !this.initialized) {
			syncLog("Cannot delete session - not initialized:", sessionId);
			return;
		}

		syncLog("Deleting session from cloud:", sessionId, type);

		// 1. IMMEDIATELY mark as pending deletion (prevents resurrection)
		this.pendingDeletions.add(sessionId);

		// 2. Remove from pending manifest updates (prevents re-adding)
		this.pendingManifestUpdates.delete(sessionId);

		// 3. Update in-memory cache IMMEDIATELY (prevents stale reads)
		if (this.sessionsIndexCache) {
			this.sessionsIndexCache = this.sessionsIndexCache.filter(
				(s) => s.id !== sessionId,
			);
		}

		// 4. Cancel any pending cold path writes for this session
		const coldTimer = this.coldPathTimers.get(sessionId);
		if (coldTimer) {
			clearTimeout(coldTimer);
			this.coldPathTimers.delete(sessionId);
		}

		// 5. Clean up hot path tracking
		this.activeSessionTimestamps.delete(sessionId);

		try {
			// 6. Set tombstone FIRST (prevents resurrection during async ops)
			await this.setDeleteTombstone(sessionId);

			// 7. Delete KV entries (await all to ensure cleanup)
			await Promise.all([
				this.kvDelete(KV_KEYS.RECENT_MESSAGES(sessionId)),
				this.kvDelete(KV_KEYS.SESSION_META(sessionId)),
			]);

			// 8. Update sessions index with lock (atomic)
			const acquired = await this.acquireManifestLock();
			if (acquired) {
				try {
					// Re-read from cache (which is already updated) or fetch fresh
					const currentIndex = this.sessionsIndexCache || [];
					const updatedIndex = currentIndex.filter((s) => s.id !== sessionId);
					this.sessionsIndexCache = updatedIndex;

					// Write to storage
					await this.kvSet(KV_KEYS.SESSIONS_INDEX, updatedIndex);
					await this.writeFile("sessions_index.json", updatedIndex);
				} finally {
					this.releaseManifestLock();
				}
			}

			// 9. Delete the session file LAST (after index is updated)
			const path = this.getSessionPath(sessionId, type);
			await this.deleteFile(path);

			console.log("[PuterSync] ✅ Session deleted from cloud:", sessionId);
		} catch (error) {
			console.log("[PuterSync] Delete session error:", sessionId, error);
			// Keep in pendingDeletions to prevent resurrection even on error
		}
	}

	// Delete folder from cloud immediately (fire and forget)
	// Also updates session files to remove folderId references
	async deleteFolderFromCloud(folderId: string): Promise<void> {
		if (!this.isPuterAvailable() || !this.initialized) return;

		try {
			const acquired = await this.acquireManifestLock();
			if (!acquired) {
				syncLog("Failed to acquire manifest lock for folder deletion");
				return;
			}

			try {
				// 1. Update folders index (remove entry)
				const foldersIndex =
					this.foldersIndexCache || (await this.getFoldersIndex());
				const updatedFoldersIndex = foldersIndex.filter(
					(f) => f.id !== folderId,
				);
				this.foldersIndexCache = updatedFoldersIndex;
				await this.kvSet(KV_KEYS.FOLDERS_INDEX, updatedFoldersIndex);
				await this.writeFile("folders_index.json", updatedFoldersIndex);

				// 2. Also update the FOLDER_LIST KV (used for fast folder loading)
				const folderList = await this.kvGet<Array<{ id: string }>>(
					KV_KEYS.FOLDER_LIST,
				);
				if (folderList) {
					const updatedFolderList = folderList.filter((f) => f.id !== folderId);
					await this.kvSet(KV_KEYS.FOLDER_LIST, updatedFolderList);
				}

				// 3. Update sessions index (clear folderId references)
				const sessionsIndex =
					this.sessionsIndexCache || (await this.getSessionsIndex());
				const updatedSessionsIndex = sessionsIndex.map((s) =>
					s.folderId === folderId ? { ...s, folderId: undefined } : s,
				);
				this.sessionsIndexCache = updatedSessionsIndex;
				await this.kvSet(KV_KEYS.SESSIONS_INDEX, updatedSessionsIndex);
				await this.writeFile("sessions_index.json", updatedSessionsIndex);

				// 4. Update actual session files on FS to remove folderId
				// This prevents resurrection from directory scan with old folderId
				const affectedSessions = sessionsIndex.filter(
					(s) => s.folderId === folderId,
				);
				for (const sessionEntry of affectedSessions) {
					const path = this.getSessionPath(sessionEntry.id, sessionEntry.type);
					const session = await this.readFile<Record<string, unknown>>(path);
					if (session && session.folderId === folderId) {
						delete session.folderId;
						await this.writeFile(path, session);
						syncLog(
							"Updated session file to remove folderId:",
							sessionEntry.id,
						);
					}
				}
			} finally {
				this.releaseManifestLock();
			}

			syncLog("Folder deleted from cloud:", folderId);
		} catch (error) {
			console.log("[PuterSync] Delete folder error:", folderId, error);
		}
	}

	// Clear pending deletion tracking (call after successful sync from cloud)
	clearPendingDeletions(): void {
		this.pendingDeletions.clear();
	}

	// ============================================
	// UTILITY METHODS
	// ============================================

	// Get relative path for a session file
	getSessionPath(sessionId: string, type: "chat" | "tts"): string {
		return `sessions/${type}/${sessionId}.json`;
	}

	// Get KV key for recent messages
	getRecentMessagesKey(sessionId: string): string {
		return KV_KEYS.RECENT_MESSAGES(sessionId);
	}

	// Get KV key for session metadata
	getSessionMetaKey(sessionId: string): string {
		return KV_KEYS.SESSION_META(sessionId);
	}

	// Clear all app data from Puter
	async clearAllData(): Promise<void> {
		if (!this.isPuterAvailable()) return;

		try {
			// Clear all timers
			for (const timer of this.coldPathTimers.values()) {
				clearTimeout(timer);
			}
			this.coldPathTimers.clear();

			if (this.manifestUpdateTimer) {
				clearTimeout(this.manifestUpdateTimer);
				this.manifestUpdateTimer = null;
			}

			await window.puter.kv.flush();
			await window.puter.fs.delete(APP_DATA_DIR);
			syncLog("All data cleared");
		} catch (error) {
			console.log("[PuterSync] Clear data error:", error);
		}
	}

	// Reset initialization state
	reset(): void {
		syncLog("Reset");

		// Stop heartbeat
		this.stopHeartbeat();

		// Clear all timers
		for (const timer of this.coldPathTimers.values()) {
			clearTimeout(timer);
		}
		this.coldPathTimers.clear();

		if (this.hotPathTimer) {
			clearTimeout(this.hotPathTimer);
			this.hotPathTimer = null;
		}

		if (this.manifestUpdateTimer) {
			clearTimeout(this.manifestUpdateTimer);
			this.manifestUpdateTimer = null;
		}

		this.activeSessionTimestamps.clear();
		this.pendingManifestUpdates.clear();

		// Reset mutex state
		this.isSyncingUp = false;
		this.isSyncingDown = false;
		this.pendingSyncUp = false;
		this.pendingSyncDown = false;
		this.localLastSyncTimestamp = 0;

		// Reset manifest lock and caches
		this.manifestLock = false;
		this.manifestLockQueue = [];
		this.sessionsIndexCache = null;
		this.foldersIndexCache = null;
		this.pendingDeletions.clear();

		this.initialized = false;
		this.syncStatus = {
			isOnline: false,
			lastSync: null,
			pendingChanges: 0,
			error: null,
			isSyncing: false,
			syncDirection: "idle",
		};
	}

	// ============================================
	// FORCE SYNC (Manual Reconciliation)
	// ============================================

	// Force sync - allows users to manually trigger reconciliation
	async forceSync(): Promise<void> {
		if (!this.isPuterAvailable() || !this.initialized) return;

		syncLog("Force sync triggered");

		// Flush all pending writes
		await this.flushColdPathWrites();
		await this.flushManifestUpdates();

		this.syncStatus.lastSync = Date.now();
	}
}

// Export singleton instance
export const puterSync = new PuterSyncService();

// Export keys and constants for external use
export {
	KV_KEYS,
	APP_DATA_DIR,
	HOT_PATH_DEBOUNCE_MS,
	COLD_PATH_DEBOUNCE_MS,
	HEARTBEAT_INTERVAL_MS,
};
