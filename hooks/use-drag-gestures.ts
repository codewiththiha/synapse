/**
 * useDragGestures Hook
 * Extracts drag gesture handling from DraggableCardCover
 *
 * Features:
 * - Hold-to-drag (200ms desktop, 300ms mobile)
 * - Edge scrolling when dragging near viewport edges
 * - Stack detection (500ms hover over another cover)
 * - Haptic feedback on mobile
 * - Prevents accidental clicks after dragging
 * - Global event listeners for smooth cross-element dragging
 */

import * as React from "react";
import { useDragDrop } from "@/components/cards/drag-drop/drag-context";
import { useEdgeScroll } from "@/hooks/use-edge-scroll";
import { useGlobalStore } from "@/stores/use-global-store";
import { useMobile } from "@/hooks/use-mobile";
import { CardCover } from "@/lib/types/flashcard";
import { Position2D } from "@/lib/types/common";
import {
	DESKTOP_HOLD_MS,
	MOBILE_HOLD_MS,
	STACK_HOVER_MS,
} from "@/lib/constants/animations";

interface UseDragGesturesOptions {
	cover: CardCover;
	containerRef: React.RefObject<HTMLDivElement | null>;
	onDragStart?: () => void;
	onDragEnd?: () => void;
}

interface UseDragGesturesReturn {
	/** Whether this cover is currently being dragged */
	isBeingDragged: boolean;
	/** Whether this cover is the stack target */
	isStackTarget: boolean;
	/** Whether clicks should be disabled (after drag) */
	isClickDisabled: boolean;
	/** Pointer event handlers */
	handlers: {
		onPointerDown: (e: React.PointerEvent) => void;
		onPointerMove: (e: React.PointerEvent) => void;
		onPointerUp: () => void;
		onPointerCancel: () => void;
		onTouchStart: (e: React.TouchEvent) => void;
		onTouchMove: (e: React.TouchEvent) => void;
		onTouchEnd: (e: React.TouchEvent) => void;
		onTouchCancel: () => void;
		onPointerEnter: () => void;
		onPointerLeave: () => void;
		onContextMenu: (e: React.MouseEvent) => void;
		onClick: () => void;
	};
	/** Handle click with drag prevention */
	handleClick: (callback?: () => void) => void;
}

export function useDragGestures({
	cover,
	containerRef,
	onDragStart,
	onDragEnd,
}: UseDragGesturesOptions): UseDragGesturesReturn {
	const {
		state,
		startDrag,
		updateDragPosition,
		setDropTarget,
		setStackTarget,
		completeDrop,
		cancelDrag,
	} = useDragDrop();

	const isMobile = useMobile();
	const studyModeOpen = useGlobalStore((s) => s.studyModeOpen);

	const { handleEdgeScroll, stopEdgeScroll, resetScrollContainer } =
		useEdgeScroll({
			threshold: 60,
			speed: 8,
		});

	// Refs for tracking drag state
	const holdTimerRef = React.useRef<NodeJS.Timeout | null>(null);
	const isDraggingRef = React.useRef(false);
	const startPositionRef = React.useRef<Position2D | null>(null);
	const stackHoverTimerRef = React.useRef<NodeJS.Timeout | null>(null);
	const activeTouchIdRef = React.useRef<number | null>(null);

	const [isClickDisabled, setIsClickDisabled] = React.useState(false);

	// Computed values
	const isBeingDragged = state.isDragging && state.draggedCoverId === cover.id;
	const isStackTarget = state.stackTargetId === cover.id;
	const holdDuration = isMobile ? MOBILE_HOLD_MS : DESKTOP_HOLD_MS;

	// Clear timers
	const clearHoldTimer = React.useCallback(() => {
		if (holdTimerRef.current) {
			clearTimeout(holdTimerRef.current);
			holdTimerRef.current = null;
		}
	}, []);

	const clearStackHoverTimer = React.useCallback(() => {
		if (stackHoverTimerRef.current) {
			clearTimeout(stackHoverTimerRef.current);
			stackHoverTimerRef.current = null;
		}
	}, []);

	// Haptic feedback
	const triggerHapticFeedback = React.useCallback(() => {
		if (navigator.vibrate) {
			navigator.vibrate(50);
		}
	}, []);

	// Start drag operation
	const initiateDrag = React.useCallback(
		(position: Position2D) => {
			isDraggingRef.current = true;
			setIsClickDisabled(true);
			resetScrollContainer();
			startDrag(cover, position);
			onDragStart?.();

			if (isMobile) {
				triggerHapticFeedback();
			}
		},
		[
			cover,
			startDrag,
			onDragStart,
			isMobile,
			triggerHapticFeedback,
			resetScrollContainer,
		],
	);

	// Stack hover handlers
	const handleStackHoverStart = React.useCallback(() => {
		if (state.draggedCoverId === cover.id) return;

		clearStackHoverTimer();
		setDropTarget(cover.id, "cover");

		stackHoverTimerRef.current = setTimeout(() => {
			setStackTarget(cover.id);
		}, STACK_HOVER_MS);
	}, [
		state.draggedCoverId,
		cover.id,
		clearStackHoverTimer,
		setDropTarget,
		setStackTarget,
	]);

	const handleStackHoverEnd = React.useCallback(() => {
		clearStackHoverTimer();
		if (state.dropTargetId === cover.id) {
			setDropTarget(null, null);
		}
		if (state.stackTargetId === cover.id) {
			setStackTarget(null);
		}
	}, [
		clearStackHoverTimer,
		state.dropTargetId,
		state.stackTargetId,
		cover.id,
		setDropTarget,
		setStackTarget,
	]);

	// Pointer handlers
	const handlePointerDown = React.useCallback(
		(e: React.PointerEvent) => {
			if (studyModeOpen || state.isDragging || e.button !== 0) return;

			if (!isMobile) {
				const target = e.target as HTMLElement;
				const isInteractive =
					target.closest("button") ||
					target.closest('[role="menuitem"]') ||
					target.closest('[role="menu"]') ||
					target.closest("[data-radix-collection-item]") ||
					target.closest("[data-state]") ||
					target.closest("[data-radix-popper-content-wrapper]") ||
					target.closest('[data-slot="dropdown-menu"]');

				if (isInteractive) return;
			}

			const position = { x: e.clientX, y: e.clientY };
			startPositionRef.current = position;

			clearHoldTimer();
			holdTimerRef.current = setTimeout(() => {
				initiateDrag(position);
			}, holdDuration);
		},
		[
			state.isDragging,
			clearHoldTimer,
			holdDuration,
			initiateDrag,
			isMobile,
			studyModeOpen,
		],
	);

	const handlePointerMove = React.useCallback(
		(e: React.PointerEvent) => {
			const position = { x: e.clientX, y: e.clientY };

			if (isDraggingRef.current && isBeingDragged) {
				updateDragPosition(position);
				if (isMobile) {
					handleEdgeScroll(position.x, position.y, containerRef.current);
				}
				return;
			}

			if (startPositionRef.current && holdTimerRef.current) {
				const dx = Math.abs(position.x - startPositionRef.current.x);
				const dy = Math.abs(position.y - startPositionRef.current.y);
				if (dx > 10 || dy > 10) {
					clearHoldTimer();
				}
			}
		},
		[
			isBeingDragged,
			updateDragPosition,
			clearHoldTimer,
			isMobile,
			handleEdgeScroll,
			containerRef,
		],
	);

	const handlePointerUp = React.useCallback(() => {
		clearHoldTimer();
		stopEdgeScroll();
		activeTouchIdRef.current = null;

		if (isDraggingRef.current && isBeingDragged) {
			completeDrop();
			isDraggingRef.current = false;
			setTimeout(() => setIsClickDisabled(false), 150);
			onDragEnd?.();
		} else {
			setIsClickDisabled(false);
		}

		startPositionRef.current = null;
	}, [clearHoldTimer, stopEdgeScroll, isBeingDragged, completeDrop, onDragEnd]);

	const handlePointerCancel = React.useCallback(() => {
		clearHoldTimer();
		stopEdgeScroll();
		activeTouchIdRef.current = null;

		if (isDraggingRef.current && isBeingDragged) {
			cancelDrag();
			isDraggingRef.current = false;
			setTimeout(() => setIsClickDisabled(false), 150);
			onDragEnd?.();
		} else {
			setIsClickDisabled(false);
		}

		startPositionRef.current = null;
	}, [clearHoldTimer, stopEdgeScroll, isBeingDragged, cancelDrag, onDragEnd]);

	// Touch handlers
	const handleTouchStart = React.useCallback(
		(e: React.TouchEvent) => {
			if (studyModeOpen || state.isDragging || e.touches.length !== 1) return;

			const touch = e.touches[0];
			activeTouchIdRef.current = touch.identifier;
			const position = { x: touch.clientX, y: touch.clientY };
			startPositionRef.current = position;

			clearHoldTimer();
			holdTimerRef.current = setTimeout(() => {
				initiateDrag(position);
			}, MOBILE_HOLD_MS);
		},
		[state.isDragging, clearHoldTimer, initiateDrag, studyModeOpen],
	);

	const handleTouchMove = React.useCallback(
		(e: React.TouchEvent) => {
			const touch = Array.from(e.touches).find(
				(t) => t.identifier === activeTouchIdRef.current,
			);
			if (!touch) return;

			const position = { x: touch.clientX, y: touch.clientY };

			if (isDraggingRef.current && isBeingDragged) {
				updateDragPosition(position);
				handleEdgeScroll(position.x, position.y, containerRef.current);
				e.preventDefault();
				return;
			}

			if (startPositionRef.current && holdTimerRef.current) {
				const dx = Math.abs(position.x - startPositionRef.current.x);
				const dy = Math.abs(position.y - startPositionRef.current.y);
				if (dx > 10 || dy > 10) {
					clearHoldTimer();
				}
			}
		},
		[
			isBeingDragged,
			updateDragPosition,
			clearHoldTimer,
			handleEdgeScroll,
			containerRef,
		],
	);

	const handleTouchEnd = React.useCallback(
		(e: React.TouchEvent) => {
			const touchEnded = !Array.from(e.touches).some(
				(t) => t.identifier === activeTouchIdRef.current,
			);
			if (!touchEnded) return;

			clearHoldTimer();
			stopEdgeScroll();
			activeTouchIdRef.current = null;

			if (isDraggingRef.current && isBeingDragged) {
				completeDrop();
				isDraggingRef.current = false;
				setTimeout(() => setIsClickDisabled(false), 150);
				onDragEnd?.();
			} else {
				setIsClickDisabled(false);
			}

			startPositionRef.current = null;
		},
		[clearHoldTimer, stopEdgeScroll, isBeingDragged, completeDrop, onDragEnd],
	);

	const handleTouchCancel = React.useCallback(() => {
		clearHoldTimer();
		stopEdgeScroll();
		activeTouchIdRef.current = null;

		if (isDraggingRef.current && isBeingDragged) {
			cancelDrag();
			isDraggingRef.current = false;
			setTimeout(() => setIsClickDisabled(false), 150);
			onDragEnd?.();
		} else {
			setIsClickDisabled(false);
		}

		startPositionRef.current = null;
	}, [clearHoldTimer, stopEdgeScroll, isBeingDragged, cancelDrag, onDragEnd]);

	// Click handler
	const handleClick = React.useCallback(
		(callback?: () => void) => {
			if (isDraggingRef.current || isClickDisabled) return;
			callback?.();
		},
		[isClickDisabled],
	);

	// Cleanup on unmount
	React.useEffect(() => {
		return () => {
			clearHoldTimer();
			clearStackHoverTimer();
			stopEdgeScroll();
		};
	}, [clearHoldTimer, clearStackHoverTimer, stopEdgeScroll]);

	// Position-based stack detection for mobile
	React.useEffect(() => {
		if (
			!state.isDragging ||
			state.draggedCoverId === cover.id ||
			!containerRef.current
		) {
			return;
		}

		const rect = containerRef.current.getBoundingClientRect();
		const { x, y } = state.dragPosition;

		const isOver =
			x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

		if (isOver && state.dropTargetId !== cover.id) {
			handleStackHoverStart();
		} else if (
			!isOver &&
			state.dropTargetId === cover.id &&
			state.dropTargetType === "cover"
		) {
			handleStackHoverEnd();
		}
	}, [
		state.isDragging,
		state.draggedCoverId,
		state.dragPosition,
		state.dropTargetId,
		state.dropTargetType,
		cover.id,
		handleStackHoverStart,
		handleStackHoverEnd,
		containerRef,
	]);

	// Global event listeners when dragging
	React.useEffect(() => {
		if (!isBeingDragged) return;

		const handleGlobalPointerMove = (e: PointerEvent) => {
			const position = { x: e.clientX, y: e.clientY };
			updateDragPosition(position);
			if (isMobile) {
				handleEdgeScroll(position.x, position.y, containerRef.current);
			}
		};

		const handleGlobalPointerUp = () => {
			if (isDraggingRef.current) {
				stopEdgeScroll();
				completeDrop();
				isDraggingRef.current = false;
				setTimeout(() => setIsClickDisabled(false), 150);
				onDragEnd?.();
			}
			startPositionRef.current = null;
			activeTouchIdRef.current = null;
		};

		const handleGlobalTouchMove = (e: TouchEvent) => {
			const touch = Array.from(e.touches).find(
				(t) => t.identifier === activeTouchIdRef.current,
			);
			if (!touch) return;

			const position = { x: touch.clientX, y: touch.clientY };
			updateDragPosition(position);
			handleEdgeScroll(position.x, position.y, containerRef.current);

			if (isDraggingRef.current) {
				e.preventDefault();
			}
		};

		const handleGlobalTouchEnd = (e: TouchEvent) => {
			const touchEnded = !Array.from(e.touches).some(
				(t) => t.identifier === activeTouchIdRef.current,
			);
			if (!touchEnded) return;

			if (isDraggingRef.current) {
				stopEdgeScroll();
				completeDrop();
				isDraggingRef.current = false;
				setTimeout(() => setIsClickDisabled(false), 150);
				onDragEnd?.();
			}
			startPositionRef.current = null;
			activeTouchIdRef.current = null;
		};

		window.addEventListener("pointermove", handleGlobalPointerMove);
		window.addEventListener("pointerup", handleGlobalPointerUp);
		window.addEventListener("touchmove", handleGlobalTouchMove, {
			passive: false,
		});
		window.addEventListener("touchend", handleGlobalTouchEnd);

		return () => {
			window.removeEventListener("pointermove", handleGlobalPointerMove);
			window.removeEventListener("pointerup", handleGlobalPointerUp);
			window.removeEventListener("touchmove", handleGlobalTouchMove);
			window.removeEventListener("touchend", handleGlobalTouchEnd);
			stopEdgeScroll();
		};
	}, [
		isBeingDragged,
		updateDragPosition,
		completeDrop,
		onDragEnd,
		isMobile,
		handleEdgeScroll,
		stopEdgeScroll,
		containerRef,
	]);

	// Reset drag state when drag ends externally
	React.useEffect(() => {
		if (!state.isDragging && isDraggingRef.current) {
			isDraggingRef.current = false;
			stopEdgeScroll();
			setTimeout(() => setIsClickDisabled(false), 150);
			onDragEnd?.();
		}
		if (!state.isDragging) {
			clearStackHoverTimer();
		}
	}, [state.isDragging, onDragEnd, clearStackHoverTimer, stopEdgeScroll]);

	return {
		isBeingDragged,
		isStackTarget,
		isClickDisabled,
		handlers: {
			onPointerDown: handlePointerDown,
			onPointerMove: handlePointerMove,
			onPointerUp: handlePointerUp,
			onPointerCancel: handlePointerCancel,
			onTouchStart: handleTouchStart,
			onTouchMove: handleTouchMove,
			onTouchEnd: handleTouchEnd,
			onTouchCancel: handleTouchCancel,
			onPointerEnter: () => {
				if (state.isDragging && state.draggedCoverId !== cover.id) {
					handleStackHoverStart();
				}
			},
			onPointerLeave: () => {
				if (state.isDragging && state.draggedCoverId !== cover.id) {
					handleStackHoverEnd();
				}
			},
			onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
			onClick: () => handleClick(),
		},
		handleClick,
	};
}
