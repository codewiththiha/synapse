/**
 * Common Zod Schemas
 * Reusable validation schemas for common form patterns
 */

import { z } from "zod";

// ============================================
// File Validation Schemas
// ============================================

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

export const ACCEPTED_IMAGE_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
	"image/gif",
];

export const ACCEPTED_TEXT_TYPES = ["text/plain", "application/pdf"];

/** Single image file validation */
export const imageFileSchema = z
	.instanceof(File)
	.refine((file) => file.size <= MAX_IMAGE_SIZE, {
		message: "File size must be less than 10MB",
	})
	.refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), {
		message: "Only .jpg, .jpeg, .png, .webp and .gif files are accepted",
	});

/** Create a schema for a list of image files with max count */
export const createFileListSchema = (maxFiles: number) =>
	z.array(imageFileSchema).max(maxFiles, {
		message: `You can only upload up to ${maxFiles} image(s)`,
	});

/** Text file validation */
export const textFileSchema = z
	.instanceof(File)
	.refine((file) => file.size <= MAX_FILE_SIZE, {
		message: "File size must be less than 5MB",
	})
	.refine((file) => ACCEPTED_TEXT_TYPES.includes(file.type), {
		message: "Only .pdf and .txt files are accepted",
	});

// ============================================
// String Validation Schemas
// ============================================

/** Non-empty trimmed string */
export const requiredStringSchema = z
	.string()
	.min(1, "This field is required")
	.transform((val) => val.trim());

/** Optional trimmed string */
export const optionalStringSchema = z
	.string()
	.optional()
	.transform((val) => val?.trim());

/** Name field (1-255 chars) */
export const nameSchema = z
	.string()
	.min(1, "Name is required")
	.max(255, "Name must be less than 255 characters")
	.transform((val) => val.trim());

/** Title field (1-500 chars) */
export const titleSchema = z
	.string()
	.min(1, "Title is required")
	.max(500, "Title must be less than 500 characters")
	.transform((val) => val.trim());

/** Long text field (1-10000 chars) */
export const longTextSchema = z
	.string()
	.min(1, "Content is required")
	.max(10000, "Content must be less than 10,000 characters")
	.transform((val) => val.trim());

// ============================================
// Number Validation Schemas
// ============================================

/** Positive integer */
export const positiveIntSchema = z
	.number()
	.int("Must be a whole number")
	.positive("Must be greater than 0");

/** Card count (1-30) */
export const cardCountSchema = z
	.number()
	.int()
	.min(1, "Must generate at least 1 card")
	.max(30, "Maximum 30 cards per generation");

// ============================================
// Date Validation Schemas
// ============================================

/** Valid date */
export const dateSchema = z.date({
	message: "Date is required",
});

/** Time string (HH:MM format) */
export const timeStringSchema = z
	.string()
	.regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format");

// ============================================
// Color Validation
// ============================================

/** Hex color */
export const hexColorSchema = z
	.string()
	.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format");

// ============================================
// Action Discriminated Unions
// ============================================

/** Base action schema for create/update patterns */
export const createActionSchema = z.object({ action: z.literal("create") });
export const updateActionSchema = z.object({
	action: z.literal("update"),
	id: z.string().min(1),
});

/** Create discriminated union for CRUD operations */
export function createCrudSchema<T extends z.ZodRawShape>(
	dataSchema: z.ZodObject<T>,
) {
	return z.intersection(
		dataSchema,
		z.discriminatedUnion("action", [createActionSchema, updateActionSchema]),
	);
}
