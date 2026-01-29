"use client";

/**
 * StepPendingChoice Component
 *
 * PURPOSE:
 * Displays options when user has previously extracted images waiting to be used.
 * Allows user to create cards from pending extraction, add more photos, or start fresh.
 *
 * PARAMETERS:
 * - onUsePending: () => void
 *   Callback when user clicks "Create Cards Now" to use pending extraction
 * - onAddMore: () => void
 *   Callback when user clicks "Add More Photos" to upload additional images
 * - onStartFresh: () => void
 *   Callback when user clicks "Start Fresh" to clear pending extraction
 *
 * WHAT IT DOES:
 * 1. Shows info box with count of pending extracted images
 * 2. Displays three action buttons:
 *    - "Create Cards Now" - uses pending extraction
 *    - "Add More Photos" - allows uploading more images (if slots available)
 *    - "Start Fresh" - clears pending extraction
 * 3. Hides "Add More Photos" button if max images already reached
 * 4. Shows remaining slots count (e.g., "2 left")
 *
 * BENEFITS:
 * - Provides clear options for handling pending extractions
 * - Prevents accidental loss of extracted data
 * - Allows incremental image uploads
 * - Simple, focused component with single responsibility
 * - Fully controlled (no internal state)
 *
 * USAGE:
 * <StepPendingChoice
 *   onUsePending={handleUsePendingExtraction}
 *   onAddMore={handleAddMorePhotos}
 *   onStartFresh={handleStartFresh}
 * />
 */

import { Sparkles, ImagePlus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { imageExtractionService } from "@/lib/services/image-extraction";

interface StepPendingChoiceProps {
	onUsePending: () => void;
	onAddMore: () => void;
	onStartFresh: () => void;
}

export function StepPendingChoice({
	onUsePending,
	onAddMore,
	onStartFresh,
}: StepPendingChoiceProps) {
	const uploadCount = imageExtractionService.getUploadCount();
	const canAddMore = imageExtractionService.canAddMore();
	const remainingSlots = 5 - uploadCount;

	return (
		<div className="space-y-4">
			<div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
				<p className="text-sm font-medium mb-2">
					You have {uploadCount} image(s) extracted previously.
				</p>
				<p className="text-xs text-muted-foreground">
					Would you like to create cards from this text, add more photos, or
					start fresh?
				</p>
			</div>

			<div className="grid gap-2">
				<Button onClick={onUsePending} className="w-full">
					<Sparkles size={16} className="mr-2" />
					Create Cards Now
				</Button>
				{canAddMore && (
					<Button variant="outline" onClick={onAddMore} className="w-full">
						<ImagePlus size={16} className="mr-2" />
						Add More Photos ({remainingSlots} left)
					</Button>
				)}
				<Button
					variant="ghost"
					onClick={onStartFresh}
					className="w-full text-muted-foreground"
				>
					<RotateCcw size={16} className="mr-2" />
					Start Fresh
				</Button>
			</div>
		</div>
	);
}
