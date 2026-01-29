"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseCountdownOptions {
	initialSeconds: number;
	onComplete?: () => void;
}

interface UseCountdownReturn {
	timeLeft: number;
	isRunning: boolean;
	start: () => void;
	pause: () => void;
	reset: (newSeconds?: number) => void;
}

/**
 * useCountdown - Countdown timer hook
 *
 * Manages a countdown timer with start, pause, and reset controls.
 * Calls onComplete when timer reaches zero.
 *
 * @example
 * const { timeLeft, isRunning, start, pause, reset } = useCountdown({
 *   initialSeconds: 300, // 5 minutes
 *   onComplete: () => console.log('Timer complete!')
 * });
 */
export function useCountdown({
	initialSeconds,
	onComplete,
}: UseCountdownOptions): UseCountdownReturn {
	const [timeLeft, setTimeLeft] = useState(initialSeconds);
	const [isRunning, setIsRunning] = useState(false);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const onCompleteRef = useRef(onComplete);

	// Keep onComplete ref updated
	useEffect(() => {
		onCompleteRef.current = onComplete;
	}, [onComplete]);

	const clearTimer = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	const start = useCallback(() => {
		setIsRunning(true);
	}, []);

	const pause = useCallback(() => {
		setIsRunning(false);
		clearTimer();
	}, [clearTimer]);

	const reset = useCallback(
		(newSeconds?: number) => {
			clearTimer();
			setIsRunning(false);
			setTimeLeft(newSeconds ?? initialSeconds);
		},
		[clearTimer, initialSeconds],
	);

	// Timer effect
	useEffect(() => {
		if (!isRunning) {
			clearTimer();
			return;
		}

		intervalRef.current = setInterval(() => {
			setTimeLeft((prev) => {
				if (prev <= 1) {
					clearTimer();
					setIsRunning(false);
					onCompleteRef.current?.();
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return clearTimer;
	}, [isRunning, clearTimer]);

	// Cleanup on unmount
	useEffect(() => {
		return clearTimer;
	}, [clearTimer]);

	return {
		timeLeft,
		isRunning,
		start,
		pause,
		reset,
	};
}
