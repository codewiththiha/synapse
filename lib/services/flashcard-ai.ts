/**
 * Flashcard AI Service
 * Handles text extraction, card generation, naming, organizing, and explaining
 * Uses Zod schemas for AI response validation
 */

import { z } from "zod";
import { GeneratedCardBatch } from "../types/flashcard";
import { FlashcardLanguage } from "../types";
import { retryAsync } from "../utils/async";
import {
	isPuterAvailable,
	extractResponseText,
	generateId,
	delay,
} from "../utils/puter-helpers";
import { devLog, devError } from "../utils/dev-logger";
import { AI_CONFIGS } from "./ai-config";
import { AI_PROMPTS } from "@/lib/config/prompts";
import { PuterService } from "./puter-service";
import {
	aiCardSchema,
	aiQuestionPlanSchema,
	aiCollectionPlanSchema,
	aiAssignmentSchema,
} from "../schemas/flashcard";
import { cardCountSchema } from "../schemas/common";

class FlashcardAIService {
	async extractText(source: string): Promise<string> {
		if (!isPuterAvailable()) {
			throw new Error("AI service not available");
		}

		return "OCR" === "OCR"
			? this.extractWithOCR(source)
			: this.extractWithAIModel(source);
	}

	private async extractWithOCR(source: string): Promise<string> {
		const response = await window.puter.ai.img2txt({
			source,
			provider: "mistral",
			model: "mistral-ocr-latest",
		});
		return response || "";
	}

	private async extractWithAIModel(source: string): Promise<string> {
		const content: unknown[] = [
			{ type: "text", text: AI_PROMPTS.flashcard.extraction },
			{ type: "image_url", image_url: { url: source } },
		];

		const response = await window.puter.ai.chat([{ role: "user", content }], {
			model: AI_CONFIGS.extraction.model,
			max_tokens: AI_CONFIGS.extraction.maxTokens,
			temperature: AI_CONFIGS.extraction.temperature,
		});

		return extractResponseText(response);
	}

	private lastError: unknown = null;

	/**
	 * Two-step card generation to avoid duplicates:
	 * 1. Question Planning: Single model generates all unique questions
	 * 2. Answer Generation: Concurrent models generate answers for assigned questions
	 */
	async generateCards(
		text: string,
		totalCount: number,
		onProgress?: (progress: number) => void,
		language: FlashcardLanguage = "en",
	): Promise<Array<{ q: string; a: string }>> {
		if (!isPuterAvailable()) {
			throw new Error("AI service not available");
		}

		this.lastError = null;

		// Validate and clamp card count using Zod schema
		const countResult = cardCountSchema.safeParse(totalCount);
		const count = countResult.success
			? countResult.data
			: Math.min(Math.max(totalCount, 1), 30);

		// Step 1: Plan all questions with a single model (0-30% progress)
		devLog("Step 1: Planning questions...");
		onProgress?.(5);

		const questions = await this.planQuestions(text, count, language);
		if (questions.length === 0) {
			if (this.lastError) throw this.lastError;
			throw new Error("Failed to generate questions");
		}

		onProgress?.(30);
		devLog(`Planned ${questions.length} questions`);

		// Step 2: Distribute questions to concurrent models (30-100% progress)
		const batches = this.distributeQuestions(questions);
		devLog(`Distributing to ${batches.length} concurrent models`);

		const batchPromises = batches.map((batchQuestions, index) =>
			this.generateAnswersForQuestions(
				text,
				batchQuestions,
				index,
				(batchProgress) => {
					// Map batch progress (0-100) to overall progress (30-100)
					const overallProgress =
						30 + ((index + batchProgress / 100) / batches.length) * 70;
					onProgress?.(overallProgress);
				},
				language,
			),
		);

		const results = await Promise.all(batchPromises);
		const allCards = results.flatMap((batch) => batch.cards);

		if (allCards.length === 0 && this.lastError) {
			throw this.lastError;
		}

		onProgress?.(100);
		return allCards;
	}

	/**
	 * Step 1: Single model plans all questions to ensure uniqueness
	 * Uses Zod schema to validate AI response
	 */
	private async planQuestions(
		text: string,
		count: number,
		language: FlashcardLanguage,
		maxRetries: number = 3,
	): Promise<string[]> {
		const instruction = AI_PROMPTS.flashcard.planQuestions(language, count);
		const prompt = `${instruction}\n\nContent to create questions from:\n${text.slice(0, 8000)}`;

		const [result, finalError] = await retryAsync(
			async () => {
				const { data, error } = await PuterService.chatCompletion<unknown>(
					[{ role: "user", content: prompt }],
					{
						model: AI_CONFIGS.questionPlanner.model,
						maxTokens: AI_CONFIGS.questionPlanner.maxTokens,
						temperature: AI_CONFIGS.questionPlanner.temperature,
						jsonMode: true,
					},
				);

				if (error || !data) {
					throw new Error(error || "No questions generated");
				}

				// Validate using Zod schema - replaces manual filtering
				const questions = aiQuestionPlanSchema.parse(data);
				if (questions.length === 0) {
					throw new Error("No valid questions generated");
				}

				return questions;
			},
			maxRetries,
			500,
		);

		if (finalError) {
			devError("Question planning failed:", finalError);
			this.lastError = finalError;
			return [];
		}

		return result || [];
	}

	/**
	 * Distribute questions evenly across batches (max 10 per batch)
	 * e.g., 27 questions -> [10, 10, 7]
	 */
	private distributeQuestions(questions: string[]): string[][] {
		const batches: string[][] = [];
		let remaining = [...questions];

		while (remaining.length > 0) {
			const batchSize = Math.min(remaining.length, 10);
			batches.push(remaining.slice(0, batchSize));
			remaining = remaining.slice(batchSize);
		}

		return batches;
	}

	/**
	 * Step 2: Generate answers for pre-planned questions (concurrent)
	 * Uses Zod schema to validate AI response
	 */
	private async generateAnswersForQuestions(
		text: string,
		questions: string[],
		batchIndex: number,
		onProgress?: (progress: number) => void,
		language: FlashcardLanguage = "en",
		maxRetries: number = 3,
	): Promise<GeneratedCardBatch> {
		const instruction = AI_PROMPTS.flashcard.generateAnswers(language);
		const questionsJson = JSON.stringify(questions);
		const prompt = `${instruction}\n\nSource content:\n${text.slice(0, 8000)}\n\nQuestions to answer:\n${questionsJson}`;

		const [result, finalError] = await retryAsync(
			async () => {
				const { data, error } = await PuterService.chatCompletion<unknown>(
					[{ role: "user", content: prompt }],
					{
						model: AI_CONFIGS.cardGenerator.model,
						maxTokens: AI_CONFIGS.cardGenerator.maxTokens,
						temperature: AI_CONFIGS.cardGenerator.temperature,
						jsonMode: true,
					},
				);

				if (error || !data) {
					throw new Error(error || "No valid cards generated");
				}

				// Validate using Zod schema - replaces manual .filter((c) => c.q && c.a)
				const cards = z.array(aiCardSchema).parse(data);
				if (cards.length === 0) {
					throw new Error("No valid cards generated");
				}

				return cards;
			},
			maxRetries,
			500,
		);

		if (finalError) {
			devError(
				`Batch ${batchIndex} answer generation failed after ${maxRetries} retries:`,
				finalError,
			);
			this.lastError = finalError;
			return { cards: [], batchIndex };
		}

		onProgress?.(100);
		return { cards: result || [], batchIndex };
	}

	async generateCoverName(textSample: string): Promise<string> {
		if (!isPuterAvailable()) return "Flashcard Set";

		// Debug: Log what text is being sent
		devLog("=== COVER NAME GENERATION ===");
		devLog("Text sample length:", textSample?.length || 0);
		devLog("Text sample preview:", textSample?.slice(0, 200) || "EMPTY");

		// If no text provided, return default
		if (!textSample || textSample.trim().length === 0) {
			devLog("No text provided for cover name generation");
			return "Flashcard Set";
		}

		const { data, error } = await PuterService.chatCompletion<string>(
			[
				{
					role: "user",
					content: `${AI_PROMPTS.flashcard.generateCoverName}\n\nContent sample:\n${textSample.slice(0, 500)}`,
				},
			],
			{
				model: AI_CONFIGS.nameGenerator.model,
				maxTokens: AI_CONFIGS.nameGenerator.maxTokens,
				temperature: AI_CONFIGS.nameGenerator.temperature,
			},
		);

		if (error) {
			devError("Cover name generation error:", error);
			return "Flashcard Set";
		}
		const name = (data || "").trim();
		devLog("Generated cover name:", name);
		return name || "Flashcard Set";
	}

	async explainCard(
		question: string,
		answer: string,
		language: FlashcardLanguage = "en",
		signal?: AbortSignal,
	): Promise<string> {
		if (!isPuterAvailable()) {
			throw new Error("AI service not available");
		}

		const instruction = AI_PROMPTS.flashcard.explainCard(language);
		const prompt = `${instruction}\n\nQuestion: ${question}\nAnswer: ${answer}\n\nProvide a detailed explanation:`;

		// Track if we've been aborted
		let aborted = false;

		if (signal) {
			signal.addEventListener("abort", () => {
				aborted = true;
			});

			// Check if already aborted
			if (signal.aborted) {
				throw new DOMException("Aborted", "AbortError");
			}
		}

		// Use non-streaming chat completion for better performance
		const response = await window.puter.ai.chat(
			[{ role: "user", content: prompt }],
			{
				model: AI_CONFIGS.explainer.model,
				max_tokens: AI_CONFIGS.explainer.maxTokens,
				temperature: AI_CONFIGS.explainer.temperature,
			},
		);

		// Check if aborted after response arrives
		if (aborted) {
			throw new DOMException("Aborted", "AbortError");
		}

		const result = extractResponseText(response);

		if (!result) {
			throw new Error("Failed to generate explanation");
		}

		return result;
	}

	async organizeCovers(
		covers: Array<{ id: string; name: string }>,
		existingCollections: Array<{ id: string; name: string }>,
		onProgress?: (phase: string, progress: number) => void,
		maxRetries: number = 3,
	): Promise<{
		assignments: Array<{ coverId: string; collectionId: string }>;
		newCollections: Array<{ id: string; name: string }>;
	}> {
		if (!isPuterAvailable() || covers.length === 0) {
			return { assignments: [], newCollections: [] };
		}

		onProgress?.("planning", 0);

		const coverList = covers
			.map((c) => `- "${c.name}" (id: ${c.id})`)
			.join("\n");
		const existingCollectionList =
			existingCollections.length > 0
				? existingCollections
						.map((c) => `- id: "${c.id}", name: "${c.name}"`)
						.join("\n")
				: "No existing collections";

		// PHASE 1: Plan collection structure with retry and Zod validation
		const [planResult, planError] = await retryAsync(
			async () => {
				const planPrompt = `${AI_PROMPTS.flashcard.planCollections}

EXISTING COLLECTIONS:
${existingCollectionList}

CARD COVERS TO ORGANIZE:
${coverList}`;

				const { data, error } = await PuterService.chatCompletion<unknown>(
					[{ role: "user", content: planPrompt }],
					{
						model: AI_CONFIGS.organizerPlan.model,
						maxTokens: AI_CONFIGS.organizerPlan.maxTokens,
						temperature: AI_CONFIGS.organizerPlan.temperature,
						jsonMode: true,
					},
				);

				if (error) {
					throw new Error(error);
				}

				// Validate using Zod schema
				return aiCollectionPlanSchema.parse(data);
			},
			maxRetries,
			500,
		);

		if (planError || !planResult?.collections) {
			devError("Failed to get valid collection plan after retries:", planError);
			return { assignments: [], newCollections: [] };
		}

		onProgress?.("planning", 50);

		// Process planned collections
		const collectionMap = new Map<string, string>();
		const newCollections: Array<{ id: string; name: string }> = [];
		const allCollections = [...existingCollections];

		for (const collection of planResult.collections) {
			if (collection.isNew) {
				const newCollectionId = generateId("collection");
				collectionMap.set(collection.id, newCollectionId);
				newCollections.push({ id: newCollectionId, name: collection.name });
				allCollections.push({ id: newCollectionId, name: collection.name });
				await delay(50);
			} else {
				collectionMap.set(collection.id, collection.id);
			}
		}

		onProgress?.("assigning", 60);

		// PHASE 2: Assign covers to collections with retry and Zod validation
		const collectionListForAssignment = allCollections
			.map((c) => `- id: "${c.id}", name: "${c.name}"`)
			.join("\n");

		const [assignResult, assignError] = await retryAsync(
			async () => {
				const assignPrompt = `${AI_PROMPTS.flashcard.assignCovers}

AVAILABLE COLLECTIONS:
${collectionListForAssignment}

CARD COVERS TO ASSIGN:
${coverList}`;

				const { data, error } = await PuterService.chatCompletion<unknown>(
					[{ role: "user", content: assignPrompt }],
					{
						model: AI_CONFIGS.organizerAssign.model,
						maxTokens: AI_CONFIGS.organizerAssign.maxTokens,
						temperature: AI_CONFIGS.organizerAssign.temperature,
						jsonMode: true,
					},
				);

				if (error) {
					throw new Error(error);
				}

				// Validate using Zod schema
				return aiAssignmentSchema.parse(data);
			},
			maxRetries,
			500,
		);

		if (assignError || !assignResult?.assignments) {
			devError("Failed to get valid assignments after retries:", assignError);
			return { assignments: [], newCollections };
		}

		onProgress?.("assigning", 100);

		// Process assignments - resolve temp IDs to real IDs
		const assignments: Array<{ coverId: string; collectionId: string }> = [];
		for (const assignment of assignResult.assignments) {
			const cover = covers.find((c) => c.id === assignment.coverId);
			if (!cover) {
				devLog("Cover not found for assignment:", assignment.coverId);
				continue;
			}

			const realCollectionId =
				collectionMap.get(assignment.collectionId) || assignment.collectionId;
			const collectionExists = allCollections.some(
				(c) => c.id === realCollectionId,
			);
			if (!collectionExists) {
				devLog(
					"Collection not found for assignment:",
					assignment.collectionId,
					"->",
					realCollectionId,
				);
				continue;
			}

			assignments.push({
				coverId: assignment.coverId,
				collectionId: realCollectionId,
			});
		}

		devLog("Final assignments:", assignments);
		devLog("New collections:", newCollections);

		return { assignments, newCollections };
	}
}

export const flashcardAI = new FlashcardAIService();
