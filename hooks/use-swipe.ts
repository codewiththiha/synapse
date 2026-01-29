"use client";

import { useMotionValue, useTransform, PanInfo } from "framer-motion";

export interface SwipeConfig {
	threshold?: number;
	rotateAmount?: number;
	opacityRange?: [number, number, number, number, number];
	elasticity?: number;
}

export interface SwipeHandlers {
	onSwipeLeft?: () => void;
	onSwipeRight?: () => void;
}

const DEFAULT_CONFIG: Required<SwipeConfig> = {
	threshold: 50,
	rotateAmount: 10,
	opacityRange: [0.7, 1, 1, 1, 0.7],
	elasticity: 0.5,
};

export function useSwipe(handlers: SwipeHandlers, config: SwipeConfig = {}) {
	const { threshold, rotateAmount, opacityRange, elasticity } = {
		...DEFAULT_CONFIG,
		...config,
	};

	const x = useMotionValue(0);
	const rotate = useTransform(x, [-200, 200], [-rotateAmount, rotateAmount]);
	const opacity = useTransform(x, [-200, -100, 0, 100, 200], opacityRange);

	const handleDragEnd = (_: unknown, info: PanInfo) => {
		const { offset, velocity } = info;
		const swipeThreshold = threshold;
		const velocityThreshold = 500;

		const isSwipeLeft =
			offset.x < -swipeThreshold || velocity.x < -velocityThreshold;
		const isSwipeRight =
			offset.x > swipeThreshold || velocity.x > velocityThreshold;

		if (isSwipeLeft && handlers.onSwipeLeft) {
			handlers.onSwipeLeft();
		} else if (isSwipeRight && handlers.onSwipeRight) {
			handlers.onSwipeRight();
		}
		x.set(0);
	};

	return {
		x,
		rotate,
		opacity,
		handleDragEnd,
		dragProps: {
			drag: "x" as const,
			dragConstraints: { left: 0, right: 0 },
			dragElastic: elasticity,
			onDragEnd: handleDragEnd,
		},
	};
}
