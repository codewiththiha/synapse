// Re-export common types for convenience
export type { Position2D } from "./types/common";
export type {
	PuterUser,
	SignInResult,
	AuthState,
	AuthActions,
	AuthStore,
} from "./types/auth";

// Core Types
export type Role = "user" | "assistant" | "system";

export type ReasoningEffort =
	| "none"
	| "minimal"
	| "low"
	| "medium"
	| "high"
	| "xhigh";

export type AppMode = "chat" | "tts";

export type SessionType = "chat" | "tts";

export type AttachmentType = "text" | "image" | "audio";

// Attachment Interface
export interface Attachment {
	id: string;
	name: string;
	type: AttachmentType;
	mimeType?: string;
	data?: string; // base64 or text content
	url?: string;
	size?: number;
	// Image parsing state (for non-vision models)
	isParsing?: boolean;
	parsedDescription?: string; // Hidden from user, sent to AI
	parseError?: string;
}

// Message Interface
export interface Message {
	id: string;
	role: Role;
	content: string;
	attachments?: Attachment[];
	reasoning?: string;
	audioUrl?: string;
	timestamp: number;
	isStreaming?: boolean;
	error?: boolean;
	// Model tracking - only set for successful assistant responses
	modelId?: string;
}

// Folder Interface
export interface ChatFolder {
	id: string;
	name: string;
	color?: string;
	isPinned?: boolean;
	type?: SessionType; // "chat" or "tts" - folders are type-specific
	createdAt: number;
	updatedAt: number;
}

// Chat Session Interface
export interface ChatSession {
	id: string;
	title: string;
	messages: Message[];
	folderId?: string; // Optional folder assignment
	isPinned?: boolean;
	type: SessionType; // "chat" or "tts"
	createdAt: number;
	updatedAt: number;
	// Summarization fields
	aiHistory?: Message[]; // AI history (summarized + recent messages)
	summaryMessage?: Message; // Current summary message
}

// Tool Configuration
export interface ToolConfig {
	webSearch: boolean;
	imageGeneration: boolean;
	codeExecution: boolean;
}

// Model Capabilities
export interface ModelCapabilities {
	supportsReasoning: boolean;
	supportsImages: boolean;
	supportsAudio: boolean;
	supportsTools: boolean;
	maxTokens?: number;
}

// Model Option
export interface ModelOption {
	id: string;
	name: string;
	description: string;
	capabilities?: ModelCapabilities;
	defaultOptions?: {
		max_tokens?: number;
		reasoning_effort?: ReasoningEffort;
		temperature?: number;
	};
	instruction?: string;
	initialGreeting?: string;
	intelligenceScore?: number; // 0-100, higher = more intelligent
}

// Model Sort Order
export type ModelSortOrder = "name" | "free" | "intelligence" | "fi";

// Voice Option
export interface VoiceOption {
	id: string;
	name: string;
	description?: string;
}

// Supported Languages for Flashcards
export type FlashcardLanguage = "en" | "my" | "es" | "vi" | "th";

// Storage Mode - local only or sync with Puter cloud
export type StorageMode = "local" | "puter";

// Event Reminder Minutes - how many minutes before event to notify
export type EventReminderMinutes = 5 | 10 | 15 | 0; // 0 = disabled

// App Settings
export interface AppSettings {
	modelId: string;
	ttsModelId: string;
	ttsVoice: string;
	mode: AppMode;
	reasoningEffort: ReasoningEffort;
	tools: ToolConfig;
	systemPrompt?: string;
	modelSortOrder?: ModelSortOrder; // Sort order for model list
	cardLanguage?: FlashcardLanguage; // Language for flashcard generation
	explainLanguage?: FlashcardLanguage; // Language for card explanations
	storageMode?: StorageMode; // Storage mode: local or puter cloud sync
	eventReminderMinutes?: EventReminderMinutes; // Minutes before event to notify (0 = disabled)
}

// Summarization Types
export type SummarizationStatus =
	| "idle"
	| "pending"
	| "in_progress"
	| "completed"
	| "failed";

export interface SummarizationState {
	sessionId: string;
	status: SummarizationStatus;
	lastAttemptTimestamp: number | null;
	summaryMessageId: string | null;
	messagesProcessed: number;
	error?: string;
}

// Background AI Task Types
export type BackgroundTaskType = "name_chat" | "organize_chat";

export interface BackgroundTaskResult {
	type: BackgroundTaskType;
	sessionId: string;
	data: {
		name?: string;
		folderId?: string;
		newFolderName?: string;
		newFolderId?: string; // The actual ID for newly created folders
	};
}

// Puter API Types
export interface CompletionOptions {
	model?: string;
	stream?: boolean;
	max_tokens?: number;
	temperature?: number;
	reasoning_effort?: ReasoningEffort;
	"reasoning.effort"?: ReasoningEffort;
}

export interface PuterMessageContent {
	type: "text" | "image_url";
	text?: string;
	image_url?: {
		url: string;
	};
}

export interface PuterMessage {
	role: string;
	content: string | PuterMessageContent[];
}

export interface PuterStreamChunk {
	text?: string;
	reasoning?: string;
	choices?: Array<{
		delta?: {
			content?: string;
			reasoning?: string;
		};
	}>;
}

// React Markdown Component Props
export interface MarkdownComponentProps {
	children?: React.ReactNode;
	inline?: boolean;
	className?: string;
	href?: string;
	node?: unknown;
}

// Puter File System Item
export interface PuterFSItem {
	name: string;
	path: string;
	is_dir: boolean;
	size?: number;
	created?: number;
	modified?: number;
}

// Global Puter Declaration
declare global {
	interface Window {
		puter: {
			ai: {
				chat: (
					messages: string | { role: string; content: string | unknown[] }[],
					options?: CompletionOptions,
				) => Promise<unknown>;
				txt2speech: (
					text: string,
					options?: {
						provider?: string;
						model?: string;
						voice?: string;
						response_format?: "mp3" | "wav" | "opus" | "aac" | "flac" | "pcm";
					},
				) => Promise<HTMLAudioElement>;
				img2txt: (options: {
					source: string;
					provider?: string;
					model?: string;
				}) => Promise<string>;
			};
			auth: {
				signIn: (options?: {
					attempt_temp_user_creation?: boolean;
				}) => Promise<{
					user: {
						uuid: string;
						username: string;
						email?: string;
						email_confirmed?: boolean;
						is_temp?: boolean;
						taskbar_items?: unknown[];
						referral_code?: string;
						feature_flags?: Record<string, boolean>;
					};
					token?: string;
				}>;
				signOut: () => Promise<void>;
				isSignedIn: () => boolean;
				getUser: () => Promise<{
					uuid: string;
					username: string;
					email?: string;
					email_confirmed?: boolean;
					is_temp?: boolean;
					taskbar_items?: unknown[];
					referral_code?: string;
					feature_flags?: Record<string, boolean>;
				}>;
			};
			// Key-Value Store
			kv: {
				set: (key: string, value: string) => Promise<boolean>;
				get: (key: string) => Promise<string | null>;
				del: (key: string) => Promise<void>;
				list: (
					pattern?: string | boolean,
				) => Promise<string[] | Array<{ key: string; value: string }>>;
				incr: (key: string) => Promise<number>;
				decr: (key: string) => Promise<number>;
				flush: () => Promise<void>;
			};
			// File System
			fs: {
				write: (
					path: string,
					data: string | Blob,
					options?: { createMissingParents?: boolean; dedupeName?: boolean },
				) => Promise<PuterFSItem>;
				read: (path: string) => Promise<Blob>;
				mkdir: (
					path: string,
					options?: { createMissingParents?: boolean },
				) => Promise<PuterFSItem>;
				readdir: (path: string) => Promise<PuterFSItem[]>;
				rename: (oldPath: string, newPath: string) => Promise<PuterFSItem>;
				copy: (source: string, destination: string) => Promise<PuterFSItem>;
				move: (source: string, destination: string) => Promise<PuterFSItem>;
				stat: (path: string) => Promise<PuterFSItem>;
				delete: (
					path: string,
					options?: { recursive?: boolean },
				) => Promise<void>;
				upload: (files: FileList) => Promise<PuterFSItem | PuterFSItem[]>;
			};
			// Utility
			print: (text: string) => void;
			randName: () => string;
		};
	}
}

export {};
