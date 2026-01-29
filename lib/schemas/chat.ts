/**
 * Chat Form Schemas
 * Zod schemas for chat-related forms
 */

import { z } from "zod";

// ============================================
// Chat Input Schema
// ============================================

export const chatInputSchema = z.object({
	message: z.string().min(1, "Message is required"),
});

export type ChatInputSchema = z.infer<typeof chatInputSchema>;

export const chatInputDefaultValues: ChatInputSchema = {
	message: "",
};

// ============================================
// Planner Command Schema
// ============================================

export const plannerCommandSchema = z.object({
	command: z.string().min(1, "Command is required"),
});

export type PlannerCommandSchema = z.infer<typeof plannerCommandSchema>;

export const plannerCommandDefaultValues: PlannerCommandSchema = {
	command: "",
};

// ============================================
// Inline Edit Schema (for folder/collection rename)
// ============================================

export const inlineEditSchema = z.object({
	name: z.string().min(1, "Name cannot be empty").max(255, "Name is too long"),
});

export type InlineEditSchema = z.infer<typeof inlineEditSchema>;

export const inlineEditDefaultValues: InlineEditSchema = {
	name: "",
};
