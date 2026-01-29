import { ModelOption, ModelSortOrder } from "@/lib/types";
import { AVAILABLE_MODELS } from "@/lib/constants";

/**
 * Get model display name from model ID
 * Returns a shortened/friendly name for display in UI
 */
export function getModelDisplayName(modelId: string): string {
	// Find the model in available models
	const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
	if (model) {
		return model.name;
	}

	// Fallback: extract a readable name from the ID
	// e.g., "openrouter:google/gemma-3-27b-it:free" -> "Gemma 3 27B"
	const parts = modelId.split("/");
	const lastPart = parts[parts.length - 1] || modelId;

	// Remove common suffixes and clean up
	return lastPart
		.replace(/:free$/, "")
		.replace(/-instruct$/, "")
		.replace(/-it$/, "")
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/**
 * Check if a model is free based on its ID
 */
export function isModelFree(model: ModelOption): boolean {
	return model.id.toLowerCase().includes("free");
}

/**
 * Get intelligence score for a model (with fallback estimation)
 */
export function getIntelligenceScore(model: ModelOption): number {
	if (model.intelligenceScore !== undefined) {
		return model.intelligenceScore;
	}

	// Estimate based on model id if not provided
	const id = model.id.toLowerCase();

	// Large models tend to be more intelligent
	if (id.includes("235b") || id.includes("120b")) return 90;
	if (id.includes("70b")) return 85;
	if (id.includes("32b") || id.includes("30b")) return 75;
	if (id.includes("24b") || id.includes("27b")) return 72;
	if (id.includes("12b") || id.includes("9b")) return 65;
	if (id.includes("7b") || id.includes("4b")) return 55;

	// Known high-quality models
	if (id.includes("deepseek") && id.includes("r1")) return 90;
	if (id.includes("qwen3")) return 85;
	if (id.includes("llama-3.3")) return 85;
	if (id.includes("phi-4")) return 78;
	if (id.includes("gemma-3")) return 75;

	// Default
	return 60;
}

/**
 * Sort models based on the specified order
 */
export function sortModels(
	models: ModelOption[],
	sortOrder: ModelSortOrder = "name",
): ModelOption[] {
	const sorted = [...models];

	switch (sortOrder) {
		case "name":
			return sorted.sort((a, b) => a.name.localeCompare(b.name));

		case "free":
			return sorted.sort((a, b) => {
				const aFree = isModelFree(a);
				const bFree = isModelFree(b);
				if (aFree && !bFree) return -1;
				if (!aFree && bFree) return 1;
				return a.name.localeCompare(b.name);
			});

		case "intelligence":
			return sorted.sort((a, b) => {
				const aScore = getIntelligenceScore(a);
				const bScore = getIntelligenceScore(b);
				return bScore - aScore; // Higher score first
			});

		case "fi":
			// Free + Intelligence: Free models first, then sorted by intelligence
			return sorted.sort((a, b) => {
				const aFree = isModelFree(a);
				const bFree = isModelFree(b);

				// Free models come first
				if (aFree && !bFree) return -1;
				if (!aFree && bFree) return 1;

				// Within same free/paid category, sort by intelligence
				const aScore = getIntelligenceScore(a);
				const bScore = getIntelligenceScore(b);
				return bScore - aScore;
			});

		default:
			return sorted;
	}
}

/**
 * Filter models by search query
 */
export function filterModels(
	models: ModelOption[],
	query: string,
): ModelOption[] {
	if (!query.trim()) return models;

	const lowerQuery = query.toLowerCase();
	return models.filter(
		(model) =>
			model.name.toLowerCase().includes(lowerQuery) ||
			model.id.toLowerCase().includes(lowerQuery) ||
			model.description.toLowerCase().includes(lowerQuery),
	);
}
