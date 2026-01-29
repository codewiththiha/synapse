import { createStore } from "@/lib/createStore";
import {
	ChatSession,
	ChatFolder,
	Message,
	BackgroundTaskResult,
	SessionType,
} from "@/lib/types";
import { storage } from "@/lib/utils/storage";
import { backgroundAI } from "@/lib/services/background-ai";
import { summarizationService } from "@/lib/services/summarization-service";
import { generateId } from "@/lib/utils/puter-helpers";
import { fileHelpers } from "@/lib/utils/file-helpers";

// NOTE: Deleted IDs tracking removed - using immediate cloud deletion instead
// The PuterSyncProvider now handles deletions immediately via the subscription

type State = {
	sessions: ChatSession[];
	folders: ChatFolder[];
	currentChatSessionId: string;
	currentTtsSessionId: string;
	isInitialized: boolean;
	isOrganizing: boolean;
	organizingSessionIds: string[]; // Track which sessions are being organized (array for React reactivity)
	processingSessionId: string | null;
	movingSession: { sessionId: string; targetFolderId: string } | null;
	closeAllFolders: boolean;
	namingTriggeredSet: Set<string>;
	prevMessageCountMap: Map<string, number>;
	// Sync version - incremented on cloud sync to force re-renders
	_syncVersion: number;
};

type Action = {
	initializeSessions: () => Promise<void>;
	createNewSession: (type: SessionType) => string;
	selectSession: (id: string, type: SessionType) => void;
	deleteSession: (id: string) => void;
	clearAllSessions: (type?: SessionType) => void;
	getSessionsByType: (type: SessionType) => ChatSession[];
	getFoldersByType: (type: SessionType) => ChatFolder[];
	getCurrentSessionId: (type: SessionType) => string;
	updateSessionMessages: (
		sessionId: string,
		updater: (prev: Message[]) => Message[],
	) => void;
	updateAIHistory: (
		sessionId: string,
		newAIHistory: Message[],
		summaryMessage?: Message,
	) => void;
	createFolder: (name: string, type: SessionType, color?: string) => string;
	deleteFolder: (folderId: string) => void;
	renameFolder: (folderId: string, newName: string) => void;
	moveSessionToFolder: (
		sessionId: string,
		folderId: string | undefined,
	) => void;
	togglePinSession: (sessionId: string) => void;
	togglePinFolder: (folderId: string) => void;
	organizeAllChats: (type?: SessionType) => Promise<void>;
	setProcessingSessionId: (id: string | null) => void;
	setMovingSession: (
		moving: { sessionId: string; targetFolderId: string } | null,
	) => void;
	setCloseAllFolders: (close: boolean) => void;
	handleBackgroundTaskComplete: (result: BackgroundTaskResult) => void;
	// Cloud sync action - properly triggers immer and re-renders
	syncFromCloud: (sessions: ChatSession[], folders: ChatFolder[]) => void;
};

type Store = State & Action;

const createNewSessionData = (type: SessionType = "chat") => {
	const newId = generateId("session");
	const newSession: ChatSession = {
		id: newId,
		title: type === "chat" ? "New Chat" : "New TTS",
		messages: [],
		aiHistory: [], // Initialize aiHistory as empty array for new sessions
		type,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
	return { newId, newSession };
};

// Helper to strip image data from messages (for storage optimization)
const stripImageDataFromMessages = (messages: Message[]): Message[] => {
	return messages.map((msg) => ({
		...msg,
		attachments: fileHelpers.stripMessageAttachments(msg.attachments),
	}));
};

const useSessionsStore = createStore<Store>(
	(set, get) => ({
		sessions: [],
		folders: [],
		currentChatSessionId: "",
		currentTtsSessionId: "",
		isInitialized: false,
		isOrganizing: false,
		organizingSessionIds: [],
		processingSessionId: null,
		movingSession: null,
		closeAllFolders: false,
		namingTriggeredSet: new Set<string>(),
		prevMessageCountMap: new Map<string, number>(),
		_syncVersion: 0,

		getSessionsByType: (type) => get().sessions.filter((s) => s.type === type),

		getFoldersByType: (type) => get().folders.filter((f) => f.type === type),

		getCurrentSessionId: (type) =>
			type === "chat" ? get().currentChatSessionId : get().currentTtsSessionId,

		initializeSessions: async () => {
			const savedSessions = storage.getSessions();
			const savedFolders = storage.getFolders();

			// Restore summarization states from storage (Requirements: 7.2)
			summarizationService.restoreStates();

			set((state) => {
				// Check if we already have sessions from cloud sync
				// If so, don't overwrite with local storage data
				if (state.sessions.length > 0 && state._syncVersion > 0) {
					state.isInitialized = true;
					return;
				}

				state.folders = savedFolders;
				// Migrate old sessions: strip image data, add type, initialize aiHistory
				const migratedSessions = savedSessions.map((s) => {
					// Strip image data from messages to save storage space
					const cleanMessages = stripImageDataFromMessages(s.messages);
					const cleanAiHistory = s.aiHistory
						? stripImageDataFromMessages(s.aiHistory)
						: [...cleanMessages];

					return {
						...s,
						type: s.type || ("chat" as SessionType),
						messages: cleanMessages,
						aiHistory: cleanAiHistory,
					};
				});

				if (migratedSessions.length > 0) {
					const sorted = [...migratedSessions].sort(
						(a, b) => b.updatedAt - a.updatedAt,
					);
					state.sessions = sorted;

					const chatSession = sorted.find((s) => s.type === "chat");
					const ttsSession = sorted.find((s) => s.type === "tts");

					if (chatSession) {
						state.currentChatSessionId = chatSession.id;
					} else {
						const { newId, newSession } = createNewSessionData("chat");
						state.sessions.unshift(newSession);
						state.currentChatSessionId = newId;
					}

					if (ttsSession) {
						state.currentTtsSessionId = ttsSession.id;
					} else {
						const { newId, newSession } = createNewSessionData("tts");
						state.sessions.unshift(newSession);
						state.currentTtsSessionId = newId;
					}
				} else {
					const { newId: chatId, newSession: chatSession } =
						createNewSessionData("chat");
					const { newId: ttsId, newSession: ttsSession } =
						createNewSessionData("tts");
					state.sessions = [chatSession, ttsSession];
					state.currentChatSessionId = chatId;
					state.currentTtsSessionId = ttsId;
				}

				state.isInitialized = true;
			});
		},

		createNewSession: (type) => {
			const { newId, newSession } = createNewSessionData(type);
			set((state) => {
				state.sessions.unshift(newSession);
				if (type === "chat") {
					state.currentChatSessionId = newId;
				} else {
					state.currentTtsSessionId = newId;
				}
			});
			return newId;
		},

		selectSession: (id, type) => {
			const session = get().sessions.find((s) => s.id === id);
			if (session) {
				set((state) => {
					state.prevMessageCountMap.set(id, session.messages.length);
					if (type === "chat") {
						state.currentChatSessionId = id;
					} else {
						state.currentTtsSessionId = id;
					}
				});
			}
		},

		deleteSession: (id) => {
			// NOTE: Cloud deletion is handled by PuterSyncProvider subscription
			// which detects removed sessions and calls sessionSync.deleteSession()

			const { sessions, currentChatSessionId, currentTtsSessionId } = get();
			const sessionToDelete = sessions.find((s) => s.id === id);
			if (!sessionToDelete) return;

			// Clean up summarization state for this session (Requirements: 7.4)
			summarizationService.deleteState(id);

			const type = sessionToDelete.type;
			const remainingSessions = sessions.filter((s) => s.id !== id);
			const remainingOfType = remainingSessions.filter((s) => s.type === type);
			const currentId =
				type === "chat" ? currentChatSessionId : currentTtsSessionId;

			if (id === currentId) {
				if (remainingOfType.length > 0) {
					set((state) => {
						state.sessions = remainingSessions;
						if (type === "chat") {
							state.currentChatSessionId = remainingOfType[0].id;
						} else {
							state.currentTtsSessionId = remainingOfType[0].id;
						}
					});
				} else {
					const { newId, newSession } = createNewSessionData(type);
					set((state) => {
						state.sessions = [...remainingSessions, newSession];
						if (type === "chat") {
							state.currentChatSessionId = newId;
						} else {
							state.currentTtsSessionId = newId;
						}
					});
				}
			} else {
				set((state) => {
					state.sessions = remainingSessions;
				});
			}
		},

		clearAllSessions: (type) => {
			if (type) {
				const { newId, newSession } = createNewSessionData(type);
				set((state) => {
					// Clear sessions of this type
					state.sessions = state.sessions.filter((s) => s.type !== type);
					state.sessions.unshift(newSession);
					// Also clear folders of this type
					state.folders = state.folders.filter((f) => f.type !== type);
					if (type === "chat") {
						state.currentChatSessionId = newId;
					} else {
						state.currentTtsSessionId = newId;
					}
				});
			} else {
				storage.clearAll();
				const { newId: chatId, newSession: chatSession } =
					createNewSessionData("chat");
				const { newId: ttsId, newSession: ttsSession } =
					createNewSessionData("tts");
				set((state) => {
					state.namingTriggeredSet.clear();
					state.sessions = [chatSession, ttsSession];
					state.folders = [];
					state.currentChatSessionId = chatId;
					state.currentTtsSessionId = ttsId;
				});
			}
		},

		updateSessionMessages: (sessionId, updater) => {
			const {
				sessions,
				namingTriggeredSet,
				prevMessageCountMap,
				handleBackgroundTaskComplete,
			} = get();
			const sessionIndex = sessions.findIndex((s) => s.id === sessionId);
			if (sessionIndex === -1) return;

			const session = sessions[sessionIndex];
			const newMessages = updater(session.messages);
			if (newMessages === session.messages) return;

			const prevMessageCount =
				prevMessageCountMap.get(sessionId) ?? session.messages.length;
			const hasNewMessages = newMessages.length > prevMessageCount;

			// Calculate new messages to add to aiHistory
			// Only add messages that are new (not updates to existing messages)
			const currentAiHistory = session.aiHistory ?? [...session.messages];
			let newAiHistory = currentAiHistory;

			if (hasNewMessages) {
				// Find messages that were added (comparing by length difference)
				const addedMessages = newMessages.slice(session.messages.length);
				newAiHistory = [...currentAiHistory, ...addedMessages];
			} else {
				// For updates to existing messages (like streaming), update the last message in aiHistory
				// if it corresponds to the same message being updated
				const lastNewMessage = newMessages[newMessages.length - 1];
				const lastAiHistoryMessage =
					currentAiHistory[currentAiHistory.length - 1];

				if (
					lastNewMessage &&
					lastAiHistoryMessage &&
					lastNewMessage.id === lastAiHistoryMessage.id
				) {
					// Update the last message in aiHistory to match
					newAiHistory = [...currentAiHistory.slice(0, -1), lastNewMessage];
				}
			}

			set((state) => {
				state.prevMessageCountMap.set(sessionId, newMessages.length);
				state.sessions[sessionIndex] = {
					...session,
					messages: newMessages,
					aiHistory: newAiHistory,
					updatedAt: hasNewMessages ? Date.now() : session.updatedAt,
				};
			});

			// Trigger background AI naming after first assistant response
			const defaultTitle = session.type === "chat" ? "New Chat" : "New TTS";
			if (
				newMessages.length >= 2 &&
				!namingTriggeredSet.has(sessionId) &&
				(session.title === defaultTitle || !session.title)
			) {
				set((state) => {
					state.namingTriggeredSet.add(sessionId);
				});
				const updatedSession = get().sessions.find((s) => s.id === sessionId);
				if (updatedSession) {
					backgroundAI.generateChatName(
						updatedSession,
						handleBackgroundTaskComplete,
					);
				}
			}
		},

		// Update AI_History independently for summarization
		// This preserves Display_Messages while allowing AI_History to be modified
		updateAIHistory: (sessionId, newAIHistory, summaryMessage) => {
			const { sessions } = get();
			const sessionIndex = sessions.findIndex((s) => s.id === sessionId);
			if (sessionIndex === -1) return;

			const session = sessions[sessionIndex];

			set((state) => {
				state.sessions[sessionIndex] = {
					...session,
					aiHistory: newAIHistory,
					summaryMessage: summaryMessage ?? session.summaryMessage,
					// Note: messages (Display_Messages) is NOT modified
					updatedAt: Date.now(),
				};
			});
		},

		createFolder: (name, type, color) => {
			const newFolder: ChatFolder = {
				id: generateId("folder"),
				name,
				color,
				type,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};
			set((state) => {
				state.folders.push(newFolder);
			});
			return newFolder.id;
		},

		deleteFolder: (folderId) => {
			// NOTE: Cloud deletion is handled by PuterSyncProvider subscription
			// which detects removed folders and calls folderSync.deleteFolder()
			set((state) => {
				state.folders = state.folders.filter((f) => f.id !== folderId);
				state.sessions = state.sessions.map((s) =>
					s.folderId === folderId ? { ...s, folderId: undefined } : s,
				);
			});
		},

		renameFolder: (folderId, newName) => {
			set((state) => {
				const folder = state.folders.find((f) => f.id === folderId);
				if (folder) {
					folder.name = newName;
					folder.updatedAt = Date.now();
				}
			});
		},

		moveSessionToFolder: (sessionId, folderId) => {
			set((state) => {
				const session = state.sessions.find((s) => s.id === sessionId);
				if (session) {
					session.folderId = folderId;
					session.updatedAt = Date.now();
				}
			});
		},

		togglePinSession: (sessionId) => {
			set((state) => {
				const session = state.sessions.find((s) => s.id === sessionId);
				if (session) {
					session.isPinned = !session.isPinned;
					session.updatedAt = Date.now();
				}
			});
		},

		togglePinFolder: (folderId) => {
			set((state) => {
				const folder = state.folders.find((f) => f.id === folderId);
				if (folder) {
					folder.isPinned = !folder.isPinned;
					folder.updatedAt = Date.now();
				}
			});
		},

		organizeAllChats: async (type) => {
			const { sessions, folders, handleBackgroundTaskComplete } = get();
			const defaultTitle = type === "tts" ? "New TTS" : "New Chat";
			const sessionsToOrganize = type
				? sessions.filter(
						(s) =>
							s.type === type &&
							!s.folderId &&
							s.title &&
							s.title !== defaultTitle,
					)
				: sessions.filter(
						(s) =>
							!s.folderId &&
							s.title &&
							s.title !== "New Chat" &&
							s.title !== "New TTS",
					);

			if (sessionsToOrganize.length === 0) return;

			// Store the IDs of sessions being organized (as array for React reactivity)
			const organizingIds = sessionsToOrganize.map((s) => s.id);

			set((state) => {
				state.isOrganizing = true;
				state.organizingSessionIds = [...organizingIds]; // Spread to ensure new reference
			});

			try {
				await backgroundAI.organizeAllChats(
					sessionsToOrganize,
					folders,
					handleBackgroundTaskComplete,
					(sessionId) => get().setProcessingSessionId(sessionId),
				);
			} catch (error) {
				console.error("Organization error:", error);
			} finally {
				set((state) => {
					state.isOrganizing = false;
					state.processingSessionId = null;
					state.organizingSessionIds = [];
				});
				setTimeout(() => {
					set((state) => {
						state.closeAllFolders = true;
					});
				}, 2000);
			}
		},

		setProcessingSessionId: (id) => {
			set((state) => {
				state.processingSessionId = id;
			});
		},

		setMovingSession: (moving) => {
			set((state) => {
				state.movingSession = moving;
			});
		},

		setCloseAllFolders: (close) => {
			set((state) => {
				state.closeAllFolders = close;
			});
		},

		handleBackgroundTaskComplete: (result) => {
			if (result.type === "name_chat" && result.data.name) {
				set((state) => {
					const session = state.sessions.find((s) => s.id === result.sessionId);
					if (session) {
						session.title = result.data.name!;
						session.updatedAt = Date.now();
					}
				});
			} else if (result.type === "organize_chat") {
				// Get the session type for folder creation
				const session = result.sessionId
					? get().sessions.find((s) => s.id === result.sessionId)
					: null;
				const folderType = session?.type || "chat";

				if (
					result.data.newFolderName &&
					result.data.newFolderId &&
					!result.sessionId
				) {
					const newFolder: ChatFolder = {
						id: result.data.newFolderId,
						name: result.data.newFolderName,
						type: folderType,
						createdAt: Date.now(),
						updatedAt: Date.now(),
					};
					set((state) => {
						if (!state.folders.some((f) => f.id === newFolder.id)) {
							state.folders.push(newFolder);
						}
					});
				} else if (result.data.folderId && result.sessionId) {
					get().setMovingSession({
						sessionId: result.sessionId,
						targetFolderId: result.data.folderId,
					});
					setTimeout(() => {
						set((state) => {
							const session = state.sessions.find(
								(s) => s.id === result.sessionId,
							);
							if (session) {
								session.folderId = result.data.folderId;
								session.updatedAt = Date.now();
							}
						});
						get().setMovingSession(null);
					}, 400);
				} else if (result.data.newFolderName && result.sessionId) {
					const folderId = result.data.newFolderId || generateId("folder");
					const newFolder: ChatFolder = {
						id: folderId,
						name: result.data.newFolderName,
						type: folderType,
						createdAt: Date.now(),
						updatedAt: Date.now(),
					};
					set((state) => {
						state.folders.push(newFolder);
					});
					get().setMovingSession({
						sessionId: result.sessionId,
						targetFolderId: folderId,
					});
					setTimeout(() => {
						set((state) => {
							const session = state.sessions.find(
								(s) => s.id === result.sessionId,
							);
							if (session) {
								session.folderId = folderId;
								session.updatedAt = Date.now();
							}
						});
						get().setMovingSession(null);
					}, 400);
				}
			}
		},

		// Cloud sync action - properly triggers immer and re-renders
		// This is called by PuterSyncProvider when loading data from cloud
		syncFromCloud: (sessions, folders) => {
			set((state) => {
				// CRITICAL: Use splice to replace array contents in-place
				// This ensures immer detects the change and creates a new reference
				state.sessions.splice(0, state.sessions.length, ...sessions);
				state.folders.splice(0, state.folders.length, ...folders);
				// Increment sync version to force re-renders in components
				state._syncVersion = (state._syncVersion || 0) + 1;
			});
		},
	}),
	{
		name: "puter-chat-sessions",
		excludeFromPersist: [
			"isInitialized",
			"isOrganizing",
			"organizingSessionIds",
			"processingSessionId",
			"movingSession",
			"closeAllFolders",
			"namingTriggeredSet",
			"prevMessageCountMap",
			"_syncVersion",
		],
	},
);

// Save to storage whenever sessions or folders change
useSessionsStore.subscribe((state) => {
	if (state.isInitialized && state.sessions.length > 0) {
		storage.saveSessions(state.sessions);
	}
});

useSessionsStore.subscribe((state) => {
	if (state.isInitialized) {
		storage.saveFolders(state.folders);
	}
});

export { useSessionsStore };
