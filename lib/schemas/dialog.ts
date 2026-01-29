/**
 * Dialog Form Schemas
 * Zod schemas for dialog-based forms
 */

import { z } from "zod";
import { nameSchema } from "./common";

// ============================================
// Rename Dialog Schema
// ============================================

export const renameSchema = z.object({
	name: nameSchema,
});

export type RenameSchema = z.infer<typeof renameSchema>;

export const renameDefaultValues: RenameSchema = {
	name: "",
};

// ============================================
// Input Dialog Schema (Create new item)
// ============================================

export const inputDialogSchema = z.object({
	value: nameSchema,
});

export type InputDialogSchema = z.infer<typeof inputDialogSchema>;

export const inputDialogDefaultValues: InputDialogSchema = {
	value: "",
};

// ============================================
// Collection Schema (with CRUD action)
// ============================================

export const collectionSchema = z.intersection(
	z.object({
		name: nameSchema,
	}),
	z.discriminatedUnion("action", [
		z.object({ action: z.literal("create") }),
		z.object({ action: z.literal("update"), id: z.string().min(1) }),
	]),
);

export type CollectionSchema = z.infer<typeof collectionSchema>;

export const collectionDefaultValues: CollectionSchema = {
	action: "create",
	name: "",
};

// ============================================
// Folder Schema (for chat/session folders)
// ============================================

export const folderSchema = z.intersection(
	z.object({
		name: nameSchema,
	}),
	z.discriminatedUnion("action", [
		z.object({ action: z.literal("create") }),
		z.object({ action: z.literal("update"), id: z.string().min(1) }),
	]),
);

export type FolderSchema = z.infer<typeof folderSchema>;

export const folderDefaultValues: FolderSchema = {
	action: "create",
	name: "",
};
