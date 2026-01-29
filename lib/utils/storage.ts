import { ChatSession, ChatFolder, AppSettings, Attachment } from "../types";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { formatBytes } from "./format";

export interface StorageStatus {
	sessions: number;
	folders: number;
	settings: number;
	theme: number;
	flashcards: number;
	gamification: number;
	total: number;
	totalFormatted: string;
	// Detailed breakdown
	chatSessions: number;
	ttsSessions: number;
	cards: number;
	collections: number;
	memos: number;
	// Gamification breakdown (v2 dual-currency)
	gamificationXP: number;
	gamificationCoins: number;
	gamificationStreak: number;
	gamificationFocusMinutes: number;
	gamificationPurchaseHistory: number;
}

/**
 * Strip base64 data from attachments before saving to localStorage
 * This prevents large image data from filling up storage
 * The AI only needs the image data during the request, not for history
 */
const stripAttachmentData = (attachment: Attachment): Attachment => {
	// For images and audio, remove the base64 data but keep metadata
	if (attachment.type === "image" || attachment.type === "audio") {
		return {
			...attachment,
			data: undefined, // Remove base64 data
		};
	}
	// For text attachments, keep the data as it's usually small
	return attachment;
};

/**
 * Prepare sessions for storage by stripping large attachment data
 */
const prepareSessionsForStorage = (sessions: ChatSession[]): ChatSession[] => {
	return sessions.map((session) => ({
		...session,
		messages: session.messages.map((message) => ({
			...message,
			attachments: message.attachments?.map(stripAttachmentData),
		})),
	}));
};

export const storage = {
	// Get storage usage in bytes
	getStorageStatus: (): StorageStatus => {
		if (typeof window === "undefined") {
			return {
				sessions: 0,
				folders: 0,
				settings: 0,
				theme: 0,
				flashcards: 0,
				gamification: 0,
				total: 0,
				totalFormatted: "0 B",
				chatSessions: 0,
				ttsSessions: 0,
				cards: 0,
				collections: 0,
				memos: 0,
				gamificationXP: 0,
				gamificationCoins: 0,
				gamificationStreak: 0,
				gamificationFocusMinutes: 0,
				gamificationPurchaseHistory: 0,
			};
		}

		const getSize = (key: string): number => {
			const item = localStorage.getItem(key);
			return item ? new Blob([item]).size : 0;
		};

		const sessions = getSize(LOCAL_STORAGE_KEYS.SESSIONS);
		const folders = getSize(LOCAL_STORAGE_KEYS.FOLDERS);
		const settings = getSize(LOCAL_STORAGE_KEYS.SETTINGS);
		const theme = getSize(LOCAL_STORAGE_KEYS.THEME);
		const flashcards = getSize("puter-flashcards");
		const gamification = getSize("puter-gamification");
		const total =
			sessions + folders + settings + theme + flashcards + gamification;

		// Calculate detailed breakdown
		let chatSessions = 0;
		let ttsSessions = 0;
		let cards = 0;
		let collections = 0;
		let memos = 0;

		try {
			const sessionsData = localStorage.getItem(LOCAL_STORAGE_KEYS.SESSIONS);
			if (sessionsData) {
				const parsed = JSON.parse(sessionsData);
				const chatData = parsed.filter(
					(s: { type?: string }) => s.type === "chat" || !s.type,
				);
				const ttsData = parsed.filter(
					(s: { type?: string }) => s.type === "tts",
				);
				chatSessions = new Blob([JSON.stringify(chatData)]).size;
				ttsSessions = new Blob([JSON.stringify(ttsData)]).size;
			}
		} catch {
			/* ignore */
		}

		try {
			const flashcardsData = localStorage.getItem("puter-flashcards");
			if (flashcardsData) {
				const parsed = JSON.parse(flashcardsData);
				if (parsed.state) {
					cards =
						new Blob([JSON.stringify(parsed.state.cards || [])]).size +
						new Blob([JSON.stringify(parsed.state.covers || [])]).size;
					collections = new Blob([
						JSON.stringify(parsed.state.collections || []),
					]).size;
					memos = new Blob([JSON.stringify(parsed.state.memos || [])]).size;
				}
			}
		} catch {
			/* ignore */
		}

		// Calculate gamification breakdown (v2 dual-currency)
		let gamificationXP = 0;
		let gamificationCoins = 0;
		let gamificationStreak = 0;
		let gamificationFocusMinutes = 0;
		let gamificationPurchaseHistory = 0;

		try {
			const gamificationData = localStorage.getItem("puter-gamification");
			if (gamificationData) {
				const parsed = JSON.parse(gamificationData);
				if (parsed.state) {
					gamificationXP = new Blob([
						JSON.stringify({
							totalXP: parsed.state.totalXP || 0,
							lifetimeCoinsEarned: parsed.state.lifetimeCoinsEarned || 0,
						}),
					]).size;
					gamificationCoins = new Blob([
						JSON.stringify({
							currentCoins: parsed.state.currentCoins || 0,
						}),
					]).size;
					gamificationStreak = new Blob([
						JSON.stringify({
							dailyStreak: parsed.state.dailyStreak || 0,
							lastSessionDate: parsed.state.lastSessionDate || null,
						}),
					]).size;
					gamificationFocusMinutes = new Blob([
						JSON.stringify({
							totalFocusedMinutes: parsed.state.totalFocusedMinutes || 0,
							dailyFocusStats: parsed.state.dailyFocusStats || {},
							totalSessionsCompleted: parsed.state.totalSessionsCompleted || 0,
						}),
					]).size;
					gamificationPurchaseHistory = new Blob([
						JSON.stringify(parsed.state.purchaseHistory || []),
					]).size;
				}
			}
		} catch {
			/* ignore */
		}

		return {
			sessions,
			folders,
			settings,
			theme,
			flashcards,
			gamification,
			total,
			totalFormatted: formatBytes(total),
			chatSessions,
			ttsSessions,
			cards,
			collections,
			memos,
			gamificationXP,
			gamificationCoins,
			gamificationStreak,
			gamificationFocusMinutes,
			gamificationPurchaseHistory,
		};
	},

	// Sessions
	getSessions: (): ChatSession[] => {
		if (typeof window === "undefined") return [];
		try {
			const data = localStorage.getItem(LOCAL_STORAGE_KEYS.SESSIONS);
			return data ? JSON.parse(data) : [];
		} catch (error) {
			console.error("Error loading sessions:", error);
			return [];
		}
	},

	saveSessions: (sessions: ChatSession[]): void => {
		if (typeof window === "undefined") return;
		try {
			// Strip large attachment data before saving
			const preparedSessions = prepareSessionsForStorage(sessions);
			localStorage.setItem(
				LOCAL_STORAGE_KEYS.SESSIONS,
				JSON.stringify(preparedSessions),
			);
		} catch (error) {
			console.error("Error saving sessions:", error);
		}
	},

	// Folders
	getFolders: (): ChatFolder[] => {
		if (typeof window === "undefined") return [];
		try {
			const data = localStorage.getItem(LOCAL_STORAGE_KEYS.FOLDERS);
			return data ? JSON.parse(data) : [];
		} catch (error) {
			console.error("Error loading folders:", error);
			return [];
		}
	},

	saveFolders: (folders: ChatFolder[]): void => {
		if (typeof window === "undefined") return;
		try {
			localStorage.setItem(LOCAL_STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
		} catch (error) {
			console.error("Error saving folders:", error);
		}
	},

	// Settings
	getSettings: (): Partial<AppSettings> | null => {
		if (typeof window === "undefined") return null;
		try {
			const data = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
			return data ? JSON.parse(data) : null;
		} catch (error) {
			console.error("Error loading settings:", error);
			return null;
		}
	},

	saveSettings: (settings: AppSettings): void => {
		if (typeof window === "undefined") return;
		try {
			localStorage.setItem(
				LOCAL_STORAGE_KEYS.SETTINGS,
				JSON.stringify(settings),
			);
		} catch (error) {
			console.error("Error saving settings:", error);
		}
	},

	// Theme
	getTheme: (): "light" | "dark" | null => {
		if (typeof window === "undefined") return null;
		return localStorage.getItem(LOCAL_STORAGE_KEYS.THEME) as
			| "light"
			| "dark"
			| null;
	},

	saveTheme: (theme: "light" | "dark"): void => {
		if (typeof window === "undefined") return;
		localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, theme);
	},

	// Clear all
	clearAll: (): void => {
		if (typeof window === "undefined") return;
		Object.values(LOCAL_STORAGE_KEYS).forEach((key) => {
			localStorage.removeItem(key);
		});
	},
};
