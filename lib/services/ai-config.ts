/**
 * AI Configuration Module
 * Centralized AI model configurations for all services
 */

export interface AIModelConfig {
	model: string;
	maxTokens: number;
	temperature: number;
}

/**
 * Centralized AI configurations for all services
 * Used by: background-ai.ts, flashcard-ai.ts, storage-ai.ts
 */
export const AI_CONFIGS = {
	// Background AI - Chat naming
	naming: {
		model: "openrouter:xiaomi/mimo-v2-flash:free",
		maxTokens: 100,
		temperature: 0.3,
	},
	// Background AI - Chat organization
	organizing: {
		model: "openrouter:nvidia/nemotron-3-nano-30b-a3b:free",
		maxTokens: 450,
		temperature: 0.2,
	},
	// Background AI - Image parsing for non-vision models
	imageParser: {
		model: "openrouter:qwen/qwen-2.5-vl-7b-instruct:free",
		maxTokens: 1000,
		temperature: 0.3,
	},
	// Flashcard AI - Text extraction from images
	extraction: {
		model: "openrouter:qwen/qwen-2.5-vl-7b-instruct:free",
		maxTokens: 4000,
		temperature: 0.3,
	},
	// Flashcard AI - Question planning (runs first to avoid duplicates)
	questionPlanner: {
		model: "openrouter:nvidia/nemotron-3-nano-30b-a3b:free",
		maxTokens: 2000,
		temperature: 0.7,
	},
	// Flashcard AI - Card generation (receives pre-planned questions)
	cardGenerator: {
		model: "openrouter:google/gemma-3-27b-it:free",
		maxTokens: 2000,
		temperature: 0.7,
	},
	// Flashcard AI - Cover name generation
	nameGenerator: {
		model: "openrouter:xiaomi/mimo-v2-flash:free",
		maxTokens: 50,
		temperature: 0.5,
	},
	// Flashcard AI - Card explanation
	explainer: {
		model: "openrouter:xiaomi/mimo-v2-flash:free",
		maxTokens: 1000,
		temperature: 0.7,
	},
	// Flashcard AI - Cover organization (planning)
	organizerPlan: {
		model: "openrouter:nvidia/nemotron-3-nano-30b-a3b:free",
		maxTokens: 900,
		temperature: 0.7,
	},
	// Flashcard AI - Cover organization (assignment)
	organizerAssign: {
		model: "openrouter:nvidia/nemotron-3-nano-30b-a3b:free",
		maxTokens: 500,
		temperature: 0.3,
	},
	// Storage AI - Smart cleanup suggestions
	cleanup: {
		model: "openrouter:nvidia/nemotron-3-nano-30b-a3b:free",
		maxTokens: 500,
		temperature: 0.3,
	},
	// Planner AI - Schedule parsing and generation
	planner: {
		model: "openrouter:xiaomi/mimo-v2-flash:free",
		maxTokens: 12000,
		temperature: 0.1,
	},
	// Home Assistant - General help and navigation
	homeAssistant: {
		model: "openrouter:nvidia/nemotron-3-nano-30b-a3b:free",
		maxTokens: 500,
		temperature: 0.7,
	},
	// Card Command - @card command parsing
	cardCommand: {
		model: "openrouter:nvidia/nemotron-3-nano-30b-a3b:free",
		maxTokens: 1500,
		temperature: 0.5,
	},
	// Trading Bot - Custom reward negotiations
	tradingBot: {
		model: "openrouter:nvidia/nemotron-3-nano-30b-a3b:free",
		maxTokens: 500,
		temperature: 0.5,
	},
} as const;

export type AIConfigKey = keyof typeof AI_CONFIGS;
