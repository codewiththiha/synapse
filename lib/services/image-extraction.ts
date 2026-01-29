/**
 * Image Extraction Service
 * Handles concurrent image-to-text extraction with background processing
 * Persists state to localStorage for recovery
 */

import { isPuterAvailable, extractResponseText } from "../utils/puter-helpers";
import { toast } from "@/stores/use-global-store";

export type ExtractionStatus =
	| "pending"
	| "extracting"
	| "completed"
	| "failed"
	| "aborted";

export interface ImageExtractionTask {
	id: string;
	file: File;
	preview: string;
	status: ExtractionStatus;
	extractedText: string;
	error?: string;
	abortController?: AbortController;
}

export interface ExtractionState {
	extractedText: string;
	uploadCount: number;
	isExtracting: boolean;
}

type ExtractionListener = (tasks: ImageExtractionTask[]) => void;
type StateListener = (state: ExtractionState) => void;

const EXTRACTION_CONFIG = {
	maxConcurrent: 5,
	maxImages: 5,
	model: "openrouter:qwen/qwen-2.5-vl-7b-instruct:free",
	instruction: `Extract all text content from this image.
Preserve the structure and formatting as much as possible.
Include headings, paragraphs, lists, and any other text elements.
Return only the extracted text, no additional commentary.`,
};

const STORAGE_KEY = "flashcard-extraction-state";

class ImageExtractionService {
	private tasks: Map<string, ImageExtractionTask> = new Map();
	private listeners: Set<ExtractionListener> = new Set();
	private stateListeners: Set<StateListener> = new Set();
	private activeCount = 0;
	private queue: string[] = [];

	// Persisted state
	private _extractedText: string = "";
	private _uploadCount: number = 0;

	constructor() {
		this.loadState();
	}

	private loadState(): void {
		if (typeof window === "undefined") return;
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const state = JSON.parse(saved);
				this._extractedText = state.extractedText || "";
				this._uploadCount = state.uploadCount || 0;
			}
		} catch {
			// Ignore errors
		}
	}

	private saveState(): void {
		if (typeof window === "undefined") return;
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					extractedText: this._extractedText,
					uploadCount: this._uploadCount,
				}),
			);
		} catch {
			// Ignore errors
		}
		this.notifyStateListeners();
	}

	getPersistedText(): string {
		return this._extractedText;
	}

	getUploadCount(): number {
		return this._uploadCount;
	}

	hasPendingExtraction(): boolean {
		return this._uploadCount > 0 && this._extractedText.length > 0;
	}

	canAddMore(): boolean {
		// Check both persisted count and current tasks
		const currentTaskCount = this.tasks.size;
		return this._uploadCount + currentTaskCount < EXTRACTION_CONFIG.maxImages;
	}

	getState(): ExtractionState {
		return {
			extractedText: this._extractedText,
			uploadCount: this._uploadCount,
			isExtracting: this.isExtracting(),
		};
	}

	resetPersistedState(): void {
		this._extractedText = "";
		this._uploadCount = 0;
		this.saveState();
	}

	getTasks(): ImageExtractionTask[] {
		return Array.from(this.tasks.values());
	}

	getCombinedText(): string {
		const currentText = Array.from(this.tasks.values())
			.filter((t) => t.status === "completed" && t.extractedText)
			.map((t) => t.extractedText)
			.join("\n\n---\n\n");

		if (this._extractedText && currentText) {
			return this._extractedText + "\n\n---\n\n" + currentText;
		}
		return currentText || this._extractedText;
	}

	isExtracting(): boolean {
		return Array.from(this.tasks.values()).some(
			(t) => t.status === "pending" || t.status === "extracting",
		);
	}

	getCompletedCount(): number {
		return Array.from(this.tasks.values()).filter(
			(t) => t.status === "completed",
		).length;
	}

	async addImages(files: File[]): Promise<void> {
		const currentTaskCount = this.tasks.size;
		const availableSlots = EXTRACTION_CONFIG.maxImages - currentTaskCount;
		if (availableSlots <= 0) return;

		const filesToAdd = files.slice(0, availableSlots);

		for (const file of filesToAdd) {
			const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
			const preview = URL.createObjectURL(file);

			const task: ImageExtractionTask = {
				id,
				file,
				preview,
				status: "pending",
				extractedText: "",
			};

			this.tasks.set(id, task);
			this.queue.push(id);
			// Don't increment uploadCount here - only on successful extraction
		}

		this.notifyListeners();
		this.processQueue();
	}

	removeImage(id: string): void {
		const task = this.tasks.get(id);
		if (!task) return;

		if (task.status === "extracting" && task.abortController) {
			task.abortController.abort();
			this.activeCount--;
		}

		URL.revokeObjectURL(task.preview);
		this.queue = this.queue.filter((qId) => qId !== id);
		this.tasks.delete(id);
		this.updatePersistedText();
		this.notifyListeners();
		this.processQueue();
	}

	retryImage(id: string): void {
		const task = this.tasks.get(id);
		if (!task || task.status !== "failed") return;

		// Reset task status and re-queue
		task.status = "pending";
		task.error = undefined;
		task.extractedText = "";
		this.queue.push(id);
		this.notifyListeners();
		this.processQueue();
	}

	private updatePersistedText(): void {
		const completedText = Array.from(this.tasks.values())
			.filter((t) => t.status === "completed" && t.extractedText)
			.map((t) => t.extractedText)
			.join("\n\n---\n\n");

		this._extractedText = completedText;
		this.saveState();
	}

	clearTasks(): void {
		for (const task of this.tasks.values()) {
			if (task.abortController) {
				task.abortController.abort();
			}
			URL.revokeObjectURL(task.preview);
		}

		this.tasks.clear();
		this.queue = [];
		this.activeCount = 0;
		this.notifyListeners();
	}

	/**
	 * Clear only successfully completed tasks (keep failed/pending for retry)
	 * Called after text extraction is complete and user proceeds to generation
	 */
	clearCompletedTasks(): void {
		const tasksToRemove: string[] = [];

		for (const [id, task] of this.tasks.entries()) {
			if (task.status === "completed") {
				URL.revokeObjectURL(task.preview);
				tasksToRemove.push(id);
			}
		}

		for (const id of tasksToRemove) {
			this.tasks.delete(id);
		}

		// Remove completed tasks from queue (shouldn't be there, but just in case)
		this.queue = this.queue.filter((id) => this.tasks.has(id));

		this.notifyListeners();
	}

	clearAll(): void {
		this.clearTasks();
		this.resetPersistedState();
	}

	private async processQueue(): Promise<void> {
		while (
			this.queue.length > 0 &&
			this.activeCount < EXTRACTION_CONFIG.maxConcurrent
		) {
			const id = this.queue.shift();
			if (!id) continue;

			const task = this.tasks.get(id);
			if (!task || task.status !== "pending") continue;

			this.activeCount++;
			this.extractImage(task);
		}
	}

	private async extractImage(task: ImageExtractionTask): Promise<void> {
		// Defensive check: ensure task still exists in map
		if (!this.tasks.has(task.id)) {
			this.activeCount--;
			this.processQueue();
			return;
		}

		if (!isPuterAvailable()) {
			task.status = "failed";
			task.error = "AI service not available";
			this.tasks.set(task.id, task); // Update in map
			this.activeCount--;
			this.notifyListeners();
			this.notifyStateListeners();
			toast({
				title: "Extraction Failed",
				description: task.error,
				variant: "destructive",
			});
			this.processQueue();
			return;
		}

		task.status = "extracting";
		task.abortController = new AbortController();
		this.tasks.set(task.id, task); // Update in map
		this.notifyListeners();
		this.notifyStateListeners();

		try {
			const dataUrl = await this.fileToDataUrl(task.file);

			// Check if task was removed while processing
			if (!this.tasks.has(task.id)) {
				this.activeCount--;
				this.processQueue();
				return;
			}

			if (task.abortController.signal.aborted) {
				task.status = "aborted";
				this.tasks.set(task.id, task);
				this.activeCount--;
				this.notifyListeners();
				this.notifyStateListeners();
				this.processQueue();
				return;
			}

			const content: unknown[] = [
				{ type: "text", text: EXTRACTION_CONFIG.instruction },
				{ type: "image_url", image_url: { url: dataUrl } },
			];

			const response = await window.puter.ai.chat([{ role: "user", content }], {
				model: EXTRACTION_CONFIG.model,
				max_tokens: 4000,
				temperature: 0.3,
			});

			// Check again if task was removed during API call
			if (!this.tasks.has(task.id)) {
				this.activeCount--;
				this.processQueue();
				return;
			}

			if (task.abortController.signal.aborted) {
				task.status = "aborted";
				this.tasks.set(task.id, task);
			} else {
				task.extractedText = extractResponseText(response);
				task.status = "completed";
				this.tasks.set(task.id, task); // Update in map
				// Increment upload count only on successful extraction
				this._uploadCount++;
				this.updatePersistedText();
			}
		} catch (error) {
			// Check if task still exists before updating
			if (!this.tasks.has(task.id)) {
				this.activeCount--;
				this.processQueue();
				return;
			}

			if (task.abortController?.signal.aborted) {
				task.status = "aborted";
			} else {
				task.status = "failed";
				task.error =
					error instanceof Error ? error.message : "Extraction failed";
				// Show toast notification on failure
				toast({
					title: "Extraction Failed",
					description: task.error,
					variant: "destructive",
				});
			}
			this.tasks.set(task.id, task); // Update in map
		} finally {
			task.abortController = undefined;
			// Final update in map if task still exists
			if (this.tasks.has(task.id)) {
				this.tasks.set(task.id, task);
			}
			this.activeCount--;
			this.notifyListeners();
			this.notifyStateListeners();
			this.processQueue();
		}
	}

	private fileToDataUrl(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement("canvas");
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					reject(new Error("Could not get canvas context"));
					return;
				}
				ctx.fillStyle = "#FFFFFF";
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0);
				resolve(canvas.toDataURL("image/jpeg", 0.9));
				URL.revokeObjectURL(img.src);
			};
			img.onerror = () => {
				URL.revokeObjectURL(img.src);
				reject(new Error("Failed to load image"));
			};
			img.src = URL.createObjectURL(file);
		});
	}

	subscribe(callback: ExtractionListener): () => void {
		this.listeners.add(callback);
		callback(this.getTasks());
		return () => {
			this.listeners.delete(callback);
		};
	}

	subscribeState(callback: StateListener): () => void {
		this.stateListeners.add(callback);
		callback(this.getState());
		return () => {
			this.stateListeners.delete(callback);
		};
	}

	private notifyListeners(): void {
		const tasks = this.getTasks();
		this.listeners.forEach((cb) => cb(tasks));
	}

	private notifyStateListeners(): void {
		const state = this.getState();
		this.stateListeners.forEach((cb) => cb(state));
	}
}

export const imageExtractionService = new ImageExtractionService();
