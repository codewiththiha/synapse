"use client";

/**
 * GenerationIndicator Component
 *
 * PURPOSE:
 * Global floating indicator for card generation status.
 * Shows on all routes (except /cards) when card generation is in progress.
 * Clicking navigates to /cards and opens the generator dialog with progress view.
 *
 * WHAT IT DOES:
 * 1. Monitors flashcard store and background task for generation state
 * 2. Shows floating button with spinner and progress percentage
 * 3. On click, navigates to /cards and emits event to open generator dialog
 * 4. Hidden on /cards route (CardGenerator handles it there)
 *
 * BENEFITS:
 * - Users can see generation progress from any route
 * - One-click access to view full progress details
 * - Consistent UX with ExtractionIndicator
 * - Non-intrusive floating UI
 */

import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBackgroundTaskStore } from "@/stores/use-background-task-store";
import { useFlashcardStore } from "@/stores/use-flashcard-store";

// Event interface for opening generator dialog in generating state
export interface GenerationIndicatorEvent {
	type: "generation";
}

// Event emitter to signal CardGenerator to open with generating view
export const generationIndicatorEvents = {
	listeners: new Set<(event: GenerationIndicatorEvent) => void>(),
	emit: (event: GenerationIndicatorEvent) => {
		generationIndicatorEvents.listeners.forEach((fn) => fn(event));
	},
	subscribe: (fn: (event: GenerationIndicatorEvent) => void) => {
		generationIndicatorEvents.listeners.add(fn);
		return () => {
			generationIndicatorEvents.listeners.delete(fn);
		};
	},
};

export function GenerationIndicator() {
	const router = useRouter();
	const pathname = usePathname();

	const { isGenerating: storeIsGenerating, generationProgress } =
		useFlashcardStore();

	const backgroundTask = useBackgroundTaskStore((state) => state.currentTask);

	const isGenerating =
		storeIsGenerating ||
		(backgroundTask?.type === "generating" &&
			backgroundTask?.status === "running");

	const progress = backgroundTask?.progress ?? generationProgress;

	// Don't show on /cards route - CardGenerator handles it there
	const isCardsRoute = pathname === "/cards";
	const shouldShow = !isCardsRoute && isGenerating;

	const handleClick = () => {
		router.push("/cards");
		// Small delay to ensure CardGenerator is mounted
		setTimeout(() => {
			generationIndicatorEvents.emit({ type: "generation" });
		}, 100);
	};

	if (!shouldShow) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ scale: 0, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				exit={{ scale: 0, opacity: 0 }}
				className="fixed bottom-6 right-6 z-50"
			>
				<Button
					onClick={handleClick}
					className="h-14 px-4 rounded-full shadow-lg gap-2"
				>
					<Loader2 size={20} className="animate-spin" />
					<span className="text-sm">{Math.round(progress)}%</span>
				</Button>
			</motion.div>
		</AnimatePresence>
	);
}
