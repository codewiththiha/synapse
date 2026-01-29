"use client";

/**
 * Google Calendar Export Dialog
 * Allows users to select events grouped by date for export
 * - Events grouped by day (collapsible)
 * - Select by group or individual events
 * - Excludes past events (events that have already ended)
 * - Includes currently ongoing events
 */

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
	Calendar,
	ChevronRight,
	CheckSquare,
	Square,
	Loader2,
	ExternalLink,
	Clock,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TimeBlock } from "@/lib/types/planner";
import { googleCalendarService } from "@/lib/services/google-calendar";
import { toast } from "@/stores/use-global-store";
import { usePlannerStore } from "@/stores/use-planner-store";

interface ExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface DayGroup {
	date: string; // YYYY-MM-DD
	label: string; // "Today", "Tomorrow", "Jan 8", etc.
	events: TimeBlock[];
}

/**
 * Format time from ISO string to HH:MM
 */
function formatTime(isoString: string): string {
	const date = new Date(isoString);
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Get date label (Today, Tomorrow, or formatted date)
 */
function getDateLabel(dateStr: string): string {
	const date = new Date(dateStr);
	const today = new Date();
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	const isToday = date.toDateString() === today.toDateString();
	const isTomorrow = date.toDateString() === tomorrow.toDateString();

	if (isToday) return "Today";
	if (isTomorrow) return "Tomorrow";

	return date.toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}

/**
 * Group events by date, excluding past events
 */
function groupEventsByDate(blocks: TimeBlock[]): DayGroup[] {
	const now = Date.now();
	const groups: Record<string, TimeBlock[]> = {};

	for (const block of blocks) {
		const endTime = new Date(block.end).getTime();

		// Skip events that have already ended
		if (endTime < now) continue;

		// Skip already exported events
		if (block.isExported) continue;

		// Get date key (YYYY-MM-DD)
		const startDate = new Date(block.start);
		const dateKey = startDate.toISOString().split("T")[0];

		if (!groups[dateKey]) {
			groups[dateKey] = [];
		}
		groups[dateKey].push(block);
	}

	// Convert to array and sort by date
	const result: DayGroup[] = Object.entries(groups)
		.map(([date, events]) => ({
			date,
			label: getDateLabel(date),
			events: events.sort(
				(a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
			),
		}))
		.sort((a, b) => a.date.localeCompare(b.date));

	return result;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
	const { blocks, markBlocksAsExported } = usePlannerStore();
	const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
	const [expandedDates, setExpandedDates] = React.useState<Set<string>>(
		new Set(),
	);
	const [isExporting, setIsExporting] = React.useState(false);

	// Group events by date
	const dayGroups = React.useMemo(() => groupEventsByDate(blocks), [blocks]);

	// Get all exportable event IDs
	const allEventIds = React.useMemo(
		() => new Set(dayGroups.flatMap((g) => g.events.map((e) => e.id))),
		[dayGroups],
	);

	// Reset selection when dialog opens
	React.useEffect(() => {
		if (open) {
			setSelectedIds(new Set());
			// Expand today's group by default
			const today = new Date().toISOString().split("T")[0];
			setExpandedDates(new Set([today]));
		}
	}, [open]);

	const toggleExpand = (date: string) => {
		setExpandedDates((prev) => {
			const next = new Set(prev);
			if (next.has(date)) {
				next.delete(date);
			} else {
				next.add(date);
			}
			return next;
		});
	};

	const toggleSelectEvent = (eventId: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(eventId)) {
				next.delete(eventId);
			} else {
				next.add(eventId);
			}
			return next;
		});
	};

	const toggleSelectGroup = (group: DayGroup) => {
		const groupEventIds = group.events.map((e) => e.id);
		const allSelected = groupEventIds.every((id) => selectedIds.has(id));

		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (allSelected) {
				// Deselect all in group
				groupEventIds.forEach((id) => next.delete(id));
			} else {
				// Select all in group
				groupEventIds.forEach((id) => next.add(id));
			}
			return next;
		});
	};

	const selectAll = () => {
		setSelectedIds(new Set(allEventIds));
	};

	const deselectAll = () => {
		setSelectedIds(new Set());
	};

	const handleExport = async () => {
		if (selectedIds.size === 0) return;

		setIsExporting(true);
		try {
			const eventsToExport = blocks.filter((b) => selectedIds.has(b.id));
			const count = await googleCalendarService.exportBlocks(eventsToExport);

			if (count > 0) {
				markBlocksAsExported(Array.from(selectedIds));
				toast({
					description: `Exported ${count} event${count > 1 ? "s" : ""} to Google Calendar`,
				});
				onOpenChange(false);
			} else {
				toast({
					description: "No events were exported",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Export error:", error);
			toast({
				description: "Failed to export events",
				variant: "destructive",
			});
		} finally {
			setIsExporting(false);
		}
	};

	const isGroupSelected = (group: DayGroup) => {
		return group.events.every((e) => selectedIds.has(e.id));
	};

	const isGroupPartiallySelected = (group: DayGroup) => {
		const selectedCount = group.events.filter((e) =>
			selectedIds.has(e.id),
		).length;
		return selectedCount > 0 && selectedCount < group.events.length;
	};

	return (
		<DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
			<DialogPrimitive.Portal>
				{/* Custom overlay with higher z-index */}
				<DialogPrimitive.Overlay className="fixed inset-0 z-70 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				{/* Custom content with higher z-index */}
				<DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-70 w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg max-h-[80vh] flex flex-col">
					{/* Header */}
					<div className="flex flex-col space-y-1.5 text-center sm:text-left">
						<DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
							<Calendar size={20} />
							Export to Google Calendar
						</DialogPrimitive.Title>
						<DialogPrimitive.Description className="text-sm text-muted-foreground">
							Select events to export. Past events are automatically excluded.
						</DialogPrimitive.Description>
					</div>

					{/* Close button */}
					<DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
						<X className="h-4 w-4" />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>

					{dayGroups.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground">
							<Calendar size={40} className="mx-auto mb-3 opacity-50" />
							<p>No events to export</p>
							<p className="text-sm mt-1">
								All events are either past or already exported
							</p>
						</div>
					) : (
						<>
							{/* Selection controls */}
							<div className="flex items-center justify-between py-2 border-b">
								<span className="text-sm text-muted-foreground">
									{selectedIds.size} of {allEventIds.size} selected
								</span>
								<div className="flex gap-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={
											selectedIds.size === allEventIds.size
												? deselectAll
												: selectAll
										}
									>
										{selectedIds.size === allEventIds.size
											? "Deselect All"
											: "Select All"}
									</Button>
								</div>
							</div>

							{/* Event list grouped by date */}
							<div className="flex-1 overflow-y-auto space-y-1 py-2 min-h-[200px] max-h-[400px]">
								{dayGroups.map((group) => {
									const isExpanded = expandedDates.has(group.date);
									const isSelected = isGroupSelected(group);
									const isPartial = isGroupPartiallySelected(group);

									return (
										<div
											key={group.date}
											className="rounded-lg overflow-hidden"
										>
											{/* Group header */}
											<div
												className={cn(
													"flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
													"hover:bg-muted/50",
													isSelected && "bg-primary/5",
												)}
											>
												{/* Checkbox */}
												<button
													onClick={(e) => {
														e.stopPropagation();
														toggleSelectGroup(group);
													}}
													className="shrink-0"
												>
													{isSelected ? (
														<CheckSquare size={18} className="text-primary" />
													) : isPartial ? (
														<div className="w-[18px] h-[18px] border-2 border-primary rounded flex items-center justify-center">
															<div className="w-2 h-2 bg-primary rounded-sm" />
														</div>
													) : (
														<Square
															size={18}
															className="text-muted-foreground"
														/>
													)}
												</button>

												{/* Expand toggle */}
												<button
													onClick={() => toggleExpand(group.date)}
													className="flex items-center gap-2 flex-1 min-w-0"
												>
													<motion.div
														animate={{ rotate: isExpanded ? 90 : 0 }}
														transition={{ duration: 0.15 }}
													>
														<ChevronRight
															size={16}
															className="text-muted-foreground"
														/>
													</motion.div>
													<Calendar
														size={16}
														className="text-muted-foreground shrink-0"
													/>
													<span className="font-medium text-sm">
														{group.label}
													</span>
													<span className="text-xs text-muted-foreground ml-auto">
														{group.events.length} event
														{group.events.length !== 1 ? "s" : ""}
													</span>
												</button>
											</div>

											{/* Group events */}
											<AnimatePresence>
												{isExpanded && (
													<motion.div
														initial={{ height: 0, opacity: 0 }}
														animate={{ height: "auto", opacity: 1 }}
														exit={{ height: 0, opacity: 0 }}
														transition={{ duration: 0.15 }}
														className="overflow-hidden"
													>
														<div className="pl-8 space-y-0.5 pb-1">
															{group.events.map((event) => {
																const isEventSelected = selectedIds.has(
																	event.id,
																);
																const now = Date.now();
																const startTime = new Date(
																	event.start,
																).getTime();
																const endTime = new Date(event.end).getTime();
																const isOngoing =
																	now >= startTime && now < endTime;

																return (
																	<div
																		key={event.id}
																		onClick={() => toggleSelectEvent(event.id)}
																		className={cn(
																			"flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
																			"hover:bg-muted/50",
																			isEventSelected && "bg-primary/10",
																		)}
																	>
																		{isEventSelected ? (
																			<CheckSquare
																				size={16}
																				className="text-primary shrink-0"
																			/>
																		) : (
																			<Square
																				size={16}
																				className="text-muted-foreground shrink-0"
																			/>
																		)}
																		<div
																			className="w-2 h-2 rounded-full shrink-0"
																			style={{
																				backgroundColor:
																					event.color || "#3b82f6",
																			}}
																		/>
																		<div className="flex-1 min-w-0">
																			<p className="text-sm truncate">
																				{event.title}
																			</p>
																			<div className="flex items-center gap-1 text-xs text-muted-foreground">
																				<Clock size={10} />
																				<span>
																					{formatTime(event.start)} -{" "}
																					{formatTime(event.end)}
																				</span>
																				{isOngoing && (
																					<span className="ml-1 px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 text-[10px] font-medium">
																						Ongoing
																					</span>
																				)}
																			</div>
																		</div>
																	</div>
																);
															})}
														</div>
													</motion.div>
												)}
											</AnimatePresence>
										</div>
									);
								})}
							</div>
						</>
					)}

					{/* Footer */}
					<div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t pt-4">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleExport}
							disabled={selectedIds.size === 0 || isExporting}
						>
							{isExporting ? (
								<Loader2 size={16} className="mr-2 animate-spin" />
							) : (
								<ExternalLink size={16} className="mr-2" />
							)}
							Export {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
						</Button>
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
