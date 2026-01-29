"use client";

import * as React from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
	UploadCloud,
	Camera,
	X,
	Loader2,
	Check,
	RotateCcw,
	Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/use-global-store";
import {
	imageExtractionService,
	ImageExtractionTask,
} from "@/lib/services/image-extraction";
import { useMobile } from "@/hooks/use-mobile";

interface ImageUploaderProps {
	onTextExtracted?: (text: string) => void;
	maxImages?: number;
	disabled?: boolean;
}

export function ImageUploader({
	onTextExtracted,
	maxImages = 5,
	disabled = false,
}: ImageUploaderProps) {
	const isMobile = useMobile();
	const [tasks, setTasks] = React.useState<ImageExtractionTask[]>([]);
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const cameraInputRef = React.useRef<HTMLInputElement>(null);

	// Subscribe to extraction service
	React.useEffect(() => {
		const unsubscribe = imageExtractionService.subscribe((newTasks) => {
			setTasks(newTasks);
		});
		return unsubscribe;
	}, []);

	// Notify parent when text is extracted
	React.useEffect(() => {
		const combinedText = imageExtractionService.getCombinedText();
		onTextExtracted?.(combinedText);
	}, [tasks, onTextExtracted]);

	// Don't cleanup on unmount - let extraction continue in background
	// Tasks will be cleared when user explicitly cancels or generates cards

	const handleFiles = React.useCallback(
		async (files: File[]) => {
			if (disabled) return;

			const imageFiles = files.filter((f) => f.type.startsWith("image/"));
			if (imageFiles.length === 0) {
				toast({
					title: "Invalid files",
					description: "Please upload image files only.",
					variant: "destructive",
				});
				return;
			}

			if (!imageExtractionService.canAddMore()) {
				toast({
					title: "Limit reached",
					description: "Maximum 5 images allowed.",
					variant: "destructive",
				});
				return;
			}

			await imageExtractionService.addImages(imageFiles);
		},
		[disabled],
	);

	// Clipboard paste support - listen for paste events on document
	React.useEffect(() => {
		const handlePaste = async (e: ClipboardEvent) => {
			if (disabled || !imageExtractionService.canAddMore()) return;

			const items = e.clipboardData?.items;
			if (!items) return;

			const imageFiles: File[] = [];

			for (const item of Array.from(items)) {
				if (item.type.startsWith("image/")) {
					const file = item.getAsFile();
					if (file) {
						imageFiles.push(file);
					}
				}
			}

			if (imageFiles.length > 0) {
				e.preventDefault();
				await handleFiles(imageFiles);
			}
		};

		document.addEventListener("paste", handlePaste);
		return () => document.removeEventListener("paste", handlePaste);
	}, [disabled, handleFiles]);

	const onDrop = React.useCallback(
		async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
			if (fileRejections.length > 0) {
				toast({
					title: "Invalid file",
					description: fileRejections[0].errors[0].message,
					variant: "destructive",
				});
				return;
			}
			handleFiles(acceptedFiles);
		},
		[handleFiles],
	);

	const handleRemove = (id: string) => {
		imageExtractionService.removeImage(id);
	};

	const handleRetry = (id: string) => {
		imageExtractionService.retryImage(id);
	};

	const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			handleFiles(Array.from(files));
		}
		// Reset input
		if (cameraInputRef.current) {
			cameraInputRef.current.value = "";
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			handleFiles(Array.from(files));
		}
		// Reset input
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { "image/*": [] },
		multiple: true,
		disabled: disabled || !imageExtractionService.canAddMore(),
		noClick: tasks.length > 0, // Disable click when images exist
	});

	const canAddMore = imageExtractionService.canAddMore() && !disabled;
	const showDropzone = tasks.length === 0;

	return (
		<div className="space-y-4 w-full">
			{/* Dropzone - only show when no images */}
			{showDropzone && (
				<div className="space-y-3">
					<div
						{...getRootProps()}
						className={`relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-center
							${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"}
							${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
					>
						<input {...getInputProps()} />
						<div className="p-4 rounded-full bg-muted/50">
							<UploadCloud
								className={`size-8 ${isDragActive ? "text-primary" : "text-muted-foreground"}`}
							/>
						</div>
						<div>
							<p className="font-semibold text-sm">
								{isDragActive
									? "Drop images here!"
									: "Click, drag, or paste images"}
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								Up to {maxImages} images • Supports drag & paste
							</p>
						</div>
					</div>

					{/* Upload and Camera buttons on mobile */}
					{isMobile && (
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								className="flex-1"
								onClick={() => fileInputRef.current?.click()}
								disabled={disabled}
							>
								<UploadCloud size={14} className="mr-1.5" />
								Upload
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="flex-1"
								onClick={() => cameraInputRef.current?.click()}
								disabled={disabled}
							>
								<Camera size={14} className="mr-1.5" />
								Capture
							</Button>
						</div>
					)}
				</div>
			)}

			{/* Image previews with status - unified grid layout for both mobile and desktop */}
			{tasks.length > 0 && (
				<div className="space-y-3">
					<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
						<AnimatePresence mode="popLayout">
							{tasks.map((task) => (
								<motion.div
									key={task.id}
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.8 }}
									className="relative aspect-square rounded-lg overflow-hidden border group"
								>
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={task.preview}
										alt="Preview"
										className="w-full h-full object-cover"
									/>

									{/* Status overlay */}
									<div
										className={`absolute inset-0 flex items-center justify-center transition-all
											${task.status === "extracting" ? "bg-black/50" : ""}
											${task.status === "completed" ? "bg-green-500/20" : ""}
											${task.status === "failed" ? "bg-red-500/20" : ""}
											${task.status === "pending" ? "bg-black/30" : ""}`}
									>
										{task.status === "pending" && (
											<div className="p-1.5 rounded-full bg-muted/80">
												<Loader2 size={16} className="text-muted-foreground" />
											</div>
										)}
										{task.status === "extracting" && (
											<div className="p-1.5 rounded-full bg-primary/80">
												<Loader2
													size={16}
													className="animate-spin text-primary-foreground"
												/>
											</div>
										)}
										{task.status === "completed" && (
											<div className="p-1.5 rounded-full bg-green-500">
												<Check size={16} className="text-white" />
											</div>
										)}
										{task.status === "failed" && (
											<button
												type="button"
												onClick={() => handleRetry(task.id)}
												className="p-2 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
												title="Retry"
											>
												<RotateCcw size={16} className="text-white" />
											</button>
										)}
									</div>

									{/* Remove button - always visible on mobile, hover on desktop */}
									<button
										type="button"
										onClick={() => handleRemove(task.id)}
										className={`absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 transition-opacity hover:bg-black/80 ${
											isMobile
												? "opacity-100"
												: "opacity-0 group-hover:opacity-100"
										}`}
									>
										<X className="size-3" />
									</button>
								</motion.div>
							))}

							{/* Add more button in grid */}
							{canAddMore && (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors"
								>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8"
										onClick={() => fileInputRef.current?.click()}
										title="Upload"
									>
										<Plus size={16} />
									</Button>
									<span className="text-[10px] text-muted-foreground">
										{tasks.length}/{maxImages}
									</span>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Action buttons when images exist - camera button for mobile */}
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={() => fileInputRef.current?.click()}
							disabled={!canAddMore}
						>
							<UploadCloud size={14} className="mr-1.5" />
							Upload ({tasks.length}/{maxImages})
						</Button>
						{isMobile && (
							<Button
								variant="outline"
								size="sm"
								className="flex-1"
								onClick={() => cameraInputRef.current?.click()}
								disabled={!canAddMore}
							>
								<Camera size={14} className="mr-1.5" />
								Camera
							</Button>
						)}
					</div>

					{/* Extraction status */}
					<div className="text-xs text-muted-foreground text-center">
						{imageExtractionService.isExtracting() ? (
							<span className="flex items-center justify-center gap-1.5">
								<Loader2 size={12} className="animate-spin" />
								Extracting text...
							</span>
						) : (
							<span>
								{imageExtractionService.getCompletedCount()} of {tasks.length}{" "}
								images processed
							</span>
						)}
					</div>
				</div>
			)}

			{/* Hidden inputs */}
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				multiple
				className="hidden"
				onChange={handleFileSelect}
			/>
			<input
				ref={cameraInputRef}
				type="file"
				accept="image/*"
				capture="environment"
				className="hidden"
				onChange={handleCameraCapture}
			/>
		</div>
	);
}
