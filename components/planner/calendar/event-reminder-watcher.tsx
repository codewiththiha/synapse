"use client";

/**
 * Event Reminder Watcher
 * Monitors upcoming events and triggers notifications
 * based on user's reminder settings
 */

import { useEffect, useRef, useCallback } from "react";
import { usePlannerStore } from "@/stores/use-planner-store";
import { useSettingsStore } from "@/stores/use-settings-store";
import { notificationService } from "@/lib/services/notification-service";
import { toast } from "@/stores/use-global-store";

// Track which events have been notified to avoid duplicates
const notifiedEvents = new Set<string>();

export function EventReminderWatcher() {
	const blocks = usePlannerStore((state) => state.blocks);
	const eventReminderMinutes = useSettingsStore(
		(state) => state.settings.eventReminderMinutes ?? 10,
	);
	const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

	const checkUpcomingEvents = useCallback(() => {
		// Skip if reminders are disabled
		if (eventReminderMinutes === 0) return;

		const now = Date.now();
		const reminderMs = eventReminderMinutes * 60 * 1000;

		for (const block of blocks) {
			const eventStart = new Date(block.start).getTime();
			const timeUntilEvent = eventStart - now;

			// Check if event is within reminder window and hasn't been notified
			// Also ensure event hasn't already started
			if (
				timeUntilEvent > 0 &&
				timeUntilEvent <= reminderMs &&
				!notifiedEvents.has(block.id)
			) {
				// Mark as notified
				notifiedEvents.add(block.id);

				// Calculate minutes until event
				const minutesUntil = Math.ceil(timeUntilEvent / 60000);

				// Show toast notification in app
				toast({
					title: "Upcoming Event",
					description: `"${block.title}" starts in ${minutesUntil} minute${minutesUntil !== 1 ? "s" : ""}`,
				});

				// Show system notification (if tab not focused and permission granted)
				notificationService.notify({
					title: "Upcoming Event",
					body: `"${block.title}" starts in ${minutesUntil} minute${minutesUntil !== 1 ? "s" : ""}`,
					tag: `event-reminder-${block.id}`,
					sound: "chime",
				});
			}
		}

		// Clean up old notified events (events that have passed)
		for (const eventId of notifiedEvents) {
			const block = blocks.find((b) => b.id === eventId);
			if (block) {
				const eventStart = new Date(block.start).getTime();
				// Remove from notified set if event has passed by more than 1 hour
				if (now - eventStart > 60 * 60 * 1000) {
					notifiedEvents.delete(eventId);
				}
			} else {
				// Block was deleted, remove from set
				notifiedEvents.delete(eventId);
			}
		}
	}, [blocks, eventReminderMinutes]);

	useEffect(() => {
		// Request notification permission on mount
		notificationService.requestPermission();

		// Check immediately
		checkUpcomingEvents();

		// Then check every 30 seconds
		checkIntervalRef.current = setInterval(checkUpcomingEvents, 30000);

		return () => {
			if (checkIntervalRef.current) {
				clearInterval(checkIntervalRef.current);
			}
		};
	}, [checkUpcomingEvents]);

	// This component doesn't render anything
	return null;
}
