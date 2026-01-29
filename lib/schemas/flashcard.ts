/**
 * Flashcard Form Schemas
 * Zod schemas for flashcard-related forms and AI response validation
 */

import { z } from "zod";
import {
	nameSchema,
	longTextSchema,
	cardCountSchema,
	createFileListSchema,
} from "./common";

// ============================================
// AI Response Validation Schemas
// ============================================

/** Schema for individual flashcards returned by AI */
export const aiCardSchema = z.object({
	q: z.string().min(1, "Question cannot be empty"),
	a: z.string().min(1, "Answer cannot be empty"),
});

export type AICard = z.infer<typeof aiCardSchema>;

/** Schema for the list of questions planned in Step 1 */
export const aiQuestionPlanSchema = z.array(z.string().min(1));

export type AIQuestionPlan = z.infer<typeof aiQuestionPlanSchema>;

/** Schema for collection organization results (Phase 1) */
export const aiCollectionPlanSchema = z.object({
	collections: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			isNew: z.boolean(),
		}),
	),
});

export type AICollectionPlan = z.infer<typeof aiCollectionPlanSchema>;

/** Schema for cover-to-collection assignments (Phase 2) */
export const aiAssignmentSchema = z.object({
	assignments: z.array(
		z.object({
			coverId: z.string(),
			collectionId: z.string(),
		}),
	),
});

export type AIAssignment = z.infer<typeof aiAssignmentSchema>;

// ============================================
// Card Generation Configuration Schema
// ============================================

export const cardGenerationConfigSchema = z.object({
	extractedText: longTextSchema,
	cardCount: cardCountSchema,
});

export type CardGenerationConfigSchema = z.infer<
	typeof cardGenerationConfigSchema
>;

export const cardGenerationConfigDefaultValues: CardGenerationConfigSchema = {
	extractedText: "",
	cardCount: 10,
};

// ============================================
// Text Input Schema (for card generation)
// ============================================

export const textInputSchema = z.object({
	text: z.string().min(1, "Please enter some text or upload a file"),
});

export type TextInputSchema = z.infer<typeof textInputSchema>;

export const textInputDefaultValues: TextInputSchema = {
	text: "",
};

// ============================================
// Image Upload Schema
// ============================================

export const MAX_IMAGES = 5;

export const imageUploadSchema = z.object({
	images: createFileListSchema(MAX_IMAGES).min(
		1,
		"Please upload at least one image",
	),
});

export type ImageUploadSchema = z.infer<typeof imageUploadSchema>;

export const imageUploadDefaultValues: ImageUploadSchema = {
	images: [],
};

// ============================================
// Card Cover Schema
// ============================================

export const cardCoverSchema = z.intersection(
	z.object({
		name: nameSchema,
	}),
	z.discriminatedUnion("action", [
		z.object({ action: z.literal("create") }),
		z.object({ action: z.literal("update"), id: z.string().min(1) }),
	]),
);

export type CardCoverSchema = z.infer<typeof cardCoverSchema>;

export const cardCoverDefaultValues: CardCoverSchema = {
	action: "create",
	name: "",
};

// ============================================
// Collection Stack Schema (create from two covers)
// ============================================

export const collectionStackSchema = z.object({
	name: nameSchema,
	sourceId: z.string().min(1, "Source cover is required"),
	targetId: z.string().min(1, "Target cover is required"),
});

export type CollectionStackSchema = z.infer<typeof collectionStackSchema>;

export const collectionStackDefaultValues: CollectionStackSchema = {
	name: "",
	sourceId: "",
	targetId: "",
};
