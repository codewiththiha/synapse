"use client";

/**
 * PomodoroIndicator
 *
 * Floating draggable button that shows on ALL routes when pomodoro timer is running.
 * - Draggable with pointer events (prevents click on drag release)
 * - Fades to 30% opacity and compact mode after 10s of no interaction
 * - Clicking navigates to /planner
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Timer } from "lucide-react";
import { usePlannerStore } from "@/stores/use-planner-store";
import { cn } from "@/lib/utils";

const IDLE_TIMEOUT = 10000; // 10 seconds
const DRAG_THRESHOLD = 5; // pixels to count as drag

export function PomodoroIndicator() {
	const router = useRouter();
	const pathname = usePathname();
	const { pomodoro, getTimeLeft } = usePlannerStore();
	const [timeDisplay, setTimeDisplay] = useState("00:00");
	const [minuteDisplay, setMinuteDisplay] = useState("0");
	const [isIdle, setIsIdle] = useState(false);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);

	const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
	const hasDraggedRef = useRef(false);
	const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

	const isRunning = pomodoro.timerEndTime !== null;
	const isPaused = pomodoro.timerPausedAt !== null;
	const isActive = isRunning || isPaused;

	// Show on ALL routes when timer is active (including /planner)
	const isPlannerRoute = pathname === "/planner";
	const shouldShow = isActive;

	// Reset idle timer on interaction
	const resetIdleTimer = useCallback(() => {
		setIsIdle(false);
		if (idleTimerRef.current) {
			clearTimeout(idleTimerRef.current);
		}
		idleTimerRef.current = setTimeout(() => {
			setIsIdle(true);
		}, IDLE_TIMEOUT);
	}, []);

	// Initialize and cleanup idle timer
	useEffect(() => {
		if (!shouldShow) return;

		// Start idle timer
		idleTimerRef.current = setTimeout(() => {
			setIsIdle(true);
		}, IDLE_TIMEOUT);

		return () => {
			if (idleTimerRef.current) {
				clearTimeout(idleTimerRef.current);
			}
		};
	}, [shouldShow]);

	// Update time display
	useEffect(() => {
		if (!isActive) return;

		const updateTime = () => {
			const seconds = getTimeLeft();
			const mins = Math.floor(seconds / 60);
			const secs = seconds % 60;
			setTimeDisplay(
				`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`,
			);
			setMinuteDisplay(mins.toString());
		};

		updateTime();

		if (isRunning) {
			const interval = setInterval(updateTime, 1000);
			return () => clearInterval(interval);
		}
	}, [isActive, isRunning, getTimeLeft]);

	// Handle drag with pointer events (prevents click on drag release)
	const handlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault();
			setIsDragging(true);
			hasDraggedRef.current = false;
			dragStartRef.current = {
				x: e.clientX,
				y: e.clientY,
				posX: position.x,
				posY: position.y,
			};

			const handleMove = (moveEvent: PointerEvent) => {
				const deltaX = moveEvent.clientX - dragStartRef.current.x;
				const deltaY = moveEvent.clientY - dragStartRef.current.y;

				// Only count as drag if moved more than threshold
				if (
					Math.abs(deltaX) > DRAG_THRESHOLD ||
					Math.abs(deltaY) > DRAG_THRESHOLD
				) {
					hasDraggedRef.current = true;
				}

				setPosition({
					x: dragStartRef.current.posX + deltaX,
					y: dragStartRef.current.posY + deltaY,
				});
			};

			const handleEnd = () => {
				setIsDragging(false);
				resetIdleTimer();
				window.removeEventListener("pointermove", handleMove);
				window.removeEventListener("pointerup", handleEnd);
				window.removeEventListener("pointercancel", handleEnd);
			};

			window.addEventListener("pointermove", handleMove);
			window.addEventListener("pointerup", handleEnd);
			window.addEventListener("pointercancel", handleEnd);
		},
		[position, resetIdleTimer],
	);

	// Handle click (ignores if just dragged)
	// On planner route: toggle pomodoro visibility
	// On other routes: navigate to planner
	const handleClick = useCallback(() => {
		if (hasDraggedRef.current) {
			hasDraggedRef.current = false;
			return;
		}
		if (isPlannerRoute) {
			// On planner route, toggle the pomodoro dialog
			usePlannerStore.getState().togglePomodoroVisibility();
		} else {
			// On other routes, navigate to planner
			router.push("/planner");
		}
	}, [router, isPlannerRoute]);

	const handleMouseEnter = () => {
		resetIdleTimer();
	};

	if (!shouldShow) return null;

	const sessionColor =
		pomodoro.currentSession === "work"
			? "bg-blue-500 hover:bg-blue-600"
			: "bg-green-500 hover:bg-green-600";

	// Base position (right side, above other FABs)
	const baseX = 24; // right-6
	const baseY = 96; // bottom-24

	return (
		<AnimatePresence>
			<motion.div
				initial={{ scale: 0, opacity: 0 }}
				animate={{
					scale: 1,
					opacity: isIdle ? 0.3 : 1,
				}}
				exit={{ scale: 0, opacity: 0 }}
				transition={{
					opacity: { duration: 0.3 },
				}}
				style={{
					position: "fixed",
					right: baseX - position.x,
					bottom: baseY - position.y,
					zIndex: 50,
					touchAction: "none",
				}}
				className={cn(isDragging ? "cursor-grabbing" : "cursor-grab")}
				onPointerDown={handlePointerDown}
				onMouseEnter={handleMouseEnter}
			>
				<motion.button
					onClick={handleClick}
					animate={{
						width: isIdle ? 48 : "auto",
						height: isIdle ? 48 : 56,
						borderRadius: isIdle ? 24 : 28,
					}}
					transition={{ duration: 0.2 }}
					className={cn(
						"flex items-center justify-center gap-2 shadow-lg text-white font-medium",
						sessionColor,
						!isIdle && "px-4",
						isPaused && !isIdle && "opacity-80",
					)}
				>
					{isIdle ? (
						// Compact mode - just minute
						<span className="text-sm font-mono font-bold">{minuteDisplay}</span>
					) : (
						// Full mode
						<>
							<Timer size={20} className={cn(isRunning && "animate-pulse")} />
							<span className="text-sm font-mono tabular-nums">
								{timeDisplay}
							</span>
							{isPaused && <span className="text-xs opacity-80">(paused)</span>}
						</>
					)}
				</motion.button>
			</motion.div>
		</AnimatePresence>
	);
}
