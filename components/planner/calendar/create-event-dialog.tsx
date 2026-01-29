"use client";

/**
 * Create Event Dialog
 * Dialog for creating new time blocks with react-hook-form + zod validation
 */

import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ControlledInput, ControlledColorPicker } from "@/components/ui/form";
import { EVENT_COLORS } from "@/lib/types/planner";
import { createEventSchema, CreateEventSchema } from "@/lib/schemas/planner";

// Color options for events
const COLOR_OPTIONS = [
	{ name: "Blue", value: EVENT_COLORS.work },
	{ name: "Purple", value: EVENT_COLORS.meeting },
	{ name: "Green", value: EVENT_COLORS.personal },
	{ name: "Amber", value: EVENT_COLORS.exercise },
	{ name: "Gray", value: EVENT_COLORS.break },
];

interface CreateEventDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	startTime: Date | null;
	endTime: Date | null;
	onConfirm: (title: string, color: string) => void;
}

export function CreateEventDialog({
	open,
	onOpenChange,
	startTime,
	endTime,
	onConfirm,
}: CreateEventDialogProps) {
	const form = useForm<CreateEventSchema>({
		resolver: zodResolver(createEventSchema),
		defaultValues: {
			title: "",
			color: EVENT_COLORS.work,
			startTime: startTime ?? new Date(),
			endTime: endTime ?? new Date(),
		},
	});

	// Update form when times change
	useEffect(() => {
		if (open && startTime && endTime) {
			form.reset({
				title: "",
				color: EVENT_COLORS.work,
				startTime,
				endTime,
			});
		}
	}, [open, startTime, endTime, form]);

	// Format time for display
	const formatTime = (date: Date | null) => {
		if (!date) return "";
		return date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	};

	const formatDate = (date: Date | null) => {
		if (!date) return "";
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		});
	};

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			form.reset();
		}
		onOpenChange(isOpen);
	};

	const handleSubmit = form.handleSubmit((data) => {
		onConfirm(data.title, data.color);
		form.reset();
		onOpenChange(false);
	});

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[400px] rounded-xl">
				<DialogHeader>
					<DialogTitle>Create Event</DialogTitle>
				</DialogHeader>
				<FormProvider {...form}>
					<form onSubmit={handleSubmit}>
						<div className="space-y-4 py-4">
							{/* Time display */}
							<div className="text-sm text-muted-foreground">
								{formatDate(startTime)} · {formatTime(startTime)} -{" "}
								{formatTime(endTime)}
							</div>

							{/* Title input */}
							<ControlledInput<CreateEventSchema>
								name="title"
								label="Event Title"
								placeholder="Enter event title..."
								className="rounded-xl"
								autoFocus
							/>

							{/* Color picker */}
							<ControlledColorPicker<CreateEventSchema>
								name="color"
								label="Color"
								colors={COLOR_OPTIONS}
							/>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								className="rounded-xl"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={!form.formState.isValid}
								className="rounded-xl"
							>
								Create
							</Button>
						</DialogFooter>
					</form>
				</FormProvider>
			</DialogContent>
		</Dialog>
	);
}
