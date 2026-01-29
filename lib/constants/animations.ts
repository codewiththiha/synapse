/**
 * Animation Constants Module
 *
 * Centralized configuration values for Framer Motion spring animations
 * and timing durations. Use these for consistent animation behavior
 * across the application.
 */

/**
 * Spring animation presets for Framer Motion
 * Use these for consistent animation feel across the app
 */

/**
 * Snappy spring - quick, responsive interactions
 * Best for: buttons, toggles, small UI elements
 */
export const SPRING_SNAPPY = {
	type: "spring",
	stiffness: 400,
	damping: 25,
} as const;

/**
 * Smooth spring - balanced feel
 * Best for: drag previews, modals, medium-sized transitions
 */
export const SPRING_SMOOTH = {
	type: "spring",
	stiffness: 200,
	damping: 25,
} as const;

/**
 * Gentle spring - soft, relaxed motion
 * Best for: page transitions, large element animations
 */
export const SPRING_GENTLE = {
	type: "spring",
	stiffness: 250,
	damping: 20,
} as const;

export const SMOOTH_TWEEN = {
	type: "tween",
	duration: 0.25,
	ease: [0.4, 0, 0.2, 1],
} as const;

/**
 * Liquid transition - smooth, organic deformation feel
 * Best for: morphing shapes, list items entering/exiting, fluid UI changes
 * Uses custom bezier curve for that "liquid" deformation effect
 */
export const LIQUID_TRANSITION = {
	type: "tween",
	duration: 0.35,
	ease: [0.22, 1, 0.36, 1],
} as const;

/**
 * Liquid variants for list items (conversations, folders, etc.)
 * Provides enter/exit animations with liquid-like feel
 */
export const liquidListVariants = {
	hidden: {
		opacity: 0,
		scale: 0.95,
	},
	visible: {
		opacity: 1,
		scale: 1,
		transition: {
			type: "tween",
			duration: 0.35,
			ease: [0.22, 1, 0.36, 1],
		},
	},
	exit: {
		opacity: 0,
		scale: 0.95,
		transition: {
			type: "tween",
			duration: 0.2,
			ease: [0.22, 1, 0.36, 1],
		},
	},
} as const;

/**
 * Liquid variants for folder expand/collapse
 */
export const liquidFolderVariants = {
	collapsed: {
		height: 0,
		opacity: 0,
	},
	expanded: {
		height: "auto",
		opacity: 1,
	},
} as const;

/**
 * Timing constants for interaction delays (in milliseconds)
 */

/**
 * Desktop hold-to-drag duration (ms)
 * Quick for mouse users who have precise control
 */
export const DESKTOP_HOLD_MS = 200;

/**
 * Mobile hold-to-drag duration (ms)
 * Longer to prevent accidental drags during scrolling
 */
export const MOBILE_HOLD_MS = 300;

/**
 * Stack hover duration (ms)
 * Time before showing stack indicator when hovering over a collection
 */
export const STACK_HOVER_MS = 500;

/**
 * Double-tap detection window (ms)
 * Maximum time between taps to register as a double-tap
 */
export const DOUBLE_TAP_DELAY_MS = 300;
