/**
 * Planner Form Schemas
 * Zod schemas for planner/calendar forms
 */

import { z } from "zod";
import { titleSchema, timeStringSchema } from "./common";
import { EVENT_COLORS } from "@/lib/types/planner";

// ============================================
// Create Event Schema
// ============================================

export const createEventSchema = z
	.object({
		title: titleSchema,
		color: z.string().min(1),
		startTime: z.date({
			message: "Start time is required",
		}),
		endTime: z.date({
			message: "End time is required",
		}),
	})
	.refine((data) => data.endTime > data.startTime, {
		message: "End time must be after start time",
		path: ["endTime"],
	});

export type CreateEventSchema = z.infer<typeof createEventSchema>;

export const createEventDefaultValues: CreateEventSchema = {
	title: "",
	color: EVENT_COLORS.work,
	startTime: new Date(),
	endTime: new Date(),
};

// ============================================
// Edit Event Schema
// ============================================

export const editEventSchema = z.object({
	id: z.string().min(1),
	title: titleSchema,
	color: z.string().min(1),
	startTime: timeStringSchema,
	endTime: timeStringSchema,
});

export type EditEventSchema = z.infer<typeof editEventSchema>;

export const editEventDefaultValues: EditEventSchema = {
	id: "",
	title: "",
	color: EVENT_COLORS.work,
	startTime: "09:00",
	endTime: "10:00",
};
