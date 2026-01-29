"use client";

/**
 * StepImageUpload Component
 *
 * PURPOSE:
 * Handles image upload and extraction workflow. Displays ImageUploader component,
 * extraction status, and action buttons (Cancel/Continue or Cancel/Extracting).
 *
 * PARAMETERS:
 * - maxImages: number
 *   Maximum number of images that can be uploaded (typically 5 - current count)
 * - onTextExtracted: (text: string) => void
 *   Callback when text is extracted from images (passed to ImageUploader)
 * - onCancel: () => void
 *   Callback when user clicks Cancel button
 * - onContinue: () => void
 *   Callback when user clicks Continue button (after extraction completes)
 * - onCancelExtraction: () => void
 *   Callback when user clicks Cancel during active extraction
 *
 * WHAT IT DOES:
 * 1. Renders ImageUploader component for drag-drop/paste/click upload
 * 2. Monitors extraction state (isExtracting, completedCount)
 * 3. Shows different button states:
 *    - During extraction: "Cancel" + "Extracting..." (disabled)
 *    - After extraction: "Cancel" + "Continue" (Continue disabled if no images completed)
 * 4. Passes callbacks to parent for state management
 *
 * BENEFITS:
 * - Encapsulates image upload UI and state monitoring
 * - Provides clear visual feedback during extraction
 * - Prevents user from continuing without completed extractions
 * - Reusable for any image extraction workflow
 * - Delegates actual extraction to ImageUploader component
 *
 * USAGE:
 * <StepImageUpload
 *   maxImages={5}
 *   onTextExtracted={(text) => setExtractedText(text)}
 *   onCancel={() => setInputMode(null)}
 *   onContinue={handleProceedToConfigure}
 *   onCancelExtraction={handleCancelExtraction}
 * />
 */

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/cards/image-uploader";
import { imageExtractionService } from "@/lib/services/image-extraction";

interface StepImageUploadProps {
	maxImages: number;
	onTextExtracted: (text: string) => void;
	onCancel: () => void;
	onContinue: () => void;
	onCancelExtraction: () => void;
}

export function StepImageUpload({
	maxImages,
	onTextExtracted,
	onCancel,
	onContinue,
	onCancelExtraction,
}: StepImageUploadProps) {
	const isExtracting = imageExtractionService.isExtracting();
	const completedCount = imageExtractionService.getCompletedCount();

	return (
		<div className="space-y-4">
			<ImageUploader onTextExtracted={onTextExtracted} maxImages={maxImages} />
			<div className="flex gap-2">
				{isExtracting ? (
					<>
						<Button
							variant="destructive"
							className="flex-1"
							onClick={onCancelExtraction}
						>
							Cancel
						</Button>
						<Button className="flex-1" disabled>
							<Loader2 size={14} className="mr-2 animate-spin" />
							Extracting...
						</Button>
					</>
				) : (
					<>
						<Button variant="outline" className="flex-1" onClick={onCancel}>
							Cancel
						</Button>
						<Button
							className="flex-1"
							onClick={onContinue}
							disabled={!completedCount}
						>
							Continue
						</Button>
					</>
				)}
			</div>
		</div>
	);
}
