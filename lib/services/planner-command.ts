/**
 * Planner Command Service
 * Handles @planner / @schedule command processing
 *
 * Refactored to use CommandAIEngine for unified timeout/abort handling
 */

import { usePlannerStore } from "@/stores/use-planner-store";
import { useConcurrencyStore } from "@/stores/use-concurrency-store";
import { toast } from "@/stores/use-global-store";
import {
	TimeBlock,
	PlannerCommandAIResponse,
	PlannerCommandResult,
	EVENT_COLORS,
} from "@/lib/types/planner";
import { generateId } from "@/lib/utils/puter-helpers";
import { CommandAIEngine } from "./command-ai-engine";
import { AI_PROMPTS } from "@/lib/config/prompts";
import { devLog } from "@/lib/utils/dev-logger";

// Type for AI block response before processing
interface AIBlock {
	title: string;
	start: string;
	end: string;
	color?: string;
	description?: string;
}

/**
 * Split a block that spans multiple days into separate daily blocks
 * react-big-calendar doesn't display overnight events properly,
 * so we split them at midnight boundaries
 */
function splitMultiDayBlock(block: AIBlock): AIBlock[] {
	const start = new Date(block.start);
	const end = new Date(block.end);

	// Get date-only values for comparison (ignoring time)
	const startDate = new Date(
		start.getFullYear(),
		start.getMonth(),
		start.getDate(),
	);
	const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

	// If same day, no split needed
	if (startDate.getTime() === endDate.getTime()) {
		return [block];
	}

	const blocks: AIBlock[] = [];

	// Calculate number of days spanned
	const daysDiff = Math.ceil(
		(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
	);

	for (let i = 0; i <= daysDiff; i++) {
		const currentDate = new Date(startDate);
		currentDate.setDate(currentDate.getDate() + i);

		// Determine block start time
		let blockStart: Date;
		if (i === 0) {
			// First block: use original start time
			blockStart = new Date(start);
		} else {
			// Subsequent blocks: start at midnight
			blockStart = new Date(currentDate);
			blockStart.setHours(0, 0, 0, 0);
		}

		// Determine block end time
		let blockEnd: Date;
		if (currentDate.getTime() === endDate.getTime()) {
			// Last block: use original end time
			blockEnd = new Date(end);
		} else {
			// Not the last block: end at 23:59:59
			blockEnd = new Date(currentDate);
			blockEnd.setHours(23, 59, 59, 999);
		}

		// Only add block if it has positive duration
		if (blockEnd > blockStart) {
			blocks.push({
				...block,
				start: blockStart.toISOString(),
				end: blockEnd.toISOString(),
			});
		}
	}

	return blocks;
}

/**
 * Process all blocks from AI response and split any multi-day blocks
 */
function processAIBlocks(blocks: AIBlock[]): AIBlock[] {
	return blocks.flatMap(splitMultiDayBlock);
}

// Command keywords
const PLANNER_COMMAND_PREFIXES = ["@planner", "@schedule", "@plan"];

export interface PlannerCommandRequest {
	command: string;
	conversationContext?: string;
}

class PlannerCommandService {
	private get concurrencyStore() {
		return useConcurrencyStore.getState();
	}

	/**
	 * Check if message is a planner command
	 */
	isPlannerCommand(message: string): boolean {
		const lower = message.trim().toLowerCase();
		return PLANNER_COMMAND_PREFIXES.some((prefix) => lower.startsWith(prefix));
	}

	/**
	 * Process a planner command (runs in background, non-blocking)
	 */
	async processCommand(
		request: PlannerCommandRequest,
	): Promise<PlannerCommandResult> {
		devLog("🗓️ Planner command received:", request.command);

		// Start background task with concurrency control
		const taskKey = `planner_${Date.now()}`;
		const controller = this.concurrencyStore.startTask("background", taskKey);

		if (!controller) {
			toast({
				title: "Too Many Tasks",
				description: "Please wait for current tasks to complete.",
				variant: "destructive",
			});
			return {
				success: false,
				message: "Too many concurrent tasks. Please wait and try again.",
			};
		}

		const plannerStore = usePlannerStore.getState();
		plannerStore.setGenerating(true);

		try {
			const currentTime = new Date().toLocaleString("en-US", {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				hour12: true,
			});

			// Build prompt using centralized prompts
			const systemPrompt = AI_PROMPTS.planner.parseSchedule(currentTime);
			const contextInfo = request.conversationContext
				? `\n\nConversation context:\n${request.conversationContext}`
				: "";

			devLog("🗓️ Starting AI parsing...");

			// Use CommandAIEngine for unified timeout/abort handling
			const aiResponse =
				await CommandAIEngine.execute<PlannerCommandAIResponse>({
					prompt: `${systemPrompt}\n\nUser command: ${request.command}`,
					config: {
						configKey: "planner",
						timeout: 60000, // 60s for complex schedules
						jsonMode: true,
					},
					abortSignal: controller.signal,
					contextInfo,
				});

			// Check if cancelled
			if (controller.signal.aborted) {
				devLog("🗓️ Request was cancelled");
				return {
					success: false,
					message: "Request was cancelled.",
				};
			}

			if (!aiResponse) {
				devLog("🗓️ AI response was null (timeout or error)");
				toast({
					title: "Request Timed Out",
					description: "The AI took too long to respond. Please try again.",
					variant: "destructive",
				});
				return {
					success: false,
					message: "Failed to process planner command. Please try again.",
				};
			}

			devLog("🗓️ AI response received:", aiResponse);

			if (aiResponse.error || aiResponse.function === "error") {
				const errorMsg =
					aiResponse.message || "Could not understand your request";
				toast({
					title: "Planner Error",
					description: errorMsg,
					variant: "destructive",
				});
				return {
					success: false,
					message: errorMsg,
				};
			}

			if (!aiResponse.blocks || aiResponse.blocks.length === 0) {
				toast({
					title: "No Events Created",
					description: "No events could be created from your request.",
					variant: "destructive",
				});
				return {
					success: false,
					message: "No events could be created from your request.",
				};
			}

			// Process blocks: split any multi-day blocks at midnight boundaries
			const processedBlocks = processAIBlocks(aiResponse.blocks);
			devLog(
				"🗓️ Processed blocks (after splitting multi-day):",
				processedBlocks.length,
			);

			// Add blocks to store with isNew flag for animation
			const blocksToAdd: TimeBlock[] = processedBlocks.map((block) => ({
				id: generateId("block"),
				title: block.title,
				start: block.start,
				end: block.end,
				color: block.color || EVENT_COLORS.default,
				description: block.description,
				isExported: false,
				isNew: true,
			}));

			devLog("🗓️ Adding blocks to store:", blocksToAdd.length);
			plannerStore.addBlocks(blocksToAdd);

			// Clear isNew flag after animation
			setTimeout(() => {
				blocksToAdd.forEach((block) => {
					plannerStore.updateBlock(block.id, { isNew: false });
				});
			}, 600);

			toast({
				title: "Schedule Updated",
				description:
					aiResponse.message ||
					`Added ${blocksToAdd.length} event${blocksToAdd.length > 1 ? "s" : ""} to your planner`,
				action: {
					label: "View Planner",
					onClick: () => {
						window.location.href = "/planner";
					},
				},
			});

			return {
				success: true,
				message: aiResponse.message,
				blocksCreated: blocksToAdd.length,
			};
		} catch (error) {
			devLog("🗓️ Unexpected error in processCommand:", error);
			console.error("Planner command error:", error);
			toast({
				title: "Planner Error",
				description: "An unexpected error occurred. Please try again.",
				variant: "destructive",
			});
			return {
				success: false,
				message: "An unexpected error occurred.",
			};
		} finally {
			devLog("🗓️ Cleaning up task");
			this.concurrencyStore.endTask("background", taskKey);
			plannerStore.setGenerating(false);
		}
	}

	/**
	 * Process command in background (fire-and-forget)
	 */
	processCommandInBackground(request: PlannerCommandRequest): void {
		this.processCommand(request).catch((error) => {
			console.error("Background planner command error:", error);
			toast({
				title: "Planner Error",
				description: "Failed to process schedule request",
				variant: "destructive",
			});
		});
	}

	/**
	 * Cancel any active planner tasks
	 */
	cancelActiveTasks(): void {
		const activeIds = this.concurrencyStore.getActiveIds("background");
		const plannerTasks = activeIds.filter((id) => id.startsWith("planner_"));

		if (plannerTasks.length > 0) {
			plannerTasks.forEach((id) => {
				this.concurrencyStore.cancelTask("background", id);
			});

			usePlannerStore.getState().setGenerating(false);

			toast({
				title: "Cancelled",
				description: "Schedule generation was cancelled.",
			});
		}
	}

	/**
	 * Check if any planner task is currently running
	 */
	isProcessing(): boolean {
		const activeIds = this.concurrencyStore.getActiveIds("background");
		return activeIds.some((id) => id.startsWith("planner_"));
	}
}

export const plannerCommandService = new PlannerCommandService();
