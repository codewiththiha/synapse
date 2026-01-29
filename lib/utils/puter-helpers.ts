/**
 * Shared Puter AI helpers
 * Consolidates duplicate patterns across services
 */

/**
 * Check if Puter is available in the browser
 */
export function isPuterAvailable(): boolean {
	return typeof window !== "undefined" && !!window.puter;
}

/**
 * Extract text from various Puter AI response formats
 * Handles: string, { text }, { message: { content } }, { choices: [{ message: { content } }] }
 */
export function extractResponseText(response: unknown): string {
	if (typeof response === "string") return response;
	if (response && typeof response === "object") {
		const resp = response as Record<string, unknown>;
		if (typeof resp.text === "string") return resp.text;
		if (resp.message && typeof resp.message === "object") {
			const msg = resp.message as Record<string, unknown>;
			if (typeof msg.content === "string") return msg.content;
		}
		if (Array.isArray(resp.choices) && resp.choices[0]) {
			const choice = resp.choices[0] as Record<string, unknown>;
			if (typeof choice.message === "object" && choice.message) {
				const choiceMsg = choice.message as Record<string, unknown>;
				if (typeof choiceMsg.content === "string") return choiceMsg.content;
			}
		}
	}
	return "";
}

/**
 * Parse JSON from AI response, handling markdown code blocks
 */
export function parseAIJSON<T = Record<string, unknown>>(
	text: string,
): T | null {
	// Try direct parse first
	try {
		return JSON.parse(text.trim()) as T;
	} catch {
		// Try to extract JSON from markdown code block
		const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
		if (jsonMatch) {
			try {
				return JSON.parse(jsonMatch[1].trim()) as T;
			} catch {
				// Continue to next attempt
			}
		}
		// Try to find JSON object in text
		const objectMatch = text.match(/\{[\s\S]*\}/);
		if (objectMatch) {
			try {
				return JSON.parse(objectMatch[0]) as T;
			} catch {
				// Fall through to return null
			}
		}
		return null;
	}
}

/**
 * Parse JSON array from AI response (for flashcards, etc.)
 */
export function parseAIJSONArray<T>(text: string): T[] {
	try {
		const parsed = JSON.parse(text.trim());
		if (Array.isArray(parsed)) return parsed as T[];
	} catch {
		const arrayMatch = text.match(/\[[\s\S]*\]/);
		if (arrayMatch) {
			try {
				const parsed = JSON.parse(arrayMatch[0]);
				if (Array.isArray(parsed)) return parsed as T[];
			} catch {
				// Fall through
			}
		}
	}
	return [];
}

/**
 * Generate a unique ID with prefix
 */
export function generateId(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Delay helper for async operations
 */
export const delay = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Puter API Error interface
 */
export interface PuterAPIError {
	error?:
		| {
				code?: string;
				message?: string;
				status?: number;
		  }
		| string;
	success?: boolean;
	message?: string;
	$?: string;
	code?: string;
}

/**
 * Parse Puter API error and return user-friendly message
 */
export function getPuterErrorMessage(error: unknown): string {
	if (!error || typeof error !== "object") {
		if (typeof error === "string") return error;
		return "An unexpected error occurred. Please try again.";
	}

	const puterError = error as PuterAPIError;

	// Handle {success: false, error: "message"} format
	if (puterError.success === false && typeof puterError.error === "string") {
		return formatErrorMessage(puterError.error);
	}

	// Handle {error: {code, message}} format
	if (puterError.error && typeof puterError.error === "object") {
		const errObj = puterError.error;
		if (errObj.code) {
			switch (errObj.code) {
				case "moderation_failed":
					return "Content was flagged by safety filters. Try different content or rephrase your text.";
				case "rate_limit_exceeded":
					return "Too many requests. Please wait a moment and try again.";
				case "invalid_request":
					return "Invalid request. Please check your input and try again.";
				case "model_not_found":
					return "AI model unavailable. Please try again later.";
				case "context_length_exceeded":
					return "Content is too long. Try with shorter text.";
				case "server_error":
					return "AI service is temporarily unavailable. Please try again later.";
				default:
					return errObj.message || "An error occurred with the AI service.";
			}
		}
		if (errObj.message) {
			return formatErrorMessage(errObj.message);
		}
	}

	// Handle {$: "heyputer:api/APIError", code, message} format
	if (puterError.$ === "heyputer:api/APIError") {
		if (puterError.code === "moderation_failed") {
			return "Content was flagged by safety filters. Try different content or rephrase your text.";
		}
		if (puterError.message) {
			return formatErrorMessage(puterError.message);
		}
	}

	// Handle direct message property
	if (puterError.message) {
		return formatErrorMessage(puterError.message);
	}

	// Check for standard error message
	if (error instanceof Error) {
		return formatErrorMessage(error.message);
	}

	return "An unexpected error occurred. Please try again.";
}

/**
 * Format error message to be more user-friendly
 */
function formatErrorMessage(message: string): string {
	// Make technical messages more readable
	if (message.includes("'content' property")) {
		return "This AI model returned an incompatible response. Try a different model.";
	}
	if (message.includes("network") || message.includes("fetch")) {
		return "Network error. Please check your connection and try again.";
	}
	if (message.includes("timeout")) {
		return "Request timed out. Please try again.";
	}
	return message;
}

/**
 * Check if error is a moderation failure
 */
export function isModerationError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const puterError = error as PuterAPIError;
	if (typeof puterError.error === "object" && puterError.error?.code) {
		return puterError.error.code === "moderation_failed";
	}
	if (puterError.code === "moderation_failed") {
		return true;
	}
	return false;
}
