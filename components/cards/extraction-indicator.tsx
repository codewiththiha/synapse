"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	imageExtractionService,
	ExtractionState,
} from "@/lib/services/image-extraction";

// Event interface with viewMode for consistent dialog state
export interface ExtractionIndicatorEvent {
	viewMode: "status" | "upload" | "pending-choice";
}

// Event to signal CardGenerator to open with specific view
export const extractionIndicatorEvents = {
	listeners: new Set<(event: ExtractionIndicatorEvent) => void>(),
	emit: (event: ExtractionIndicatorEvent) => {
		extractionIndicatorEvents.listeners.forEach((fn) => fn(event));
	},
	subscribe: (fn: (event: ExtractionIndicatorEvent) => void) => {
		extractionIndicatorEvents.listeners.add(fn);
		return () => {
			extractionIndicatorEvents.listeners.delete(fn);
		};
	},
};

/**
 * Global floating indicator for extraction status
 * Shows on all routes when there's active extraction or pending extraction
 * Note: Generation status is handled by GenerationIndicator component
 */
export function ExtractionIndicator() {
	const router = useRouter();
	const pathname = usePathname();
	const [extractionState, setExtractionState] =
		React.useState<ExtractionState | null>(null);

	React.useEffect(() => {
		const unsubscribe = imageExtractionService.subscribeState((state) => {
			setExtractionState(state);
		});
		return unsubscribe;
	}, []);

	const isExtracting = extractionState?.isExtracting || false;
	const hasPendingExtraction = imageExtractionService.hasPendingExtraction();

	// Don't show on /cards route - CardGenerator handles it there
	const isCardsRoute = pathname === "/cards";

	// Show indicator if extracting or has pending extraction (on non-cards routes)
	const shouldShow = !isCardsRoute && (isExtracting || hasPendingExtraction);

	const handleClick = () => {
		// Determine the correct view mode based on current state
		let viewMode: ExtractionIndicatorEvent["viewMode"] = "status";
		if (isExtracting || imageExtractionService.getTasks().length > 0) {
			viewMode = "status";
		} else if (hasPendingExtraction) {
			viewMode = "pending-choice";
		}

		// Navigate to cards and emit event to open dialog with correct view
		router.push("/cards");
		// Small delay to ensure CardGenerator is mounted
		setTimeout(() => {
			extractionIndicatorEvents.emit({ viewMode });
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
				{isExtracting && (
					<Button
						onClick={handleClick}
						className="h-14 px-4 rounded-full shadow-lg gap-2"
					>
						<Loader2 size={20} className="animate-spin" />
						<span className="text-sm">Extracting...</span>
					</Button>
				)}

				{!isExtracting && hasPendingExtraction && (
					<Button
						onClick={handleClick}
						className="h-14 px-4 rounded-full shadow-lg gap-2 bg-amber-500 hover:bg-amber-600"
					>
						<ImagePlus size={20} />
						<span className="text-sm">
							{imageExtractionService.getUploadCount()} ready
						</span>
					</Button>
				)}
			</motion.div>
		</AnimatePresence>
	);
}
