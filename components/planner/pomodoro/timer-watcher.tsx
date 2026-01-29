"use client";

/**
 * PomodoroTimerWatcher
 *
 * Global component that watches the pomodoro timer state and triggers
 * completion events when timer reaches zero. This runs on ALL routes
 * so the completion overlay shows regardless of where the user is.
 *
 * Uses setInterval instead of requestAnimationFrame so it works
 * even when the tab is in the background.
 *
 * Partial Progress Tracking:
 * - Tracks elapsed minutes every minute during active work sessions
 * - Awards XP incrementally so users don't lose progress if they quit early
 * - Performance optimized: only updates once per minute, debounced
 *
 * Gamification Integration:
 * - When completeSession() is called, it automatically triggers gamification
 *   updates (completeSession with XP and coins) for completed work sessions
 * - When a break ends, it updates lastBreakEndTime for flow combo tracking
 * - The gamification store sets showLootModal=true and stores lastSessionReward
 *   for the loot modal to display (handled by LootModal component)
 * - Requirements: 1.1, 1.3, 2.1, 7.2, 15.2
 */

import { useEffect, useRef } from "react";
import { usePlannerStore } from "@/stores/use-planner-store";
import { pomodoroCompletionEvents } from "./completion-overlay";

// Track last partial update time to avoid excessive updates
let lastPartialTrackTime = 0;
const PARTIAL_TRACK_INTERVAL = 60000; // 1 minute in ms

export function PomodoroTimerWatcher() {
	const { pomodoro, getTimeLeft, completeSession, trackPartialProgress } =
		usePlannerStore();
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const hasCompletedRef = useRef(false);

	const isRunning = pomodoro.timerEndTime !== null;
	const isWorkSession = pomodoro.currentSession === "work";

	useEffect(() => {
		// Reset completion flag when timer starts
		if (isRunning) {
			hasCompletedRef.current = false;
		}
	}, [isRunning]);

	useEffect(() => {
		if (!isRunning) {
			return;
		}

		const checkCompletion = () => {
			const time = getTimeLeft();
			const now = Date.now();

			// Track partial progress for work sessions (every minute)
			// Performance: debounced to avoid excessive state updates
			if (
				isWorkSession &&
				now - lastPartialTrackTime >= PARTIAL_TRACK_INTERVAL
			) {
				lastPartialTrackTime = now;
				trackPartialProgress();
			}

			// Check for completion (only trigger once)
			if (time <= 0 && !hasCompletedRef.current) {
				hasCompletedRef.current = true;
				// Get session type before completing (it will switch after)
				const completedSessionType =
					usePlannerStore.getState().pomodoro.currentSession;
				completeSession();
				// Emit completion event for overlay
				pomodoroCompletionEvents.emit({ sessionType: completedSessionType });

				// Clear interval after completion
				if (intervalRef.current) {
					clearInterval(intervalRef.current);
					intervalRef.current = null;
				}
			}
		};

		// Check immediately
		checkCompletion();

		// Use setInterval instead of requestAnimationFrame
		// setInterval continues to run even when tab is in background
		intervalRef.current = setInterval(checkCompletion, 1000);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [
		isRunning,
		isWorkSession,
		getTimeLeft,
		completeSession,
		trackPartialProgress,
	]);

	// Also check when tab becomes visible again (in case interval was throttled)
	useEffect(() => {
		if (!isRunning) return;

		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				const time = getTimeLeft();

				// Track partial progress when tab becomes visible
				if (isWorkSession) {
					trackPartialProgress();
				}

				if (time <= 0 && !hasCompletedRef.current) {
					hasCompletedRef.current = true;
					const completedSessionType =
						usePlannerStore.getState().pomodoro.currentSession;
					completeSession();
					pomodoroCompletionEvents.emit({ sessionType: completedSessionType });
				}
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [
		isRunning,
		isWorkSession,
		getTimeLeft,
		completeSession,
		trackPartialProgress,
	]);

	// This component doesn't render anything
	return null;
}
