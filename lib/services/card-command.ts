/**
 * Card Command Service
 * Handles @card command processing for flashcard generation from chat/assistant
 *
 * Refactored to use CommandAIEngine for unified timeout/abort handling
 */

import { flashcardAI } from "./flashcard-ai";
import { useFlashcardStore } from "@/stores/use-flashcard-store";
import { useSettingsStore } from "@/stores/use-settings-store";
import { toast } from "@/stores/use-global-store";
import { Flashcard, CardCover } from "@/lib/types/flashcard";
import { generateId } from "@/lib/utils/puter-helpers";
import { CommandAIEngine } from "./command-ai-engine";

// Keywords that indicate user wants to use conversation context
const CONVERSATION_CONTEXT_KEYWORDS = [
	"this conversation",
	"current chat",
	"our discussion",
	"our conversation",
	"the conversation",
	"the chat",
	"this chat",
	"what we discussed",
	"what we talked about",
	"from above",
	"from our chat",
];

// Types
export interface CardCommandRequest {
	command: string;
	conversationContext?: string;
}

export interface CardCommandAIResponse {
	message: string;
	function: "generate" | "error";
	context: string;
	cardAmount: number;
	error: boolean;
}

export interface CardCommandResult {
	success: boolean;
	message: string;
	coverId?: string;
}

// AI instruction prompt for command parsing
const CARD_COMMAND_INSTRUCTION = `You are a flashcard command parser. Parse the user's request and respond with JSON.

RULES:
1. Determine what topic/content the user wants flashcards about
2. Determine how many cards they want (default: 10, max: 30, min: 1)
3. IMPORTANT: For the "context" field, you must provide DETAILED content about the topic:
   - If user gives a topic (e.g., "history of Hitler", "photosynthesis"), write a comprehensive summary/overview of that topic (at least 200 words) that can be used to generate flashcards
   - If user references "this conversation" or "current chat", use the provided conversation context
   - The context should contain enough factual information to create meaningful flashcards
4. Only set error to true if the request is completely unclear or asks for something impossible

RESPOND ONLY with valid JSON:
{
  "message": "Brief status message for the user",
  "function": "generate" or "error",
  "context": "Detailed content about the topic (write comprehensive information if user just gives a topic name)",
  "cardAmount": number between 1-30,
  "error": true or false
}

EXAMPLES:
- "@card create 5 cards about photosynthesis" → Write detailed content about photosynthesis (what it is, process, importance, etc.), cardAmount: 5
- "@card create 10 cards about history of Hitler" → Write comprehensive historical information about Hitler, cardAmount: 10
- "@card make flashcards from this conversation" → Use the provided conversation context, cardAmount: 10
- "@card 1000 cards about math" → error: true, message about 30 card limit

IMPORTANT: When user provides a topic, YOU must generate the educational content in the context field. Do NOT just repeat the topic name.`;

class CardCommandService {
	/**
	 * Check if a message is a @card command
	 */
	isCardCommand(message: string): boolean {
		return message.trim().toLowerCase().startsWith("@card");
	}

	/**
	 * Check if the command requests conversation context
	 */
	requestsConversationContext(command: string): boolean {
		const lowerCommand = command.toLowerCase();
		return CONVERSATION_CONTEXT_KEYWORDS.some((keyword) =>
			lowerCommand.includes(keyword),
		);
	}

	/**
	 * Format conversation messages as a context string
	 */
	formatConversationContext(
		messages: Array<{ role: string; content: string }>,
	): string {
		const recentMessages = messages.slice(-10);
		if (recentMessages.length === 0) return "";

		return recentMessages
			.map((m) => {
				const role = m.role === "user" ? "User" : "Assistant";
				return `${role}: ${m.content}`;
			})
			.join("\n\n");
	}

	/**
	 * Process a @card command
	 */
	async processCommand(
		request: CardCommandRequest,
	): Promise<CardCommandResult> {
		// Check if user is requesting conversation context but none is provided
		const wantsConversationContext = this.requestsConversationContext(
			request.command,
		);
		if (wantsConversationContext && !request.conversationContext?.trim()) {
			return {
				success: false,
				message:
					"No conversation context available. Please use this command in a chat with existing messages, or provide a topic directly.",
			};
		}

		// Build context info for AI
		const contextInfo = request.conversationContext
			? `\n\nCONVERSATION CONTEXT (use if user references "this conversation" or "current chat"):\n${request.conversationContext}`
			: "";

		// Parse command with AI using CommandAIEngine
		const aiResponse = await CommandAIEngine.execute<CardCommandAIResponse>({
			prompt: `${CARD_COMMAND_INSTRUCTION}\n\nUser command: ${request.command}`,
			config: {
				configKey: "cardCommand",
				timeout: 10000,
				jsonMode: true,
			},
			contextInfo,
		});

		if (!aiResponse) {
			return {
				success: false,
				message: "Failed to process card command. Please try again.",
			};
		}

		// Validate response
		const validation = this.validateResponse(aiResponse);
		if (!validation.valid) {
			return {
				success: false,
				message: validation.error || "Invalid request",
			};
		}

		// If AI returned an error
		if (aiResponse.error || aiResponse.function === "error") {
			return {
				success: false,
				message: aiResponse.message || "Could not process your request",
			};
		}

		// Start generation
		const coverId = await this.startGeneration(
			aiResponse.context,
			aiResponse.cardAmount,
		);

		if (!coverId) {
			return {
				success: false,
				message: "Failed to start card generation",
			};
		}

		return {
			success: true,
			message: `Generating ${aiResponse.cardAmount} cards...`,
			coverId,
		};
	}

	/**
	 * Validate AI response
	 */
	private validateResponse(response: CardCommandAIResponse): {
		valid: boolean;
		error?: string;
	} {
		if (typeof response.message !== "string") {
			return { valid: false, error: "Invalid response from AI" };
		}

		if (response.function !== "generate" && response.function !== "error") {
			return { valid: false, error: "Invalid response from AI" };
		}

		if (response.error || response.function === "error") {
			return { valid: true };
		}

		// Clamp cardAmount to valid range
		if (typeof response.cardAmount !== "number") {
			response.cardAmount = 10;
		} else {
			response.cardAmount = Math.min(Math.max(response.cardAmount, 1), 30);
		}

		// Check context length
		if (typeof response.context !== "string" || response.context.length < 100) {
			return {
				valid: false,
				error:
					"Not enough content to generate cards. Please provide more details or a clearer topic.",
			};
		}

		return { valid: true };
	}

	/**
	 * Start background card generation
	 */
	private async startGeneration(
		context: string,
		cardAmount: number,
	): Promise<string | null> {
		const store = useFlashcardStore.getState();

		const coverName = await flashcardAI.generateCoverName(context);
		const coverId = generateId("cover");

		const cover: CardCover = {
			id: coverId,
			name: coverName,
			cardCount: 0,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		store.addCover(cover);

		toast({
			title: "Generating Cards",
			description: `Creating ${cardAmount} flashcards...`,
		});

		// Start generation in background (non-blocking)
		this.generateCardsInBackground(coverId, context, cardAmount);

		return coverId;
	}

	/**
	 * Generate cards in background
	 */
	private async generateCardsInBackground(
		coverId: string,
		context: string,
		cardAmount: number,
	): Promise<void> {
		const store = useFlashcardStore.getState();
		const { cardLanguage } = useSettingsStore.getState().settings;

		try {
			store.setGenerating(true);

			const generatedCards = await flashcardAI.generateCards(
				context,
				cardAmount,
				(progress) => store.setGenerationProgress(progress),
				cardLanguage || "en",
			);

			if (generatedCards.length === 0) {
				toast({
					title: "Generation Failed",
					description: "No cards were generated. Please try again.",
					variant: "destructive",
				});
				store.deleteCover(coverId);
				return;
			}

			const flashcards: Flashcard[] = generatedCards.map((card) => ({
				id: generateId("card"),
				question: card.q,
				answer: card.a,
				createdAt: Date.now(),
				coverId,
			}));

			store.addCards(flashcards);

			toast({
				title: "Cards Generated!",
				description: `Created ${flashcards.length} flashcards`,
				action: {
					label: "View Cards",
					onClick: () => {
						window.location.href = `/cards/`;
					},
				},
			});
		} catch (error) {
			console.error("Card generation error:", error);
			toast({
				title: "Generation Failed",
				description:
					error instanceof Error ? error.message : "Unknown error occurred",
				variant: "destructive",
			});
			store.deleteCover(coverId);
		} finally {
			store.setGenerating(false);
		}
	}
}

export const cardCommandService = new CardCommandService();
