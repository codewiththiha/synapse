/**
 * Trading Bot Service
 * AI-powered service for custom reward negotiations in the gamification system
 * Uses Zod schemas for AI response validation
 */

import { z } from "zod";
import { TradeResponse } from "../types/gamification";
import { retryAsync } from "../utils/async";
import { isPuterAvailable } from "../utils/puter-helpers";
import { devLog, devError } from "../utils/dev-logger";
import { AI_CONFIGS } from "./ai-config";
import { AI_PROMPTS } from "@/lib/config/prompts";
import { PuterService } from "./puter-service";

/**
 * Zod schema for validating AI trade responses
 * Validates: Requirements 5.2, 14.2
 */
export const tradeResponseSchema = z.object({
	errorMessage: z.string().nullable(),
	costCoins: z.number().int().min(0),
	responseMessage: z.string(),
});

/**
 * Trade request interface
 */
export interface TradeRequest {
	userMessage: string;
}

/**
 * Default error response for graceful error handling
 */
const createErrorResponse = (message: string): TradeResponse => ({
	errorMessage: message,
	costCoins: 0,
	responseMessage: "",
});

/**
 * Negotiate a custom reward trade with the AI trading bot
 *
 * @param request - The trade request containing the user's message
 * @returns TradeResponse with either a valid trade offer or an error
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export async function negotiateTrade(
	request: TradeRequest,
): Promise<TradeResponse> {
	// Validate input
	if (!request.userMessage || request.userMessage.trim().length === 0) {
		return createErrorResponse(
			"Please describe what reward you'd like and for how long.",
		);
	}

	// Check AI availability
	if (!isPuterAvailable()) {
		return createErrorResponse(
			"AI service is not available. Please try again later.",
		);
	}

	devLog("Trading bot request:", request.userMessage);

	const instruction = AI_PROMPTS.tradingBot.negotiateTrade;
	const prompt = `${instruction}\n\nUser request: ${request.userMessage.trim()}`;

	// Attempt to get AI response with retries
	const [result, finalError] = await retryAsync(
		async () => {
			const { data, error } = await PuterService.chatCompletion<unknown>(
				[{ role: "user", content: prompt }],
				{
					model: AI_CONFIGS.tradingBot.model,
					maxTokens: AI_CONFIGS.tradingBot.maxTokens,
					temperature: AI_CONFIGS.tradingBot.temperature,
					jsonMode: true,
				},
			);

			if (error || !data) {
				throw new Error(error || "No response from trading bot");
			}

			// Validate response using Zod schema
			const validatedResponse = tradeResponseSchema.parse(data);
			return validatedResponse;
		},
		2, // Max 2 retries
		500, // 500ms delay between retries
	);

	// Handle retry failure
	if (finalError) {
		devError("Trading bot failed after retries:", finalError);
		return createErrorResponse(
			"I had trouble processing your request. Please try again with a clearer description of what you'd like.",
		);
	}

	// Return validated response
	if (result) {
		devLog("Trading bot response:", result);
		return result;
	}

	// Fallback error (shouldn't reach here)
	return createErrorResponse("Something went wrong. Please try again.");
}

/**
 * Trading Bot Service class for potential future extensions
 */
class TradingBotService {
	/**
	 * Negotiate a custom reward trade
	 */
	async negotiate(userMessage: string): Promise<TradeResponse> {
		return negotiateTrade({ userMessage });
	}

	/**
	 * Check if the trading bot service is available
	 */
	isAvailable(): boolean {
		return isPuterAvailable();
	}
}

export const tradingBot = new TradingBotService();
