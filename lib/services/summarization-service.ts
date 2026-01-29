/**
 * Summarization Service
 * Handles background conversation summarization to optimize AI chat performance
 * Requirements: 1.2, 1.4, 2.1, 2.2, 3.1, 3.3, 5.1, 5.3
 */

import { Message, SummarizationState } from "../types";
import { tryCatch } from "../utils/async";
import {
	isPuterAvailable,
	extractResponseText,
	generateId,
} from "../utils/puter-helpers";
import { useConcurrencyStore } from "@/stores/use-concurrency-store";

/**
 * Configuration for the summarization AI model
 * Requirements: 1.2
 */
const SUMMARIZATION_CONFIG = {
	model: "openrouter:google/gemma-3-27b-it:free",
	maxTokens: 18000,
	temperature: 0.5,
};

/**
 * Instruction prompt optimized for conversation summarization
 * Requirements: 1.4
 */
const SUMMARIZATION_INSTRUCTION = `You are a conversation summarization assistant. Your task is to create a concise summary of the conversation that preserves:

1. Key topics discussed
2. Important decisions or conclusions reached
3. Essential context needed for continuing the conversation
4. Any specific requests, preferences, or constraints mentioned by the user

Guidelines:
- Be concise but comprehensive
- Preserve the user's intent and any ongoing tasks
- Include relevant technical details if the conversation involves code or technical topics
- Maintain the conversational context so the AI can continue naturally
- Do not include greetings or meta-commentary about the summary itself

Respond with ONLY the summary text, no JSON wrapper or additional formatting.`;

/**
 * Result of a summarization operation
 */
export interface SummarizationResult {
	success: boolean;
	summary?: string;
	summaryMessageId?: string;
	/** Number of messages that were summarized (to be removed from history) */
	summarizedCount?: number;
	error?: string;
}

/**
 * Storage key for persisting summarization states
 */
const STORAGE_KEY = "puter_chat_summarization_states";

/**
 * Message threshold that triggers summarization
 * Requirements: 2.1
 */
const MESSAGE_THRESHOLD = 10;

/**
 * SummarizationService
 * Manages background summarization of chat conversations
 */
class SummarizationService {
	private states: Map<string, SummarizationState> = new Map();

	/**
	 * Track the message index when summarization was triggered
	 * This ensures we only remove the exact messages that were summarized
	 * even if more messages arrive during summarization
	 */
	private summarizationTriggerIndex: Map<string, number> = new Map();

	/**
	 * Check if summarization should be triggered for a session
	 * Requirements: 2.1, 3.3
	 *
	 * @param sessionId - The session to check
	 * @param aiHistoryLength - Current length of the AI history
	 * @returns true if summarization should be triggered
	 */
	shouldSummarize(sessionId: string, aiHistoryLength: number): boolean {
		const state = this.states.get(sessionId);

		// If no state exists, check threshold
		if (!state) {
			return aiHistoryLength >= MESSAGE_THRESHOLD;
		}

		// Don't trigger if already in progress or pending
		// This prevents duplicate summarization when user sends more messages
		// while summarization is still running
		if (state.status === "in_progress" || state.status === "pending") {
			return false;
		}

		// For failed state, retry on 11th message (one more than threshold)
		// Requirements: 3.3
		if (state.status === "failed") {
			return aiHistoryLength >= MESSAGE_THRESHOLD + 1;
		}

		// For completed state, check if we've accumulated enough new messages
		if (state.status === "completed" || state.status === "idle") {
			return aiHistoryLength >= MESSAGE_THRESHOLD;
		}

		return false;
	}

	/**
	 * Mark the start of summarization and record the trigger index
	 * This captures how many messages existed when summarization started
	 *
	 * @param sessionId - The session ID
	 * @param messageCount - Number of messages when summarization triggered
	 */
	markSummarizationStart(sessionId: string, messageCount: number): void {
		this.summarizationTriggerIndex.set(sessionId, messageCount);
	}

	/**
	 * Get the trigger index for a session's summarization
	 * Returns the message count when summarization was triggered
	 *
	 * @param sessionId - The session ID
	 * @returns The trigger index or null if not found
	 */
	getSummarizationTriggerIndex(sessionId: string): number | null {
		return this.summarizationTriggerIndex.get(sessionId) ?? null;
	}

	/**
	 * Clear the trigger index after summarization completes
	 *
	 * @param sessionId - The session ID
	 */
	clearSummarizationTriggerIndex(sessionId: string): void {
		this.summarizationTriggerIndex.delete(sessionId);
	}

	/**
	 * Perform background summarization of messages
	 * Requirements: 2.2, 5.1, 5.3
	 *
	 * @param sessionId - The session to summarize
	 * @param messages - Messages to summarize (oldest MESSAGE_THRESHOLD messages)
	 * @param existingSummary - Optional existing summary to merge with
	 * @returns SummarizationResult with success status, summary, and count of summarized messages
	 */
	async summarize(
		sessionId: string,
		messages: Message[],
		existingSummary?: string,
	): Promise<SummarizationResult> {
		// Check if Puter is available
		if (!isPuterAvailable()) {
			return { success: false, error: "AI service not available" };
		}

		// Try to start a task with the concurrent manager
		const { startTask, endTask } = useConcurrencyStore.getState();
		const abortController = startTask("summarization", sessionId);
		if (!abortController) {
			// Queue is full, mark as pending
			this.updateState(sessionId, { status: "pending" });
			return { success: false, error: "Summarization queue is full" };
		}

		// Store the count of messages being summarized
		// This is crucial for correctly removing messages after summarization completes
		const summarizedCount = messages.length;

		// Update state to in_progress
		this.updateState(sessionId, {
			status: "in_progress",
			lastAttemptTimestamp: Date.now(),
		});

		try {
			// Build the summarization prompt
			const conversationText = messages
				.map((m) => `${m.role.toUpperCase()}: ${m.content}`)
				.join("\n\n");

			let prompt = SUMMARIZATION_INSTRUCTION + "\n\n";

			// Handle existing summary merging (Requirements: 5.3)
			if (existingSummary) {
				prompt += `PREVIOUS SUMMARY:\n${existingSummary}\n\n`;
				prompt += `NEW MESSAGES TO INCORPORATE:\n${conversationText}`;
			} else {
				prompt += `CONVERSATION TO SUMMARIZE:\n${conversationText}`;
			}

			// Call AI for summarization
			const [response, error] = await tryCatch(
				window.puter.ai.chat([{ role: "user", content: prompt }], {
					model: SUMMARIZATION_CONFIG.model,
					max_tokens: SUMMARIZATION_CONFIG.maxTokens,
					temperature: SUMMARIZATION_CONFIG.temperature,
				}),
			);

			// Check if task was aborted
			if (abortController.signal.aborted) {
				endTask("summarization", sessionId);
				this.clearSummarizationTriggerIndex(sessionId);
				return { success: false, error: "Summarization cancelled" };
			}

			if (error) {
				// Mark as failed, preserve original messages
				this.updateState(sessionId, {
					status: "failed",
					error: error instanceof Error ? error.message : "Unknown error",
				});
				endTask("summarization", sessionId);
				this.clearSummarizationTriggerIndex(sessionId);
				return {
					success: false,
					error: `Summarization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				};
			}

			const summary = extractResponseText(response);
			if (!summary) {
				this.updateState(sessionId, {
					status: "failed",
					error: "Empty summary response",
				});
				endTask("summarization", sessionId);
				this.clearSummarizationTriggerIndex(sessionId);
				return { success: false, error: "Empty summary response" };
			}

			// Generate summary message ID (Requirements: 5.1)
			const summaryMessageId = generateId("summary");

			// Update state to completed (Requirements: 3.5)
			this.updateState(sessionId, {
				status: "completed",
				summaryMessageId,
				messagesProcessed: summarizedCount,
				error: undefined,
			});

			endTask("summarization", sessionId);

			return {
				success: true,
				summary,
				summaryMessageId,
				summarizedCount, // Return the exact count of messages that were summarized
			};
		} catch (err) {
			// Handle unexpected errors
			this.updateState(sessionId, {
				status: "failed",
				error: err instanceof Error ? err.message : "Unexpected error",
			});
			useConcurrencyStore.getState().endTask("summarization", sessionId);
			this.clearSummarizationTriggerIndex(sessionId);
			return {
				success: false,
				error: err instanceof Error ? err.message : "Unexpected error",
			};
		}
	}

	/**
	 * Get the summarization state for a session
	 * Requirements: 3.1
	 *
	 * @param sessionId - The session ID
	 * @returns The summarization state or null if not found
	 */
	getState(sessionId: string): SummarizationState | null {
		return this.states.get(sessionId) || null;
	}

	/**
	 * Update the summarization state for a session
	 * Requirements: 2.4, 3.1
	 *
	 * @param sessionId - The session ID
	 * @param update - Partial state update
	 */
	updateState(sessionId: string, update: Partial<SummarizationState>): void {
		const currentState = this.states.get(sessionId);

		const newState: SummarizationState = {
			sessionId,
			status: update.status ?? currentState?.status ?? "idle",
			lastAttemptTimestamp:
				update.lastAttemptTimestamp ??
				currentState?.lastAttemptTimestamp ??
				null,
			summaryMessageId:
				update.summaryMessageId ?? currentState?.summaryMessageId ?? null,
			messagesProcessed:
				update.messagesProcessed ?? currentState?.messagesProcessed ?? 0,
			error: update.error ?? currentState?.error,
		};

		this.states.set(sessionId, newState);

		// Persist states after update
		this.persistStates();
	}

	/**
	 * Delete the summarization state for a session
	 * Requirements: 7.4
	 *
	 * @param sessionId - The session ID to delete
	 */
	deleteState(sessionId: string): void {
		// Cancel any active task
		useConcurrencyStore.getState().cancelTask("summarization", sessionId);

		this.states.delete(sessionId);
		this.summarizationTriggerIndex.delete(sessionId);
		this.persistStates();
	}

	/**
	 * Persist all summarization states to local storage
	 * Requirements: 3.4, 7.1
	 */
	persistStates(): void {
		if (typeof window === "undefined") return;

		try {
			const statesArray = Array.from(this.states.entries());
			localStorage.setItem(STORAGE_KEY, JSON.stringify(statesArray));
		} catch (err) {
			console.error("Failed to persist summarization states:", err);
		}
	}

	/**
	 * Restore summarization states from local storage
	 * Requirements: 3.4, 7.2
	 */
	restoreStates(): void {
		if (typeof window === "undefined") return;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const statesArray = JSON.parse(stored) as [
					string,
					SummarizationState,
				][];
				this.states = new Map(statesArray);

				// Reset any in_progress states to pending (they were interrupted)
				this.states.forEach((state, sessionId) => {
					if (state.status === "in_progress") {
						this.states.set(sessionId, { ...state, status: "pending" });
					}
				});
			}
		} catch (err) {
			console.error("Failed to restore summarization states:", err);
			this.states = new Map();
		}
	}

	/**
	 * Get all session IDs with summarization states
	 */
	getAllSessionIds(): string[] {
		return Array.from(this.states.keys());
	}

	/**
	 * Get the message threshold for triggering summarization
	 */
	getMessageThreshold(): number {
		return MESSAGE_THRESHOLD;
	}
}

// Export singleton instance
export const summarizationService = new SummarizationService();

// Export for testing
export {
	SummarizationService,
	SUMMARIZATION_CONFIG,
	SUMMARIZATION_INSTRUCTION,
	MESSAGE_THRESHOLD,
	STORAGE_KEY,
};
