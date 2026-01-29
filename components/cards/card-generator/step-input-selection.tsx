"use client";

/**
 * StepInputSelection Component
 *
 * PURPOSE:
 * First step of the card generation wizard. Allows users to choose between uploading images or entering text.
 *
 * PARAMETERS:
 * - onSelectMode: (mode: InputMode) => void
 *   Callback when user selects 'upload' or 'text' mode
 * - uploadCount?: number
 *   Current number of uploaded images (shows remaining slots)
 *
 * WHAT IT DOES:
 * 1. Displays two large button options: "Images" and "Text"
 * 2. Shows remaining image upload slots (e.g., "4 left")
 * 3. Disables image button if max images (5) already uploaded
 * 4. Calls onSelectMode callback when user clicks either button
 *
 * BENEFITS:
 * - Simple, focused component with single responsibility
 * - Clear visual choice between two input methods
 * - Prevents user from uploading more than 5 images
 * - Reusable in any wizard that needs input mode selection
 * - No internal state management (fully controlled)
 *
 * USAGE:
 * <StepInputSelection
 *   onSelectMode={(mode) => setInputMode(mode)}
 *   uploadCount={extractionState?.uploadCount}
 * />
 */

import { Image as ImageIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { imageExtractionService } from "@/lib/services/image-extraction";
import type { InputMode } from "@/hooks/use-generator-navigation";

interface StepInputSelectionProps {
	onSelectMode: (mode: InputMode) => void;
	uploadCount?: number;
}

export function StepInputSelection({
	onSelectMode,
	uploadCount = 0,
}: StepInputSelectionProps) {
	const canAddImages = imageExtractionService.canAddMore();

	return (
		<div className="grid grid-cols-2 gap-3">
			<Button
				variant="outline"
				className="flex flex-col h-24 gap-2"
				onClick={() => onSelectMode("upload")}
				disabled={!canAddImages}
			>
				<ImageIcon size={24} />
				<span className="text-xs">
					Images
					{uploadCount > 0 && (
						<span className="ml-1 text-muted-foreground">
							({5 - uploadCount} left)
						</span>
					)}
				</span>
			</Button>
			<Button
				variant="outline"
				className="flex flex-col h-24 gap-2"
				onClick={() => onSelectMode("text")}
			>
				<FileText size={24} />
				<span className="text-xs">Text</span>
			</Button>
		</div>
	);
}
