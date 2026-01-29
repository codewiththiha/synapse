/**
 * Command Router
 * Centralized routing for @command messages
 *
 * Determines which service should handle a given command message.
 * Future-proofed for additional command types.
 */

import { cardCommandService } from "./card-command";
import { plannerCommandService } from "./planner-command";

export type CommandType = "CARD" | "PLANNER" | "CHAT";

/**
 * Route a message to the appropriate command service
 * @param message - The user's message
 * @returns The command type that should handle this message
 */
export function routeCommand(message: string): CommandType {
	// Check for @card command first (before @cards to avoid conflict)
	if (cardCommandService.isCardCommand(message)) {
		return "CARD";
	}

	// Check for @planner/@schedule/@plan commands
	if (plannerCommandService.isPlannerCommand(message)) {
		return "PLANNER";
	}

	// Default to chat
	return "CHAT";
}

/**
 * Check if a message is any type of command
 */
export function isCommand(message: string): boolean {
	return routeCommand(message) !== "CHAT";
}

/**
 * Get the command prefix from a message
 * @returns The command prefix (e.g., "@card", "@planner") or null
 */
export function getCommandPrefix(message: string): string | null {
	const trimmed = message.trim().toLowerCase();

	// Check known prefixes
	const prefixes = ["@card", "@planner", "@schedule", "@plan"];
	for (const prefix of prefixes) {
		if (trimmed.startsWith(prefix)) {
			return prefix;
		}
	}

	return null;
}

/**
 * Extract the content after the command prefix
 * @returns The content after the command, or the full message if no command
 */
export function extractCommandContent(message: string): string {
	const prefix = getCommandPrefix(message);
	if (!prefix) return message;

	return message.trim().slice(prefix.length).trim();
}
