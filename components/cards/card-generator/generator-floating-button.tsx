"use client";

/**
 * GeneratorFloatingButton Component
 *
 * PURPOSE:
 * Displays floating action button (FAB) when card generator dialog is closed.
 * Shows different states: normal FAB, extracting indicator, generating progress, or pending extraction.
 *
 * PARAMETERS:
 * - isExtracting: boolean
 *   Whether image extraction is currently in progress
 * - isGenerating: boolean
 *   Whether card generation is currently in progress
 * - hasPendingExtraction: boolean
 *   Whether there are extracted images waiting to be used
 * - backgroundTask: BackgroundTask | null
 *   Current background task (contains progress info)
 * - onRestore: () => void
 *   Callback when user clicks FAB during extracting/generating (restores dialog)
 * - onFabClick: () => void
 *   Callback when user clicks FAB in normal state
 *
 * WHAT IT DOES:
 * 1. Shows different button states based on current operation:
 *    - Extracting: "Extracting..." with spinner
 *    - Generating: Progress percentage with spinner
 *    - Pending: "X pending" with amber color
 *    - Normal: Bot icon
 * 2. Applies opacity based on study mode (0.3 if study mode open)
 * 3. Positioned fixed bottom-right with z-40
 * 4. Calls appropriate callback on click
 *
 * BENEFITS:
 * - Provides persistent access to generator from any route
 * - Shows operation status without opening dialog
 * - Allows user to restore dialog during background operations
 * - Visual indicator of pending work
 * - Respects study mode by reducing opacity
 * - Reusable for any floating action button pattern
 *
 * USAGE:
 * <GeneratorFloatingButton
 *   isExtracting={navigation.isExtracting}
 *   isGenerating={generation.isGenerating}
 *   hasPendingExtraction={navigation.hasPendingExtraction}
 *   backgroundTask={generation.backgroundTask}
 *   onRestore={navigation.handleRestore}
 *   onFabClick={navigation.handleFabClick}
 * />
 */

import { motion } from "framer-motion";
import { Bot, Loader2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobalStore } from "@/stores/use-global-store";
import { useFlashcardStore } from "@/stores/use-flashcard-store";
import { imageExtractionService } from "@/lib/services/image-extraction";
import type { BackgroundTask } from "@/stores/use-background-task-store";

interface GeneratorFloatingButtonProps {
	isExtracting: boolean;
	isGenerating: boolean;
	hasPendingExtraction: boolean;
	backgroundTask: BackgroundTask | null;
	onRestore: () => void;
	onFabClick: () => void;
}

export function GeneratorFloatingButton({
	isExtracting,
	isGenerating,
	hasPendingExtraction,
	backgroundTask,
	onRestore,
	onFabClick,
}: GeneratorFloatingButtonProps) {
	const studyModeOpen = useGlobalStore((state) => state.studyModeOpen);
	// Get progress from flashcard store as fallback (for @card command generation)
	const storeProgress = useFlashcardStore((state) => state.generationProgress);

	// Use background task progress if available, otherwise use store progress
	const progress = backgroundTask?.progress ?? storeProgress;

	// Show extracting/generating indicator
	if (isExtracting || isGenerating) {
		return (
			<motion.div
				initial={{ scale: 0, opacity: 0 }}
				animate={{ scale: 1, opacity: studyModeOpen ? 0.3 : 1 }}
				className="fixed bottom-6 right-6 z-40"
			>
				<Button
					onClick={onRestore}
					className="h-14 px-4 rounded-full shadow-lg gap-2"
				>
					<Loader2 size={20} className="animate-spin" />
					<span className="text-sm">
						{isExtracting ? "Extracting..." : `${Math.round(progress)}%`}
					</span>
				</Button>
			</motion.div>
		);
	}

	// Show pending extraction indicator
	if (hasPendingExtraction) {
		return (
			<motion.div
				initial={{ scale: 0, opacity: 0 }}
				animate={{ scale: 1, opacity: studyModeOpen ? 0.3 : 1 }}
				className="fixed bottom-6 right-6 z-40"
			>
				<Button
					onClick={onFabClick}
					className="h-14 px-4 rounded-full shadow-lg gap-2 bg-amber-500 hover:bg-amber-600"
				>
					<ImagePlus size={20} />
					<span className="text-sm">
						{imageExtractionService.getUploadCount()} pending
					</span>
				</Button>
			</motion.div>
		);
	}

	// Normal FAB
	return (
		<motion.div
			initial={{ scale: 0, opacity: 0 }}
			animate={{ scale: 1, opacity: studyModeOpen ? 0.3 : 1 }}
			className="fixed bottom-6 right-6 z-40"
		>
			<Button
				onClick={onFabClick}
				className="h-14 w-14 rounded-full shadow-lg"
				size="icon"
			>
				<Bot size={24} />
			</Button>
		</motion.div>
	);
}
