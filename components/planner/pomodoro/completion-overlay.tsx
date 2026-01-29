"use client";

/**
 * PomodoroCompletionOverlay
 *
 * Global overlay that shows when pomodoro timer completes.
 * Displays on all routes with blur backdrop and centered stop button.
 * Similar pattern to ExtractionIndicator but with full-screen overlay.
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Square, Coffee, Brain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlannerStore } from "@/stores/use-planner-store";
import { notificationService } from "@/lib/services/notification-service";
import { cn } from "@/lib/utils";

// Event system for pomodoro completion
type CompletionEvent = {
	sessionType: "work" | "break";
};

export const pomodoroCompletionEvents = {
	listeners: new Set<(event: CompletionEvent) => void>(),
	emit: (event: CompletionEvent) => {
		pomodoroCompletionEvents.listeners.forEach((fn) => fn(event));
	},
	subscribe: (fn: (event: CompletionEvent) => void) => {
		pomodoroCompletionEvents.listeners.add(fn);
		return () => {
			pomodoroCompletionEvents.listeners.delete(fn);
		};
	},
};

export function PomodoroCompletionOverlay() {
	const router = useRouter();
	const pathname = usePathname();
	const [showOverlay, setShowOverlay] = useState(false);
	const [completedSession, setCompletedSession] = useState<"work" | "break">(
		"work",
	);
	const { pomodoro, resetTimer } = usePlannerStore();

	const isPlannerRoute = pathname === "/planner";

	// Listen for completion events
	useEffect(() => {
		const unsubscribe = pomodoroCompletionEvents.subscribe((event) => {
			setCompletedSession(event.sessionType);
			setShowOverlay(true);

			// Start continuous alarm sound
			notificationService.startAlarm();

			// Send system notification (no sound since alarm is playing)
			// Note: This will only work if permission was previously granted
			notificationService.notify({
				title:
					event.sessionType === "work"
						? "Focus Session Complete! 🎉"
						: "Break Time Over!",
				body:
					event.sessionType === "work"
						? "Great work! Time for a break."
						: "Ready to focus again?",
				sound: "none",
				tag: "pomodoro-complete",
			});
		});

		return unsubscribe;
	}, []);

	// Note: Notification permission should be requested from a user gesture
	// (e.g., when user starts their first pomodoro session)
	// Requesting in useEffect is blocked by browsers

	const handleDismiss = useCallback(() => {
		// Stop the continuous alarm
		notificationService.stopAlarm();

		setShowOverlay(false);
		// Reset timer for next session (which was already switched by completeSession)
		const nextDuration =
			pomodoro.currentSession === "work"
				? pomodoro.duration
				: pomodoro.breakDuration;
		resetTimer(nextDuration);
	}, [
		pomodoro.currentSession,
		pomodoro.duration,
		pomodoro.breakDuration,
		resetTimer,
	]);

	if (!showOverlay) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-100 flex items-center justify-center"
			>
				{/* Blur backdrop */}
				<div className="absolute inset-0 bg-background/80 backdrop-blur-md" />

				{/* Content */}
				<motion.div
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					exit={{ scale: 0.9, opacity: 0 }}
					transition={{ type: "spring", damping: 20, stiffness: 300 }}
					className="relative z-10 flex flex-col items-center gap-6 p-8"
				>
					{/* Icon */}
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.1, type: "spring", damping: 15 }}
						className={cn(
							"w-24 h-24 rounded-full flex items-center justify-center",
							completedSession === "work"
								? "bg-green-500/20 text-green-500"
								: "bg-blue-500/20 text-blue-500",
						)}
					>
						{completedSession === "work" ? (
							<Coffee size={48} />
						) : (
							<Brain size={48} />
						)}
					</motion.div>

					{/* Message */}
					<div className="text-center space-y-2">
						<h2 className="text-2xl font-bold">
							{completedSession === "work"
								? "Focus Session Complete!"
								: "Break Time Over!"}
						</h2>
						<p className="text-muted-foreground">
							{completedSession === "work"
								? "Great work! Take a well-deserved break."
								: "Ready to get back to work?"}
						</p>
					</div>

					{/* Stop/Dismiss button */}
					<div className="flex items-center gap-3">
						<Button size="lg" onClick={handleDismiss} className="gap-2 px-8">
							<Square size={20} />
							{completedSession === "work" ? "Start Break" : "Start Focus"}
						</Button>

						{/* Go to Planner button - only show if not on planner route */}
						{!isPlannerRoute && (
							<Button
								size="lg"
								variant="outline"
								onClick={() => {
									handleDismiss();
									router.push("/planner");
								}}
								className="gap-2"
							>
								Go to Planner
								<ArrowRight size={18} />
							</Button>
						)}
					</div>

					{/* Session info */}
					<p className="text-sm text-muted-foreground">
						Sessions completed:{" "}
						<span className="font-medium">{pomodoro.sessionsCompleted}</span>
					</p>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
