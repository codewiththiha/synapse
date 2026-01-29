"use client";

/**
 * usePomodoroTimer - Optimized pomodoro timer hook
 *
 * Uses refs and requestAnimationFrame to update the display
 * without causing React rerenders every second.
 * Timer state is persisted in zustand store to survive page refreshes.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { usePlannerStore } from "@/stores/use-planner-store";

interface UsePomodoroTimerReturn {
	timeLeft: number;
	isRunning: boolean;
	isPaused: boolean;
	start: () => void;
	pause: () => void;
	resume: () => void;
	reset: (newDurationMinutes?: number) => void;
	// Ref for direct DOM updates (avoids rerenders)
	timeDisplayRef: React.RefObject<HTMLSpanElement | null>;
	progressRef: React.RefObject<SVGCircleElement | null>;
}

// External store for time display (updates every second without React rerenders)
let currentTimeLeft = 0;
const listeners: Set<() => void> = new Set();

function subscribeToTime(callback: () => void) {
	listeners.add(callback);
	return () => listeners.delete(callback);
}

function getTimeSnapshot() {
	return currentTimeLeft;
}

function notifyListeners() {
	listeners.forEach((listener) => listener());
}

export function usePomodoroTimer(): UsePomodoroTimerReturn {
	const {
		pomodoro,
		startTimer,
		pauseTimer,
		resumeTimer,
		resetTimer,
		getTimeLeft,
	} = usePlannerStore();

	// Refs for direct DOM manipulation (no rerenders)
	const timeDisplayRef = useRef<HTMLSpanElement | null>(null);
	const progressRef = useRef<SVGCircleElement | null>(null);
	const rafRef = useRef<number | null>(null);

	// Derive state from store
	const isRunning = pomodoro.timerEndTime !== null;
	const isPaused = pomodoro.timerPausedAt !== null;

	// Use sync external store for time (only updates when second changes)
	const timeLeft = useSyncExternalStore(
		subscribeToTime,
		getTimeSnapshot,
		getTimeSnapshot,
	);

	// Calculate total duration for progress
	const totalSeconds =
		(pomodoro.currentSession === "work"
			? pomodoro.duration
			: pomodoro.breakDuration) * 60;

	// Format time helper
	const formatTime = useCallback((seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}, []);

	// Update DOM directly without React rerenders
	const updateDisplay = useCallback(
		(seconds: number) => {
			if (timeDisplayRef.current) {
				timeDisplayRef.current.textContent = formatTime(seconds);
			}
			if (progressRef.current) {
				const circumference = 553; // 2 * PI * 88
				const progress = ((totalSeconds - seconds) / totalSeconds) * 100;
				progressRef.current.style.strokeDashoffset = String(
					circumference - (circumference * progress) / 100,
				);
			}
		},
		[totalSeconds, formatTime],
	);

	// Initialize time on mount and when session changes
	useEffect(() => {
		const initialTime = getTimeLeft();
		currentTimeLeft = initialTime;
		updateDisplay(initialTime);
		notifyListeners();
	}, [
		pomodoro.currentSession,
		pomodoro.duration,
		pomodoro.breakDuration,
		getTimeLeft,
		updateDisplay,
	]);

	// Animation loop for running timer (display only, completion handled by TimerWatcher)
	useEffect(() => {
		if (!isRunning) {
			// Update display once when stopped
			const time = getTimeLeft();
			currentTimeLeft = time;
			updateDisplay(time);
			notifyListeners();
			return;
		}

		let lastSecond = -1;

		const tick = () => {
			const time = getTimeLeft();
			const currentSecond = Math.ceil(time);

			// Only update when second changes
			if (currentSecond !== lastSecond) {
				lastSecond = currentSecond;
				currentTimeLeft = currentSecond;
				updateDisplay(currentSecond);
				notifyListeners();

				// Stop loop if timer completed (watcher handles the completion event)
				if (time <= 0) {
					return;
				}
			}

			rafRef.current = requestAnimationFrame(tick);
		};

		rafRef.current = requestAnimationFrame(tick);

		return () => {
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, [isRunning, getTimeLeft, updateDisplay]);

	const start = useCallback(() => {
		startTimer();
	}, [startTimer]);

	const pause = useCallback(() => {
		pauseTimer();
	}, [pauseTimer]);

	const resume = useCallback(() => {
		resumeTimer();
	}, [resumeTimer]);

	const reset = useCallback(
		(newDurationMinutes?: number) => {
			resetTimer(newDurationMinutes);
			// Immediately update display
			const newTime =
				newDurationMinutes !== undefined
					? newDurationMinutes * 60
					: getTimeLeft();
			currentTimeLeft = newTime;
			updateDisplay(newTime);
			notifyListeners();
		},
		[resetTimer, getTimeLeft, updateDisplay],
	);

	return {
		timeLeft,
		isRunning,
		isPaused,
		start,
		pause,
		resume,
		reset,
		timeDisplayRef,
		progressRef,
	};
}
