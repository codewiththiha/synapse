"use client";

/**
 * useTextFileUpload Hook
 *
 * PURPOSE:
 * Manages text input and file upload state for the text input step of card generation.
 * Handles PDF/TXT file reading, file chip management, and combined text extraction.
 *
 * PARAMETERS:
 * None - uses internal state management
 *
 * RETURNS:
 * - textInput: string - Current textarea content
 * - setTextInput: (text: string) => void - Update textarea content
 * - uploadedFiles: UploadedFile[] - Array of {name, content} for uploaded files
 * - isLoadingFile: boolean - Whether a file is currently being read
 * - fileInputRef: React.RefObject<HTMLInputElement> - Ref to hidden file input
 * - handleFileUpload: (e: ChangeEvent) => Promise<void> - Handle file selection
 * - removeFile: (fileName: string) => void - Remove a file from the list
 * - getCombinedText: () => string - Get combined textarea + file contents
 * - triggerFileUpload: () => void - Programmatically open file picker
 * - reset: () => void - Clear all text and files
 * - hasContent: boolean - Whether there's any text or files
 *
 * WHAT IT DOES:
 * 1. Manages textarea input state
 * 2. Handles file selection and reads PDF/TXT files asynchronously
 * 3. Stores uploaded file contents in state
 * 4. Displays file chips with remove buttons
 * 5. Combines textarea text with file contents for final submission
 * 6. Shows error toasts if file reading fails
 * 7. Resets file input after selection
 *
 * BENEFITS:
 * - Encapsulates all file handling logic (no scattered file reading code)
 * - Supports multiple file formats (PDF, TXT)
 * - Provides combined text output ready for card generation
 * - Handles loading states and error messages
 * - Reusable across different text input scenarios
 * - Clean separation from UI component logic
 *
 * USAGE EXAMPLE:
 * const textUpload = useTextFileUpload();
 * // In component:
 * <textarea value={textUpload.textInput} onChange={(e) => textUpload.setTextInput(e.target.value)} />
 * <button onClick={textUpload.triggerFileUpload}>Upload File</button>
 * <input ref={textUpload.fileInputRef} type="file" onChange={textUpload.handleFileUpload} />
 * const finalText = textUpload.getCombinedText();
 */

import * as React from "react";
import { extractTextFromFile } from "@/lib/utils/file-helpers";
import { toast } from "@/stores/use-global-store";

interface UploadedFile {
	name: string;
	content: string;
}

export function useTextFileUpload() {
	const [textInput, setTextInput] = React.useState("");
	const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
	const [isLoadingFile, setIsLoadingFile] = React.useState(false);
	const fileInputRef = React.useRef<HTMLInputElement>(null);

	const handleFileUpload = React.useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files || files.length === 0) return;

			setIsLoadingFile(true);
			try {
				for (const file of Array.from(files)) {
					const text = await extractTextFromFile(file);
					if (text) {
						setUploadedFiles((prev) => [
							...prev,
							{ name: file.name, content: text },
						]);
					}
				}
			} catch (error) {
				console.error("File upload error:", error);
				toast({
					title: "File Error",
					description: "Could not read the file. Please try again.",
					variant: "destructive",
				});
			} finally {
				setIsLoadingFile(false);
				if (fileInputRef.current) {
					fileInputRef.current.value = "";
				}
			}
		},
		[],
	);

	const removeFile = React.useCallback((fileName: string) => {
		setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
	}, []);

	const getCombinedText = React.useCallback(() => {
		const fileContents = uploadedFiles.map((f) => f.content).join("\n\n");
		return [textInput.trim(), fileContents].filter(Boolean).join("\n\n");
	}, [textInput, uploadedFiles]);

	const triggerFileUpload = React.useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const reset = React.useCallback(() => {
		setTextInput("");
		setUploadedFiles([]);
	}, []);

	const hasContent = textInput.trim() || uploadedFiles.length > 0;

	return {
		textInput,
		setTextInput,
		uploadedFiles,
		isLoadingFile,
		fileInputRef,
		handleFileUpload,
		removeFile,
		getCombinedText,
		triggerFileUpload,
		reset,
		hasContent,
	};
}
