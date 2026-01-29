"use client";

/**
 * Planner Calendar
 * Main calendar component using react-big-calendar
 */

import { useMemo, useCallback, useState } from "react";
import {
	Calendar,
	Views,
	SlotInfo,
	View,
	EventProps,
} from "react-big-calendar";
import { calendarLocalizer } from "./calendar-localizer";
import { CalendarToolbar } from "./calendar-toolbar";
import { CreateEventDialog } from "./create-event-dialog";
import { EditEventDialog } from "./edit-event-dialog";
import { usePlannerStore } from "@/stores/use-planner-store";
import { CalendarEvent, TimeBlock } from "@/lib/types/planner";
import { cn } from "@/lib/utils";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Map store view to react-big-calendar View
const VIEW_MAP: Record<"day" | "week" | "month", View> = {
	day: Views.DAY,
	week: Views.WEEK,
	month: Views.MONTH,
};

// Custom event styling
const eventStyleGetter = (event: CalendarEvent) => ({
	style: {
		backgroundColor: event.color || "#3b82f6",
		borderRadius: "6px",
		border: "none",
		color: "#fff",
		fontSize: "12px",
		padding: "2px 6px",
	},
	className: event.isNew ? "calendar-event-new" : "",
});

// Custom event component with animation support
function CustomEvent({ event, title }: EventProps<CalendarEvent>) {
	return (
		<div className={cn("h-full w-full", event.isNew && "animate-event-appear")}>
			{title}
		</div>
	);
}

export function PlannerCalendar() {
	const {
		blocks,
		getSelectedDate,
		setSelectedDate,
		deleteBlock,
		addBlock,
		updateBlock,
		calendarView,
		setCalendarView,
	} = usePlannerStore();

	const selectedDate = getSelectedDate();

	// Dialog state for creating new events
	const [dialogOpen, setDialogOpen] = useState(false);
	const [pendingSlot, setPendingSlot] = useState<{
		start: Date;
		end: Date;
	} | null>(null);

	// Dialog state for editing events
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
		null,
	);

	// Transform blocks to calendar events
	const events: CalendarEvent[] = useMemo(
		() =>
			blocks.map((block) => ({
				id: block.id,
				title: block.title,
				start: new Date(block.start),
				end: new Date(block.end),
				color: block.color,
				description: block.description,
				isNew: block.isNew,
			})),
		[blocks],
	);

	// Check if a time slot overlaps with any existing event
	const isSlotOverlapping = useCallback(
		(start: Date, end: Date) => {
			return events.some((event) => {
				// Check if the slot overlaps with this event
				return start < event.end && end > event.start;
			});
		},
		[events],
	);

	// Called during drag selection - return false to hide selection visual
	const handleSelecting = useCallback(
		(range: { start: Date; end: Date }) => {
			// Return false to hide selection when overlapping with events
			return !isSlotOverlapping(range.start, range.end);
		},
		[isSlotOverlapping],
	);

	// Handle slot selection (for manual event creation via drag only)
	const handleSelectSlot = useCallback(
		(slotInfo: SlotInfo) => {
			// Only allow drag selection, not single click
			if (slotInfo.action === "click") {
				return;
			}

			// Only allow selection on empty slots (no overlap with existing events)
			if (isSlotOverlapping(slotInfo.start, slotInfo.end)) {
				return;
			}

			setPendingSlot({
				start: slotInfo.start,
				end: slotInfo.end,
			});
			setDialogOpen(true);
		},
		[isSlotOverlapping],
	);

	// Handle event creation from dialog
	const handleCreateEvent = useCallback(
		(title: string, color: string) => {
			if (!pendingSlot) return;

			const newBlock: TimeBlock = {
				id: crypto.randomUUID(),
				title,
				start: pendingSlot.start.toISOString(),
				end: pendingSlot.end.toISOString(),
				color,
			};

			addBlock(newBlock);
			setPendingSlot(null);
		},
		[pendingSlot, addBlock],
	);

	// Handle event selection - open edit dialog
	const handleSelectEvent = useCallback((event: CalendarEvent) => {
		setSelectedEvent(event);
		setEditDialogOpen(true);
	}, []);

	// Handle event update from edit dialog
	const handleUpdateEvent = useCallback(
		(id: string, title: string, color: string, start: Date, end: Date) => {
			updateBlock(id, {
				title,
				color,
				start: start.toISOString(),
				end: end.toISOString(),
			});
		},
		[updateBlock],
	);

	// Handle event deletion from edit dialog
	const handleDeleteEvent = useCallback(
		(id: string) => {
			deleteBlock(id);
		},
		[deleteBlock],
	);

	// Handle view change
	const handleViewChange = useCallback(
		(view: View) => {
			const viewKey = Object.entries(VIEW_MAP).find(
				([, v]) => v === view,
			)?.[0] as "day" | "week" | "month";
			if (viewKey) {
				setCalendarView(viewKey);
			}
		},
		[setCalendarView],
	);

	return (
		<div className="h-full rounded-lg border bg-card overflow-hidden planner-calendar">
			<Calendar
				localizer={calendarLocalizer}
				events={events}
				startAccessor="start"
				endAccessor="end"
				date={selectedDate}
				onNavigate={setSelectedDate}
				view={VIEW_MAP[calendarView]}
				onView={handleViewChange}
				views={[Views.DAY, Views.WEEK, Views.MONTH]}
				selectable
				onSelecting={handleSelecting}
				onSelectSlot={handleSelectSlot}
				onSelectEvent={handleSelectEvent}
				eventPropGetter={eventStyleGetter}
				step={30}
				className="h-full"
				timeslots={2}
				selected={undefined}
				components={{
					toolbar: CalendarToolbar,
					event: CustomEvent,
				}}
			/>

			<CreateEventDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				startTime={pendingSlot?.start ?? null}
				endTime={pendingSlot?.end ?? null}
				onConfirm={handleCreateEvent}
			/>

			<EditEventDialog
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
				event={selectedEvent}
				onSave={handleUpdateEvent}
				onDelete={handleDeleteEvent}
			/>
		</div>
	);
}
