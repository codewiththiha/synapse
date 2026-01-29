/**
 * Command AI Engine
 * Unified async handler for AI command processing
 * Eliminates duplicate timeout/abort logic across command services
 *
 * Features:
 * - Standardized Promise.race pattern for timeout/abort
 * - Centralized error handling
 * - Integration with concurrency store
 * - Type-safe response parsing
 */

import { tryCatch } from "@/lib/utils/async";
import {
	isPuterAvailable,
	extractResponseText,
	parseAIJSON,
	getPuterErrorMessage,
} from "@/lib/utils/puter-helpers";
import { AI_CONFIGS, AIConfigKey } from "./ai-config";
import { devLog, devError } from "@/lib/utils/dev-logger";

// Engine configuration
export interface AIEngineConfig {
	/** AI config key from AI_CONFIGS */
	configKey: AIConfigKey;
	/** Custom timeout in ms (overrides default) */
	timeout?: number;
	/** Enable JSON parsing of response */
	jsonMode?: boolean;
}

// Request options
export interface AIRequestOptions {
	/** The prompt to send to AI */
	prompt: string;
	/** Engine configuration */
	config: AIEngineConfig;
	/** Optional abort signal for cancellation */
	abortSignal?: AbortSignal;
	/** Optional context info to append to prompt */
	contextInfo?: string;
}

// Result types
export type AIEngineResult<T> =
	| { success: true; data: T }
	| { success: false; error: string; reason: "timeout" | "abort" | "error" };

// Default timeout (10 seconds)
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Command AI Engine
 * Standardizes AI request handling with timeout/abort support
 */
export class CommandAIEngine {
	/**
	 * Execute an AI request with timeout and abort handling
	 * Returns null on timeout/abort/error for backward compatibility
	 */
	static async execute<T>(options: AIRequestOptions): Promise<T | null> {
		const result = await this.executeWithResult<T>(options);
		return result.success ? result.data : null;
	}

	/**
	 * Execute with detailed result (includes error info)
	 */
	static async executeWithResult<T>(
		options: AIRequestOptions,
	): Promise<AIEngineResult<T>> {
		const { prompt, config, abortSignal, contextInfo } = options;

		// Check AI availability
		if (!isPuterAvailable()) {
			return {
				success: false,
				error: "AI service not available",
				reason: "error",
			};
		}

		// Get AI config
		const aiConfig = AI_CONFIGS[config.configKey];
		if (!aiConfig) {
			return {
				success: false,
				error: `Invalid AI config key: ${config.configKey}`,
				reason: "error",
			};
		}

		const timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
		const fullPrompt = contextInfo ? `${prompt}${contextInfo}` : prompt;

		// Track state
		let timedOut = false;
		let aborted = false;

		// Create timeout promise
		const timeoutPromise = new Promise<{ type: "timeout" }>((resolve) => {
			setTimeout(() => {
				timedOut = true;
				resolve({ type: "timeout" });
			}, timeout);
		});

		// Create abort promise
		const abortPromise = new Promise<{ type: "abort" }>((resolve) => {
			if (abortSignal) {
				if (abortSignal.aborted) {
					aborted = true;
					resolve({ type: "abort" });
				} else {
					abortSignal.addEventListener("abort", () => {
						aborted = true;
						resolve({ type: "abort" });
					});
				}
			}
		});

		// Create AI request promise
		const aiPromise = (async (): Promise<{
			type: "success";
			data: T | null;
			error?: string;
		}> => {
			const [response, error] = await tryCatch(
				window.puter.ai.chat([{ role: "user", content: fullPrompt }], {
					model: aiConfig.model,
					max_tokens: aiConfig.maxTokens,
					temperature: aiConfig.temperature,
				}),
			);

			// If already timed out or aborted, don't process
			if (timedOut || aborted) {
				devLog("AI response arrived after timeout/abort, ignoring");
				return { type: "success", data: null };
			}

			if (error) {
				devError("AI request error:", error);
				return {
					type: "success",
					data: null,
					error: getPuterErrorMessage(error),
				};
			}

			const responseText = extractResponseText(response);

			// Parse JSON if requested
			if (config.jsonMode) {
				const parsed = parseAIJSON<T>(responseText);
				if (!parsed) {
					devError("Failed to parse AI JSON response:", responseText);
					return {
						type: "success",
						data: null,
						error: "Failed to parse AI response",
					};
				}
				return { type: "success", data: parsed };
			}

			// Return raw text
			return { type: "success", data: responseText as T };
		})();

		// Race between AI request, timeout, and abort
		const promises: Promise<
			| { type: "timeout" }
			| { type: "abort" }
			| { type: "success"; data: T | null; error?: string }
		>[] = [aiPromise, timeoutPromise];

		if (abortSignal) {
			promises.push(abortPromise);
		}

		const result = await Promise.race(promises);

		if (result.type === "timeout") {
			devLog("AI request timed out after", timeout, "ms");
			return {
				success: false,
				error: "Request timed out. Please try again.",
				reason: "timeout",
			};
		}

		if (result.type === "abort") {
			devLog("AI request was aborted");
			return {
				success: false,
				error: "Request was cancelled.",
				reason: "abort",
			};
		}

		// Success type
		if (result.data === null) {
			return {
				success: false,
				error: result.error || "Failed to get AI response",
				reason: "error",
			};
		}

		return { success: true, data: result.data };
	}

	/**
	 * Execute with retry support
	 */
	static async executeWithRetry<T>(
		options: AIRequestOptions,
		maxRetries: number = 3,
		baseDelay: number = 500,
	): Promise<T | null> {
		let lastError: string | null = null;

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			const result = await this.executeWithResult<T>(options);

			if (result.success) {
				return result.data;
			}

			// Don't retry on abort
			if (result.reason === "abort") {
				return null;
			}

			lastError = result.error;

			// Wait before retry (exponential backoff)
			if (attempt < maxRetries - 1) {
				await new Promise((resolve) =>
					setTimeout(resolve, baseDelay * Math.pow(2, attempt)),
				);
			}
		}

		devError(`AI request failed after ${maxRetries} retries:`, lastError);
		return null;
	}
}
