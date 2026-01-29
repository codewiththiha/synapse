/**
 * Background AI Service
 * Handles concurrent AI operations that don't block the main chat
 * - Chat naming
 * - Chat organization into folders
 * - Image parsing for non-vision models
 */

import { ChatSession, ChatFolder, BackgroundTaskResult } from "../types";
import { tryCatch, retryAsync } from "../utils/async";
import {
	isPuterAvailable,
	extractResponseText,
	generateId,
	delay,
} from "../utils/puter-helpers";
import { AI_CONFIGS } from "./ai-config";
import { AI_PROMPTS } from "@/lib/config/prompts";
import { useConcurrencyStore } from "@/stores/use-concurrency-store";
import { PuterService } from "./puter-service";

class BackgroundAIService {
	// Use the concurrency store for task management
	private get store() {
		return useConcurrencyStore.getState();
	}

	async parseSingleImage(
		attachmentId: string,
		imageData: string,
		mimeType: string,
		imageName: string,
	): Promise<{ description?: string; error?: string }> {
		if (!isPuterAvailable()) {
			return { error: "AI service not available" };
		}

		const taskKey = `parse_image_${attachmentId}`;
		const controller = this.store.startTask("background", taskKey);

		if (!controller) {
			return { error: "Too many concurrent image parsing tasks" };
		}

		const [response, error] = await tryCatch(
			window.puter.ai.chat(
				[
					{
						role: "user",
						content: [
							{ type: "text", text: AI_PROMPTS.background.parseImage },
							{
								type: "image_url",
								image_url: {
									url: `data:${mimeType || "image/png"};base64,${imageData}`,
								},
							},
						],
					},
				],
				{
					model: AI_CONFIGS.imageParser.model,
					max_tokens: AI_CONFIGS.imageParser.maxTokens,
					temperature: AI_CONFIGS.imageParser.temperature,
				},
			),
		);

		this.store.endTask("background", taskKey);

		if (controller.signal.aborted) {
			return { error: "Parsing cancelled" };
		}

		if (error) {
			console.error("Error parsing image:", imageName, error);
			return {
				error: `Failed to parse image: ${error instanceof Error ? error.message : "Unknown error"}`,
			};
		}

		const description = extractResponseText(response);
		return { description: description || `[Image: ${imageName}]` };
	}

	cancelImageParsing(attachmentId: string): void {
		this.store.cancelTask("background", `parse_image_${attachmentId}`);
	}

	async generateChatName(
		session: ChatSession,
		onComplete: (result: BackgroundTaskResult) => void,
	): Promise<boolean> {
		if (!isPuterAvailable()) {
			this.fallbackNaming(session, onComplete);
			return false;
		}
		if (session.messages.length < 2) return false;

		const taskKey = `name_${session.id}`;
		const controller = this.store.startTask("background", taskKey);

		if (!controller) {
			return false; // Too many concurrent tasks
		}

		const contextMessages = session.messages.slice(0, 4);
		const context = contextMessages
			.map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
			.join("\n");

		const prompt = `${AI_PROMPTS.background.nameChat}\n\nConversation:\n${context}`;

		const { data, error } = await PuterService.chatCompletion<{ name: string }>(
			[{ role: "user", content: prompt }],
			{
				model: AI_CONFIGS.naming.model,
				maxTokens: AI_CONFIGS.naming.maxTokens,
				temperature: AI_CONFIGS.naming.temperature,
				jsonMode: true,
			},
		);

		this.store.endTask("background", taskKey);

		if (controller.signal.aborted) return false;

		if (error || !data?.name) {
			console.error("Background AI naming error:", error);
			this.fallbackNaming(session, onComplete);
			return false;
		}

		onComplete({
			type: "name_chat",
			sessionId: session.id,
			data: { name: data.name },
		});
		return true;
	}

	private fallbackNaming(
		session: ChatSession,
		onComplete: (result: BackgroundTaskResult) => void,
	): void {
		const firstUserMsg = session.messages.find((m) => m.role === "user");
		if (firstUserMsg) {
			const name =
				firstUserMsg.content.slice(0, 40) +
				(firstUserMsg.content.length > 40 ? "..." : "");
			onComplete({ type: "name_chat", sessionId: session.id, data: { name } });
		}
	}

	async organizeAllChats(
		sessions: ChatSession[],
		folders: ChatFolder[],
		onComplete: (result: BackgroundTaskResult) => void,
		onChatProcessing?: (sessionId: string) => void,
		maxRetries: number = 3,
	): Promise<{ organized: number; total: number }> {
		if (!isPuterAvailable()) {
			return { organized: 0, total: 0 };
		}

		const unorganizedSessions = sessions.filter(
			(s) => !s.folderId && s.title && s.title !== "New Chat",
		);

		if (unorganizedSessions.length === 0) {
			return { organized: 0, total: 0 };
		}

		unorganizedSessions.forEach((s) => onChatProcessing?.(s.id));

		const chatList = unorganizedSessions
			.map((s) => `- "${s.title}" (id: ${s.id})`)
			.join("\n");
		const existingFolderList =
			folders.length > 0
				? folders.map((f) => `- id: "${f.id}", name: "${f.name}"`).join("\n")
				: "No existing folders";

		// PHASE 1: Plan folder structure with retry
		const [planResult] = await retryAsync(
			async () => {
				const planPrompt = `${AI_PROMPTS.background.planFolders}

EXISTING FOLDERS:
${existingFolderList}

CHATS TO ORGANIZE:
${chatList}`;

				const { data, error } = await PuterService.chatCompletion<{
					folders: Array<{ id: string; name: string; isNew: boolean }>;
				}>([{ role: "user", content: planPrompt }], {
					model: AI_CONFIGS.organizing.model,
					maxTokens: AI_CONFIGS.organizing.maxTokens,
					temperature: AI_CONFIGS.organizing.temperature,
					jsonMode: true,
				});

				if (error || !data?.folders) {
					throw new Error(error || "Invalid plan response");
				}
				return data;
			},
			maxRetries,
			500,
		);

		if (!planResult?.folders) {
			console.error("Failed to get valid folder plan after retries");
			return { organized: 0, total: unorganizedSessions.length };
		}

		// Create new folders and build folder map
		const folderMap = new Map<string, string>();
		const allFolders: ChatFolder[] = [...folders];

		for (const folder of planResult.folders) {
			if (folder.isNew) {
				const newFolderId = generateId("folder");
				const newFolder: ChatFolder = {
					id: newFolderId,
					name: folder.name,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				};
				folderMap.set(folder.id, newFolderId);
				allFolders.push(newFolder);

				onComplete({
					type: "organize_chat",
					sessionId: "",
					data: { newFolderName: folder.name, newFolderId },
				});

				await delay(50);
			} else {
				folderMap.set(folder.id, folder.id);
			}
		}

		await delay(200);

		// PHASE 2: Assign chats to folders with retry
		const folderListForAssignment = allFolders
			.map((f) => `- id: "${f.id}", name: "${f.name}"`)
			.join("\n");

		const [assignResult] = await retryAsync(
			async () => {
				const assignPrompt = `${AI_PROMPTS.background.assignChats}

AVAILABLE FOLDERS:
${folderListForAssignment}

CHATS TO ASSIGN:
${chatList}`;

				const { data, error } = await PuterService.chatCompletion<{
					assignments: Array<{ sessionId: string; folderId: string }>;
				}>([{ role: "user", content: assignPrompt }], {
					model: AI_CONFIGS.organizing.model,
					maxTokens: AI_CONFIGS.organizing.maxTokens,
					temperature: AI_CONFIGS.organizing.temperature,
					jsonMode: true,
				});

				if (error || !data?.assignments) {
					throw new Error(error || "Invalid assignment response");
				}
				return data;
			},
			maxRetries,
			500,
		);

		if (!assignResult?.assignments) {
			console.error("Failed to get valid assignments after retries");
			return { organized: 0, total: unorganizedSessions.length };
		}

		// Process assignments
		let organizedCount = 0;
		for (const assignment of assignResult.assignments) {
			const session = unorganizedSessions.find(
				(s) => s.id === assignment.sessionId,
			);
			if (!session) continue;

			const realFolderId =
				folderMap.get(assignment.folderId) || assignment.folderId;
			const folderExists = allFolders.some((f) => f.id === realFolderId);
			if (!folderExists) continue;

			onComplete({
				type: "organize_chat",
				sessionId: assignment.sessionId,
				data: { folderId: realFolderId },
			});
			organizedCount++;
		}

		return { organized: organizedCount, total: unorganizedSessions.length };
	}

	cancelAllTasks(): void {
		this.store.cancelAllTasks("background");
	}
}

export const backgroundAI = new BackgroundAIService();
