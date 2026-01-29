import {
	Message,
	AppSettings,
	ModelOption,
	CompletionOptions,
	PuterMessage,
	PuterMessageContent,
	PuterStreamChunk,
} from "../types";
import { AVAILABLE_MODELS } from "../constants";
import { devLog } from "../utils/dev-logger";
import { tryCatch, retryAsync } from "../utils/async";
import { extractResponseText, parseAIJSON } from "../utils/puter-helpers";

export interface ChatCompletionOptions {
	model?: string;
	maxTokens?: number;
	temperature?: number;
	jsonMode?: boolean;
	retryCount?: number;
}

export class PuterService {
	// Check if Puter is available
	static isPuterAvailable(): boolean {
		return typeof window !== "undefined" && !!window.puter;
	}

	/**
	 * Unified non-streaming chat completion
	 * Eliminates boilerplate across all AI services
	 * Handles: availability check, error handling, text extraction, JSON parsing, retries
	 */
	static async chatCompletion<T = string>(
		messages: Message[] | PuterMessage[],
		options: ChatCompletionOptions = {},
	): Promise<{ data: T | null; error: string | null }> {
		if (!this.isPuterAvailable()) {
			return { data: null, error: "AI service not available" };
		}

		const {
			model = "gpt-4o-mini",
			maxTokens = 1024,
			temperature = 0.7,
			jsonMode = false,
			retryCount = 0,
		} = options;

		// Normalize messages to PuterMessage format
		const puterMessages = this.normalizeToPuterMessages(messages);

		const completionFn = async () => {
			const [response, error] = await tryCatch(
				window.puter.ai.chat(puterMessages, {
					model,
					max_tokens: maxTokens,
					temperature,
				}),
			);

			if (error) {
				throw error;
			}

			// Extract text from response
			const text = extractResponseText(response);

			// Parse JSON if requested
			if (jsonMode) {
				const parsed = parseAIJSON<T>(text);
				if (!parsed) {
					throw new Error("Failed to parse JSON response");
				}
				return parsed;
			}

			return text as T;
		};

		// Retry logic
		if (retryCount > 0) {
			const [result, error] = await retryAsync(completionFn, retryCount, 500);

			if (error) {
				return {
					data: null,
					error: error instanceof Error ? error.message : String(error),
				};
			}

			return { data: result || null, error: null };
		}

		// Single attempt
		try {
			const result = await completionFn();
			return { data: result, error: null };
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Normalize messages to PuterMessage format
	 */
	private static normalizeToPuterMessages(
		messages: Message[] | PuterMessage[],
	): PuterMessage[] {
		if (messages.length === 0) return [];

		// Check if already in PuterMessage format
		const first = messages[0];
		if ("role" in first && typeof first.role === "string") {
			// Assume already normalized
			return messages as PuterMessage[];
		}

		// Convert from Message format
		return (messages as Message[]).map((msg) => ({
			role: msg.role,
			content: msg.content,
		}));
	}

	// Stream chat with Puter AI
	static async streamChat(
		messages: Message[],
		settings: AppSettings,
		onChunk: (textChunk: string, reasoningChunk?: string) => void,
		signal?: AbortSignal,
	): Promise<void> {
		if (!this.isPuterAvailable()) {
			throw new Error(
				"Puter is not available. Please include the Puter script.",
			);
		}

		const currentModel = AVAILABLE_MODELS.find(
			(m) => m.id === settings.modelId,
		);

		// Build messages array for Puter
		const puterMessages = this.buildPuterMessages(
			messages,
			currentModel,
			settings,
		);

		// Build options
		const options: CompletionOptions = {
			model: settings.modelId,
			stream: true,
			...currentModel?.defaultOptions,
		};

		// Add reasoning effort if supported
		if (
			currentModel?.capabilities?.supportsReasoning &&
			settings.reasoningEffort !== "none"
		) {
			options.reasoning_effort = settings.reasoningEffort;
			options["reasoning.effort"] = settings.reasoningEffort;
		}

		try {
			// DEBUG: Log what's actually being sent to Puter AI
			devLog("=== PUTER AI REQUEST ===");
			devLog("Model:", options.model);
			devLog(
				"Messages being sent to AI:",
				JSON.stringify(puterMessages, null, 2),
			);
			devLog("=== END PUTER AI REQUEST ===");

			const stream = (await window.puter.ai.chat(
				puterMessages,
				options,
			)) as AsyncIterable<PuterStreamChunk>;

			// Handle stream
			for await (const chunk of stream) {
				if (signal?.aborted) {
					break;
				}

				// Handle different chunk types
				if (chunk.text) {
					onChunk(chunk.text);
				}

				if (chunk.reasoning) {
					onChunk("", chunk.reasoning);
				}

				// Handle delta format
				if (chunk.choices?.[0]?.delta?.content) {
					onChunk(chunk.choices[0].delta.content);
				}

				if (chunk.choices?.[0]?.delta?.reasoning) {
					onChunk("", chunk.choices[0].delta.reasoning);
				}
			}
		} catch (error: unknown) {
			if (signal?.aborted) {
				throw new Error("Request aborted");
			}
			throw error;
		}
	}

	// Build Puter messages array
	private static buildPuterMessages(
		messages: Message[],
		currentModel: ModelOption | undefined,
		settings: AppSettings,
	): PuterMessage[] {
		const puterMessages: PuterMessage[] = [];

		// Only add system prompt if user explicitly set one
		// Don't use model's instruction field as it may cause issues
		if (settings.systemPrompt) {
			puterMessages.push({
				role: "system",
				content: settings.systemPrompt,
			});
		}

		// Add conversation messages
		for (let i = 0; i < messages.length; i++) {
			const msg = messages[i];

			if (msg.error) continue; // Skip error messages

			// Handle system messages (like summarization summaries)
			// These should be included as they contain conversation context
			if (msg.role === "system") {
				puterMessages.push({
					role: "system",
					content: msg.content,
				});
				continue;
			}

			let content: string | PuterMessageContent[];

			// For the first user message, prepend model instruction if it exists
			const isFirstUserMessage =
				i === 0 ||
				(i > 0 && messages.slice(0, i).every((m) => m.role !== "user"));
			const shouldPrependInstruction =
				isFirstUserMessage &&
				msg.role === "user" &&
				currentModel?.instruction &&
				!settings.systemPrompt; // Don't prepend if user has custom system prompt

			// Check if we have attachments
			if (msg.attachments && msg.attachments.length > 0) {
				// Check if any image attachments have actual data
				const hasImageWithData = msg.attachments.some(
					(a) =>
						a.type === "image" &&
						a.data &&
						currentModel?.capabilities?.supportsImages,
				);

				if (hasImageWithData) {
					// Build multimodal content array only if we have valid image data
					const contentArray: PuterMessageContent[] = [];

					// Add instruction to first text block if needed
					let textContent = msg.content;
					if (shouldPrependInstruction) {
						textContent = `${currentModel.instruction}\n\n${msg.content}`;
					}

					contentArray.push({ type: "text", text: textContent });

					for (const attachment of msg.attachments) {
						if (
							attachment.type === "image" &&
							attachment.data &&
							currentModel?.capabilities?.supportsImages
						) {
							// For images with data, send base64 data with proper format
							contentArray.push({
								type: "image_url",
								image_url: {
									url: `data:${attachment.mimeType || "image/jpeg"};base64,${attachment.data}`,
								},
							});
						} else if (attachment.type === "text" && attachment.data) {
							// Append text content to the main text
							contentArray[0].text += `\n\n[File: ${attachment.name}]\n${attachment.data}`;
						}
					}

					content = contentArray;
				} else {
					// No valid image data - convert to plain text with image indicator
					let textContent = msg.content;
					if (shouldPrependInstruction) {
						textContent = `${currentModel?.instruction}\n\n${msg.content}`;
					}

					// Add indicators for stripped images
					const imageAttachments = msg.attachments.filter(
						(a) => a.type === "image",
					);
					if (imageAttachments.length > 0) {
						const imageNames = imageAttachments.map((a) => a.name).join(", ");
						textContent = `[Previously shared image: ${imageNames}]\n${textContent}`;
					}

					// Add text attachments if they have data
					for (const attachment of msg.attachments) {
						if (attachment.type === "text" && attachment.data) {
							textContent += `\n\n[File: ${attachment.name}]\n${attachment.data}`;
						}
					}

					content = textContent;
				}
			} else {
				// Simple text message
				if (shouldPrependInstruction) {
					content = `${currentModel.instruction}\n\n${msg.content}`;
				} else {
					content = msg.content;
				}
			}

			puterMessages.push({
				role: msg.role,
				content: content,
			});
		}

		return puterMessages;
	}

	// Generate speech
	static async generateSpeech(
		text: string,
		modelId: string,
		voice: string,
	): Promise<string> {
		if (!this.isPuterAvailable()) {
			throw new Error(
				"Puter is not available. Please include the Puter script.",
			);
		}

		// Validate text length (Puter docs say max 3000 chars)
		if (text.length > 3000) {
			throw new Error("Text must be less than 3000 characters");
		}

		if (!text.trim()) {
			throw new Error("Text cannot be empty");
		}

		return new Promise((resolve, reject) => {
			window.puter.ai
				.txt2speech(text, {
					provider: "openai",
					model: modelId,
					voice: voice,
				})
				.then((audio) => {
					console.log("TTS success, audio element:", audio);
					if (audio && audio.src) {
						resolve(audio.src);
					} else if (audio instanceof HTMLAudioElement) {
						// Try to get src from the element
						resolve(audio.currentSrc || audio.src);
					} else {
						reject(new Error("Invalid audio response from TTS"));
					}
				})
				.catch((error: unknown) => {
					console.error("TTS promise rejected:", error);
					// Extract error message from various formats
					let message = "Failed to generate speech";
					if (error && typeof error === "object") {
						const err = error as Record<string, unknown>;
						if (err.message) message = String(err.message);
						else if (err.error) message = String(err.error);
					} else if (typeof error === "string") {
						message = error;
					}
					reject(new Error(message));
				});
		});
	}
}
