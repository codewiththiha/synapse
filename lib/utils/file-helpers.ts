import { Attachment, AttachmentType } from "../types";
import { formatBytes } from "./format";

/**
 * Extract text content from a file (supports PDF and TXT)
 */
export async function extractTextFromFile(file: File): Promise<string> {
	const fileName = file.name.toLowerCase();

	// Handle TXT files
	if (fileName.endsWith(".txt") || file.type === "text/plain") {
		return fileHelpers.readAsText(file);
	}

	// Handle PDF files
	if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
		try {
			// Dynamically import pdfjs-dist
			const pdfjsLib = await import("pdfjs-dist");

			// Set worker source - use unpkg CDN for reliability
			pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

			const arrayBuffer = await file.arrayBuffer();
			const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

			const textParts: string[] = [];
			for (let i = 1; i <= pdf.numPages; i++) {
				const page = await pdf.getPage(i);
				const textContent = await page.getTextContent();
				const pageText = textContent.items
					.map((item) => ("str" in item ? item.str : ""))
					.join(" ");
				textParts.push(pageText);
			}

			return textParts.join("\n\n");
		} catch (error) {
			console.error("PDF extraction error:", error);
			throw new Error("Could not extract text from PDF");
		}
	}

	throw new Error("Unsupported file type. Please use PDF or TXT files.");
}

export const fileHelpers = {
	// Check if file type is supported
	isTextFile: (file: File): boolean => {
		return (
			file.type.startsWith("text/") ||
			/\.(js|ts|tsx|jsx|json|md|css|html|py|java|c|cpp|txt)$/i.test(file.name)
		);
	},

	isImageFile: (file: File): boolean => {
		return file.type.startsWith("image/");
	},

	isAudioFile: (file: File): boolean => {
		return file.type.startsWith("audio/");
	},

	// Read file as text
	readAsText: (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => resolve(e.target?.result as string);
			reader.onerror = reject;
			reader.readAsText(file);
		});
	},

	// Read file as base64
	readAsBase64: (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const result = e.target?.result as string;
				// Remove data URL prefix
				const base64 = result.split(",")[1];
				resolve(base64);
			};
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	},

	// Read file as data URL (for preview)
	readAsDataURL: (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => resolve(e.target?.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	},

	// Convert file to attachment
	fileToAttachment: async (file: File): Promise<Attachment> => {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

		let type: AttachmentType;
		let data: string | undefined;

		if (fileHelpers.isTextFile(file)) {
			type = "text";
			data = await fileHelpers.readAsText(file);
		} else if (fileHelpers.isImageFile(file)) {
			type = "image";
			// For images, use base64 without data URL prefix
			data = await fileHelpers.readAsBase64(file);
		} else if (fileHelpers.isAudioFile(file)) {
			type = "audio";
			data = await fileHelpers.readAsDataURL(file);
		} else {
			throw new Error("Unsupported file type");
		}

		return {
			id,
			name: file.name,
			type,
			mimeType: file.type,
			data,
			size: file.size,
		};
	},

	// Strip large data from attachments for storage (keeps metadata only)
	stripAttachmentData: (attachment: Attachment): Attachment => {
		// For images, remove the base64 data to save storage space
		// Keep text attachments as they're usually small
		if (attachment.type === "image") {
			return {
				...attachment,
				data: undefined, // Remove base64 data
			};
		}
		return attachment;
	},

	// Strip data from all attachments in a message
	stripMessageAttachments: (
		attachments?: Attachment[],
	): Attachment[] | undefined => {
		if (!attachments || attachments.length === 0) return undefined;
		return attachments.map(fileHelpers.stripAttachmentData);
	},

	// Format file size - uses consolidated formatBytes utility
	formatFileSize: (bytes: number): string => formatBytes(bytes),

	// Get file icon based on type
	getFileIcon: (attachment: Attachment): string => {
		switch (attachment.type) {
			case "image":
				return "🖼️";
			case "audio":
				return "🎵";
			case "text":
				return "📄";
			default:
				return "📎";
		}
	},
};
