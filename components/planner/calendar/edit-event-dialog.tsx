"use client";

/**
 * Edit Event Dialog
 * Dialog for editing existing time blocks with react-hook-form + zod validation
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
import { EVENT_COLORS, CalendarEvent } from "@/lib/types/planner";
import { Trash2 } from "lucide-react";
import { editEventSchema, EditEventSchema } from "@/lib/schemas/planner";

// Color options for events
const COLOR_OPTIONS = [
	{ name: "Blue", value: EVENT_COLORS.work },
	{ name: "Purple", value: EVENT_COLORS.meeting },
	{ name: "Green", value: EVENT_COLORS.personal },
	{ name: "Amber", value: EVENT_COLORS.exercise },
	{ name: "Gray", value: EVENT_COLORS.break },
];

interface EditEventDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	event: CalendarEvent | null;
	onSave: (
		id: string,
		title: string,
		color: string,
		start: Date,
		end: Date,
	) => void;
	onDelete: (id: string) => void;
}

export function EditEventDialog({
	open,
	onOpenChange,
	event,
	onSave,
	onDelete,
}: EditEventDialogProps) {
	const form = useForm<EditEventSchema>({
		resolver: zodResolver(editEventSchema),
		defaultValues: {
			id: "",
			title: "",
			color: EVENT_COLORS.work,
			startTime: "09:00",
			endTime: "10:00",
		},
	});

	// Format date for time input
	const formatTimeForInput = (date: Date) => {
		const hours = date.getHours().toString().padStart(2, "0");
		const minutes = date.getMinutes().toString().padStart(2, "0");
		return `${hours}:${minutes}`;
	};

	// Format time for display
	const formatDate = (date: Date | undefined) => {
		if (!date) return "";
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		});
	};

	// Parse time input to Date
	const parseTimeToDate = (timeStr: string, baseDate: Date) => {
		const [hours, minutes] = timeStr.split(":").map(Number);
		const newDate = new Date(baseDate);
		newDate.setHours(hours, minutes, 0, 0);
		return newDate;
	};

	// Update form when event changes
	useEffect(() => {
		if (open && event) {
			form.reset({
				id: event.id,
				title: event.title,
				color: event.color ?? EVENT_COLORS.work,
				startTime: formatTimeForInput(event.start),
				endTime: formatTimeForInput(event.end),
			});
		}
	}, [open, event, form]);

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			form.reset();
		}
		onOpenChange(isOpen);
	};

	const handleSubmit = form.handleSubmit((data) => {
		if (!event) return;

		const newStart = parseTimeToDate(data.startTime, event.start);
		const newEnd = parseTimeToDate(data.endTime, event.start);

		// If end time is before start time, assume it's the next day
		if (newEnd <= newStart) {
			newEnd.setDate(newEnd.getDate() + 1);
		}

		onSave(data.id, data.title, data.color, newStart, newEnd);
		onOpenChange(false);
	});

	const handleDelete = () => {
		if (!event) return;
		onDelete(event.id);
		onOpenChange(false);
	};

	if (!event) return null;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[400px] rounded-2xl">
				<DialogHeader>
					<DialogTitle>Edit Event</DialogTitle>
				</DialogHeader>
				<FormProvider {...form}>
					<form onSubmit={handleSubmit}>
						<div className="space-y-4 py-4">
							{/* Date display */}
							<div className="text-sm text-muted-foreground">
								{formatDate(event.start)}
							</div>

							{/* Title input */}
							<ControlledInput<EditEventSchema>
								name="title"
								label="Event Title"
								placeholder="Enter event title..."
								className="rounded-xl"
								autoFocus
							/>

							{/* Time inputs */}
							<div className="grid grid-cols-2 gap-4">
								<ControlledInput<EditEventSchema>
									name="startTime"
									label="Start Time"
									type="time"
									className="rounded-xl"
								/>
								<ControlledInput<EditEventSchema>
									name="endTime"
									label="End Time"
									type="time"
									className="rounded-xl"
								/>
							</div>

							{/* Color picker */}
							<ControlledColorPicker<EditEventSchema>
								name="color"
								label="Color"
								colors={COLOR_OPTIONS}
							/>
						</div>

						<DialogFooter className="flex justify-between sm:justify-between">
							<Button
								type="button"
								variant="destructive"
								size="sm"
								onClick={handleDelete}
								className="gap-1 rounded-xl"
							>
								<Trash2 className="h-4 w-4" />
								Delete
							</Button>
							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => onOpenChange(false)}
									className="rounded-xl"
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={!form.formState.isValid}
									className="rounded-xl"
								>
									Save
								</Button>
							</div>
						</DialogFooter>
					</form>
				</FormProvider>
			</DialogContent>
		</Dialog>
	);
}
