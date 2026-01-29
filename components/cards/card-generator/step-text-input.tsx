"use client";

/**
 * StepTextInput Component
 * Text input for card generation with react-hook-form + zod validation
 */

import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ControlledTextarea } from "@/components/ui/form";
import { useTextFileUpload } from "@/hooks/use-text-file-upload";
import {
	textInputSchema,
	TextInputSchema,
	textInputDefaultValues,
} from "@/lib/schemas/flashcard";

interface StepTextInputProps {
	onCancel: () => void;
	onSubmit: (text: string) => void;
}

export function StepTextInput({ onCancel, onSubmit }: StepTextInputProps) {
	const {
		textInput,
		setTextInput,
		uploadedFiles,
		isLoadingFile,
		fileInputRef,
		handleFileUpload,
		removeFile,
		getCombinedText,
		triggerFileUpload,
	} = useTextFileUpload();

	const form = useForm<TextInputSchema>({
		resolver: zodResolver(textInputSchema),
		defaultValues: textInputDefaultValues,
		mode: "onChange",
	});

	// Sync textarea value with hook state
	useEffect(() => {
		form.setValue("text", textInput, { shouldValidate: true });
	}, [textInput, form]);

	// Check if we have content (text or files)
	const hasContent = textInput.trim().length > 0 || uploadedFiles.length > 0;

	const handleSubmit = () => {
		const combined = getCombinedText();
		if (combined) {
			onSubmit(combined);
		}
	};

	return (
		<FormProvider {...form}>
			<div className="space-y-3">
				{/* Uploaded files chips */}
				{uploadedFiles.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{uploadedFiles.map((file) => (
							<div
								key={file.name}
								className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-xs"
							>
								<FileText size={12} />
								<span className="max-w-[120px] truncate">{file.name}</span>
								<button
									type="button"
									onClick={() => removeFile(file.name)}
									className="hover:text-destructive transition-colors"
								>
									<X size={12} />
								</button>
							</div>
						))}
					</div>
				)}

				{/* Textarea with file upload button */}
				<div className="relative">
					<ControlledTextarea<TextInputSchema>
						name="text"
						placeholder="Paste or type your content here..."
						className="h-40 pr-12"
						onChange={(e) => setTextInput(e.target.value)}
					/>
					<Button
						variant="ghost"
						size="icon"
						type="button"
						className="absolute top-2 right-2 h-8 w-8"
						onClick={triggerFileUpload}
						disabled={isLoadingFile}
						title="Upload PDF or TXT file"
					>
						{isLoadingFile ? (
							<Loader2 size={16} className="animate-spin" />
						) : (
							<Plus size={16} />
						)}
					</Button>
				</div>

				<p className="text-xs text-muted-foreground">
					Supports PDF and TXT files
				</p>

				<div className="flex gap-2">
					<Button
						variant="outline"
						className="flex-1"
						type="button"
						onClick={onCancel}
					>
						Cancel
					</Button>
					<Button
						className="flex-1"
						type="button"
						onClick={handleSubmit}
						disabled={!hasContent || isLoadingFile}
					>
						Continue
					</Button>
				</div>

				{/* Hidden file input */}
				<input
					ref={fileInputRef}
					type="file"
					accept=".pdf,.txt,text/plain,application/pdf"
					multiple
					className="hidden"
					onChange={handleFileUpload}
				/>
			</div>
		</FormProvider>
	);
}
