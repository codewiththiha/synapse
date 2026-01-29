"use client";

/**
 * CardGenerator Component (Main Orchestrator)
 * Wrapped with error boundary for AI service resilience
 */

import * as React from "react";
import { Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { imageExtractionService } from "@/lib/services/image-extraction";
import { useBackgroundTaskStore } from "@/stores/use-background-task-store";
import { toast } from "@/stores/use-global-store";
import { useCardGeneration } from "@/hooks/use-card-generation";
import { useGeneratorNavigation } from "@/hooks/use-generator-navigation";
import { AIErrorBoundary } from "@/components/shared/error-boundary";

import { StepInputSelection } from "./step-input-selection";
import { StepImageUpload } from "./step-image-upload";
import { StepTextInput } from "./step-text-input";
import { StepPendingChoice } from "./step-pending-choice";
import { StepConfiguration } from "./step-configuration";
import { StepProgress } from "./step-progress";
import { StepComplete } from "./step-complete";
import { GeneratorFloatingButton } from "./generator-floating-button";

interface CardGeneratorProps {
	onComplete?: (coverId: string) => void;
}

export function CardGenerator({ onComplete }: CardGeneratorProps) {
	return (
		<AIErrorBoundary>
			<CardGeneratorInner onComplete={onComplete} />
		</AIErrorBoundary>
	);
}

function CardGeneratorInner({ onComplete }: CardGeneratorProps) {
	const navigation = useGeneratorNavigation();
	const generation = useCardGeneration({
		onComplete,
		onGenerationStart: () => navigation.setStep("generating"),
		onGenerationEnd: (success) => {
			if (success) {
				navigation.resetState();
				navigation.setIsOpen(false);
			} else {
				navigation.setStep("configure");
			}
		},
	});

	// Sync extracted text from background task
	const backgroundTask = useBackgroundTaskStore((state) => state.currentTask);
	React.useEffect(() => {
		if (backgroundTask?.extractedText && navigation.step === "configure") {
			generation.setExtractedText(backgroundTask.extractedText);
		}
	}, [navigation.step, generation, backgroundTask]);

	// Handle image text extraction
	const handleImageTextExtracted = React.useCallback(
		(text: string) => {
			if (text) {
				generation.setExtractedText(text);
			}
		},
		[generation],
	);

	// Handle proceed to configure from image upload
	const handleProceedToConfigure = () => {
		const combinedText = imageExtractionService.getCombinedText();
		if (combinedText) {
			generation.setExtractedText(combinedText);
			// Only clear successfully completed tasks, keep failed ones for retry
			imageExtractionService.clearCompletedTasks();
			navigation.setStep("configure");
			toast({
				title: "Text Extracted!",
				description: `Ready to generate cards from ${imageExtractionService.getUploadCount()} image(s).`,
			});
		}
	};

	// Handle using pending extraction
	const handleUsePendingExtraction = () => {
		const text = imageExtractionService.getPersistedText();
		if (text) {
			generation.setExtractedText(text);
			navigation.setStep("configure");
		}
	};

	// Handle add more photos
	const handleAddMorePhotos = () => {
		navigation.setInputMode("upload");
		navigation.setStep("input");
	};

	// Handle start fresh
	const handleStartFresh = () => {
		imageExtractionService.clearAll();
		navigation.resetState();
	};

	// Handle cancel extraction
	const handleCancelExtraction = () => {
		imageExtractionService.clearAll();
		navigation.resetState();
		navigation.setIsOpen(false);
	};

	// Handle text submit
	const handleTextSubmit = (text: string) => {
		generation.setExtractedText(text);
		navigation.setStep("configure");
	};

	// Handle generate
	const handleGenerate = (cardCount: number) => {
		generation.startGeneration(cardCount);
	};

	// Get dialog title based on step
	const getDialogTitle = () => {
		switch (navigation.step) {
			case "input":
				return "Create Flashcards";
			case "pending-choice":
				return "Previous Extraction Found";
			case "configure":
				return "Configure Cards";
			case "generating":
				return "Generating Cards...";
			case "complete":
				return "Complete!";
			default:
				return "Create Flashcards";
		}
	};

	// Show FAB when dialog is closed
	if (!navigation.isOpen) {
		return (
			<GeneratorFloatingButton
				isExtracting={navigation.isExtracting}
				isGenerating={generation.isGenerating}
				hasPendingExtraction={navigation.hasPendingExtraction}
				backgroundTask={generation.backgroundTask}
				onRestore={navigation.handleRestore}
				onFabClick={navigation.handleFabClick}
			/>
		);
	}

	return (
		<Dialog
			open={navigation.isOpen}
			onOpenChange={(open) => {
				if (!open && navigation.showMinimizeOnly) {
					navigation.handleMinimize();
				} else if (!open) {
					navigation.handleClose();
				}
			}}
		>
			<DialogContent
				className="sm:max-w-md"
				hideCloseButton={navigation.showMinimizeOnly}
			>
				<DialogHeader>
					<div className="flex items-center justify-between">
						<DialogTitle>{getDialogTitle()}</DialogTitle>
						{navigation.showMinimizeOnly && (
							<Button
								variant="ghost"
								size="icon"
								onClick={navigation.handleMinimize}
								className="h-8 w-8"
							>
								<Minimize2 size={16} />
							</Button>
						)}
					</div>
				</DialogHeader>

				<div className="space-y-4">
					{/* Pending extraction choice */}
					{navigation.step === "pending-choice" && (
						<StepPendingChoice
							onUsePending={handleUsePendingExtraction}
							onAddMore={handleAddMorePhotos}
							onStartFresh={handleStartFresh}
						/>
					)}

					{/* Input selection */}
					{navigation.step === "input" && !navigation.inputMode && (
						<StepInputSelection
							onSelectMode={navigation.setInputMode}
							uploadCount={navigation.extractionState?.uploadCount}
						/>
					)}

					{/* Image upload mode */}
					{navigation.step === "input" && navigation.inputMode === "upload" && (
						<StepImageUpload
							maxImages={5 - (navigation.extractionState?.uploadCount || 0)}
							onTextExtracted={handleImageTextExtracted}
							onCancel={() => {
								imageExtractionService.clearTasks();
								navigation.setInputMode(null);
							}}
							onContinue={handleProceedToConfigure}
							onCancelExtraction={handleCancelExtraction}
						/>
					)}

					{/* Text input */}
					{navigation.step === "input" && navigation.inputMode === "text" && (
						<StepTextInput
							onCancel={() => navigation.setInputMode(null)}
							onSubmit={handleTextSubmit}
						/>
					)}

					{/* Configure */}
					{navigation.step === "configure" && (
						<StepConfiguration
							extractedText={generation.extractedText}
							onGenerate={handleGenerate}
						/>
					)}

					{/* Generating */}
					{navigation.step === "generating" && (
						<StepProgress progress={generation.generationProgress} />
					)}

					{/* Complete */}
					{navigation.step === "complete" && <StepComplete />}
				</div>
			</DialogContent>
		</Dialog>
	);
}
