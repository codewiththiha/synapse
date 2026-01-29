"use client";

import { PuterService } from "./puter-service";
import { AI_CONFIGS } from "./ai-config";
import { AI_PROMPTS } from "@/lib/config/prompts";

export type StorageItem = {
	id: string;
	name: string;
	type:
		| "chat"
		| "tts"
		| "folder"
		| "cover"
		| "collection"
		| "memo"
		| "block"
		| "gamification";
	createdAt?: number;
	messageCount?: number;
};

export const storageAI = {
	async suggestCleanup(items: StorageItem[]): Promise<string[]> {
		if (items.length === 0) {
			return [];
		}

		const itemList = items
			.map(
				(item) => `- ID: ${item.id}, Name: "${item.name}", Type: ${item.type}`,
			)
			.join("\n");

		const prompt = `Here are the storage items:\n${itemList}\n\nReturn a JSON array of IDs to remove:`;

		const { data, error } = await PuterService.chatCompletion<string[]>(
			[
				{ role: "system", content: AI_PROMPTS.storage.suggestCleanup },
				{ role: "user", content: prompt },
			],
			{
				model: AI_CONFIGS.cleanup.model,
				maxTokens: AI_CONFIGS.cleanup.maxTokens,
				jsonMode: true,
			},
		);

		if (error || !data) {
			console.error("Smart cleanup error:", error);
			return [];
		}

		// Validate that returned IDs exist in the original items
		const validIds = items.map((i) => i.id);
		return data.filter((id) => validIds.includes(id));
	},
};
