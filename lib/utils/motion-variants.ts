/**
 * Shared Framer Motion variants
 * Reusable animation patterns for consistent UI transitions
 */

import { Variants } from "framer-motion";

/** Simple fade in/out */
export const fadeIn: Variants = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 },
};

/** Slide up with fade */
export const slideUp: Variants = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -20 },
};

/** Slide down with fade */
export const slideDown: Variants = {
	initial: { opacity: 0, y: -20 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: 20 },
};

/** Scale in with fade */
export const scaleIn: Variants = {
	initial: { opacity: 0, scale: 0.95 },
	animate: { opacity: 1, scale: 1 },
	exit: { opacity: 0, scale: 0.95 },
};

/** Container for staggered children animations */
export const staggerContainer: Variants = {
	animate: {
		transition: { staggerChildren: 0.05 },
	},
};

/** List item for staggered lists */
export const listItem: Variants = {
	initial: { opacity: 0, x: -10 },
	animate: { opacity: 1, x: 0 },
	exit: { opacity: 0, x: 10 },
};

/** Default transition settings */
export const defaultTransition = {
	duration: 0.2,
	ease: "easeOut",
};

/** Spring transition for bouncy effects */
export const springTransition = {
	type: "spring",
	stiffness: 300,
	damping: 30,
};
