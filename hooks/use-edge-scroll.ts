"use client";

import { useRef, useCallback, useEffect } from "react";

interface EdgeScrollOptions {
	/** Distance from edge to trigger scroll (default: 60px) */
	threshold?: number;
	/** Scroll speed in pixels per frame (default: 8) */
	speed?: number;
	/** Callback fired on each scroll tick */
	onScroll?: () => void;
}

/**
 * Hook for handling edge scrolling during drag operations.
 * Automatically scrolls the nearest scrollable container when
 * the pointer approaches viewport edges.
 *
 * @example
 * const { handleEdgeScroll, stopEdgeScroll } = useEdgeScroll({ threshold: 60, speed: 8 });
 *
 * // In your drag move handler:
 * handleEdgeScroll(clientX, clientY, draggedElement);
 *
 * // On drag end:
 * stopEdgeScroll();
 */
export function useEdgeScroll({
	threshold = 60,
	speed = 8,
	onScroll,
}: EdgeScrollOptions = {}) {
	const animationFrameRef = useRef<number | null>(null);
	const scrollContainerRef = useRef<HTMLElement | null>(null);

	// Find the nearest scrollable ancestor
	const findScrollContainer = useCallback(
		(element: HTMLElement | null): HTMLElement => {
			let current = element?.parentElement;
			while (current) {
				const style = window.getComputedStyle(current);
				if (["auto", "scroll"].includes(style.overflowY)) {
					return current;
				}
				current = current.parentElement;
			}
			return document.documentElement;
		},
		[],
	);

	// Stop any ongoing scroll animation
	const stopEdgeScroll = useCallback(() => {
		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}
	}, []);

	// Handle edge scroll based on pointer position
	const handleEdgeScroll = useCallback(
		(x: number, y: number, sourceElement: HTMLElement | null = null) => {
			// Cache the scroll container
			if (!scrollContainerRef.current) {
				scrollContainerRef.current = findScrollContainer(sourceElement);
			}

			const container = scrollContainerRef.current;
			if (!container) return;

			const viewportH = window.innerHeight;
			const viewportW = window.innerWidth;

			// Calculate scroll deltas based on position relative to viewport edges
			let dy = 0;
			let dx = 0;

			// Vertical edge detection
			if (y < threshold) {
				// Near top - scroll up with intensity based on proximity
				dy = -speed * (1 - y / threshold);
			} else if (y > viewportH - threshold) {
				// Near bottom - scroll down
				dy = speed * ((y - (viewportH - threshold)) / threshold);
			}

			// Horizontal edge detection
			if (x < threshold) {
				// Near left - scroll left
				dx = -speed * (1 - x / threshold);
			} else if (x > viewportW - threshold) {
				// Near right - scroll right
				dx = speed * ((x - (viewportW - threshold)) / threshold);
			}

			// Apply scroll if needed
			if (dx !== 0 || dy !== 0) {
				const tick = () => {
					container.scrollBy({ left: dx, top: dy, behavior: "auto" });
					onScroll?.();
					animationFrameRef.current = requestAnimationFrame(tick);
				};

				// Start scrolling if not already
				if (!animationFrameRef.current) {
					tick();
				}
			} else {
				// Stop scrolling if not near edges
				stopEdgeScroll();
			}
		},
		[threshold, speed, findScrollContainer, stopEdgeScroll, onScroll],
	);

	// Reset scroll container reference (useful when drag starts)
	const resetScrollContainer = useCallback(() => {
		scrollContainerRef.current = null;
	}, []);

	// Cleanup on unmount
	useEffect(() => stopEdgeScroll, [stopEdgeScroll]);

	return {
		handleEdgeScroll,
		stopEdgeScroll,
		resetScrollContainer,
	};
}
