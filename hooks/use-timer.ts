"use client";

import { useRef, useCallback, useEffect } from "react";

interface UseTimerReturn {
	/** Set a timer with callback and delay. Clears any existing timer first. */
	set: (callback: () => void, delay: number) => void;
	/** Clear the active timer if one exists */
	clear: () => void;
	/** Whether a timer is currently active */
	isActive: boolean;
}

/**
 * useTimer - Reusable timer management hook
 *
 * Manages a single timeout with automatic cleanup on unmount.
 * Calling set() while a timer is active will clear the existing timer.
 *
 * @example
 * const timer = useTimer();
 * timer.set(() => console.log('fired'), 500);
 * timer.clear(); // Cancel if needed
 * console.log(timer.isActive); // Check if timer is pending
 */
export function useTimer(): UseTimerReturn {
	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const isActiveRef = useRef(false);

	const clear = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		isActiveRef.current = false;
	}, []);

	const set = useCallback(
		(callback: () => void, delay: number) => {
			clear();
			isActiveRef.current = true;
			timerRef.current = setTimeout(() => {
				isActiveRef.current = false;
				timerRef.current = null;
				callback();
			}, delay);
		},
		[clear],
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			clear();
		};
	}, [clear]);

	return {
		set,
		clear,
		get isActive() {
			return isActiveRef.current;
		},
	};
}
