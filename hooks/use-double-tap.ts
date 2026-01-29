"use client";

import { useRef, useCallback, useEffect } from "react";

interface DoubleTapOptions {
	/** Callback for single tap (optional) */
	onSingleTap?: () => void;
	/** Callback for double tap (required) */
	onDoubleTap: () => void;
	/** Time window for double tap detection in ms (default: 300) */
	delay?: number;
}

/**
 * Hook for detecting double-tap/double-click interactions.
 * Useful for "tap to open, double-tap to edit" patterns.
 *
 * @example
 * const handleTap = useDoubleTap({
 *   onSingleTap: () => navigate(),
 *   onDoubleTap: () => startEditing(),
 *   delay: 300,
 * });
 *
 * <div onClick={handleTap}>Tap me</div>
 */
export function useDoubleTap({
	onSingleTap,
	onDoubleTap,
	delay = 300,
}: DoubleTapOptions) {
	const lastTapRef = useRef<number>(0);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	// Cleanup timer on unmount
	useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

	const handleTap = useCallback(
		(e?: React.MouseEvent | React.TouchEvent) => {
			// Prevent default if event is provided (consumer can also handle this)
			e?.preventDefault?.();
			e?.stopPropagation?.();

			const now = Date.now();
			const timeDiff = now - lastTapRef.current;

			if (timeDiff < delay && timeDiff > 0) {
				// Double tap detected
				if (timerRef.current) {
					clearTimeout(timerRef.current);
					timerRef.current = null;
				}
				onDoubleTap();
				lastTapRef.current = 0;
			} else {
				// First tap - wait to see if it's a double tap
				lastTapRef.current = now;
				timerRef.current = setTimeout(() => {
					onSingleTap?.();
					timerRef.current = null;
				}, delay);
			}
		},
		[onSingleTap, onDoubleTap, delay],
	);

	// Cancel any pending single tap (useful for cleanup)
	const cancelPendingTap = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		lastTapRef.current = 0;
	}, []);

	return { handleTap, cancelPendingTap };
}
