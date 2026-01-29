"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	Square,
	ArrowUp,
	X,
	Image as ImageIcon,
	Music,
	FileText,
	Loader2,
	Check,
	AlertCircle,
	Layers,
	Plus,
	Wrench,
	Search,
} from "lucide-react";
import {
	AppSettings,
	Attachment,
	SessionType,
	ReasoningEffort,
} from "@/lib/types";
import { AVAILABLE_MODELS } from "@/lib/constants";
import { fileHelpers } from "@/lib/utils/file-helpers";
import { backgroundAI } from "@/lib/services/background-ai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedSelect } from "@/components/ui/animated-select";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { toast, useGlobalStore } from "@/stores/use-global-store";
import { FilePreview } from "@/components/chat-ui/chat/input/file-preview";
import { cn } from "@/lib/utils";

// Command suggestions for @ mentions
type CommandSuggestion = {
	type: "card";
	label: string;
	icon: React.ReactNode;
	description: string;
};

const commandSuggestions: CommandSuggestion[] = [
	{
		type: "card",
		label: "card",
		icon: <Layers size={14} />,
		description: "Create flashcards from conversation",
	},
];

interface ChatInputProps {
	isLoading: boolean;
	settings: AppSettings;
	onSendMessage: (content: string, attachments?: Attachment[]) => void;
	onStop: () => void;
	onUpdateSettings?: (newSettings: Partial<AppSettings>) => void;
	sessionType?: SessionType;
}

export function ChatInput({
	isLoading,
	settings,
	onSendMessage,
	onStop,
	onUpdateSettings,
	sessionType = "chat",
}: ChatInputProps) {
	const [input, setInput] = React.useState("");
	const [attachments, setAttachments] = React.useState<Attachment[]>([]);
	const [isConvertingImage, setIsConvertingImage] = React.useState(false);
	const [previewAttachment, setPreviewAttachment] =
		React.useState<Attachment | null>(null);
	const [showSuggestions, setShowSuggestions] = React.useState(false);
	const [filteredSuggestions, setFilteredSuggestions] = React.useState<
		CommandSuggestion[]
	>([]);
	const [selectedIndex, setSelectedIndex] = React.useState(0);
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const transportHandledRef = React.useRef(false);

	const { hasTransportText, getTransportText, clearTransportText } =
		useGlobalStore();

	const currentModel = AVAILABLE_MODELS.find((m) => m.id === settings.modelId);
	const isTTS = sessionType === "tts";
	const modelSupportsImages =
		currentModel?.capabilities?.supportsImages ?? false;
	const supportsReasoning =
		currentModel?.capabilities?.supportsReasoning ?? false;
	const supportsTools = currentModel?.capabilities?.supportsTools ?? false;

	const isParsingImages = attachments.some((a) => a.isParsing);
	const canSend =
		(input.trim() || attachments.length > 0) &&
		!isParsingImages &&
		!isLoading &&
		!isConvertingImage;

	// Reasoning effort options for AnimatedSelect
	const reasoningOptions = [
		{ value: "low", label: "Low" },
		{ value: "medium", label: "Medium" },
		{ value: "high", label: "High" },
		{ value: "xhigh", label: "Extra High" },
	];

	// Handle transport text from assistant
	React.useEffect(() => {
		// Wait for mode to match sessionType before sending transport text
		const modeMatches =
			(sessionType === "tts" && settings.mode === "tts") ||
			(sessionType === "chat" && settings.mode === "chat");

		if (
			hasTransportText &&
			!transportHandledRef.current &&
			!isLoading &&
			modeMatches
		) {
			const text = getTransportText();
			if (text) {
				transportHandledRef.current = true;
				// Small delay to ensure everything is ready
				setTimeout(() => {
					onSendMessage(text);
					clearTransportText();
				}, 100);
			}
		}
	}, [
		hasTransportText,
		isLoading,
		getTransportText,
		clearTransportText,
		onSendMessage,
		settings.mode,
		sessionType,
	]);

	// Reset transport handled ref when hasTransportText changes to false
	React.useEffect(() => {
		if (!hasTransportText) {
			transportHandledRef.current = false;
		}
	}, [hasTransportText]);

	// Check for @ mentions to show command suggestions
	React.useEffect(() => {
		const atIndex = input.lastIndexOf("@");
		if (atIndex !== -1 && atIndex === input.length - 1) {
			// Just typed @, show all suggestions
			setFilteredSuggestions(commandSuggestions);
			setShowSuggestions(true);
			setSelectedIndex(0);
		} else if (atIndex !== -1) {
			const query = input
				.slice(atIndex + 1)
				.toLowerCase()
				.split(" ")[0];
			// Only show suggestions if we're still typing the command (no space after @command)
			if (!input.slice(atIndex).includes(" ") || query.length === 0) {
				const filtered = commandSuggestions.filter((s) =>
					s.label.toLowerCase().startsWith(query),
				);
				setFilteredSuggestions(filtered);
				setShowSuggestions(filtered.length > 0 && query.length < 10);
				setSelectedIndex(0);
			} else {
				setShowSuggestions(false);
			}
		} else {
			setShowSuggestions(false);
		}
	}, [input]);

	// Handle selecting a suggestion
	const handleSelectSuggestion = React.useCallback(
		(suggestion: CommandSuggestion) => {
			const atIndex = input.lastIndexOf("@");
			const beforeAt = input.slice(0, atIndex);
			setInput(beforeAt + "@" + suggestion.label + " ");
			setShowSuggestions(false);
			textareaRef.current?.focus();
		},
		[input],
	);

	const parseImageAttachment = React.useCallback(
		async (attachment: Attachment) => {
			if (
				!attachment.data ||
				attachment.type !== "image" ||
				modelSupportsImages
			) {
				return;
			}

			setAttachments((prev) =>
				prev.map((a) =>
					a.id === attachment.id
						? { ...a, isParsing: true, parseError: undefined }
						: a,
				),
			);

			const result = await backgroundAI.parseSingleImage(
				attachment.id,
				attachment.data,
				attachment.mimeType || "image/png",
				attachment.name,
			);

			setAttachments((prev) =>
				prev.map((a) => {
					if (a.id === attachment.id) {
						return {
							...a,
							isParsing: false,
							parsedDescription: result.description,
							parseError: result.error,
						};
					}
					return a;
				}),
			);
		},
		[modelSupportsImages],
	);

	const calculateHeight = React.useCallback(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			const scrollHeight = textareaRef.current.scrollHeight;
			const minHeight = 24;
			const maxHeight = 200;
			const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
			textareaRef.current.style.height = `${newHeight}px`;
		}
	}, []);

	React.useEffect(() => {
		calculateHeight();
	}, [input, calculateHeight]);

	const addAttachment = React.useCallback(
		async (attachment: Attachment) => {
			setAttachments((prev) => [...prev, attachment]);

			if (
				attachment.type === "image" &&
				!modelSupportsImages &&
				attachment.data
			) {
				setTimeout(() => parseImageAttachment(attachment), 50);
			}
		},
		[modelSupportsImages, parseImageAttachment],
	);

	const handlePaste = React.useCallback(
		async (e: React.ClipboardEvent) => {
			const items = Array.from(e.clipboardData?.items || []);
			const imageItems = items.filter((item) => item.type.startsWith("image/"));

			if (imageItems.length === 0) return;

			e.preventDefault();
			setIsConvertingImage(true);

			try {
				for (const item of imageItems) {
					const file = item.getAsFile();
					if (!file) continue;

					try {
						const attachment = await fileHelpers.fileToAttachment(file);
						attachment.name = `Pasted Image ${new Date().toLocaleTimeString()}`;
						await addAttachment(attachment);

						if (!modelSupportsImages) {
							toast({ description: "Parsing image for text-only model..." });
						}
					} catch (error) {
						const errorMessage =
							error instanceof Error ? error.message : "Failed to paste image";
						toast({
							title: "Paste Error",
							description: errorMessage,
							variant: "destructive",
						});
					}
				}
			} finally {
				setIsConvertingImage(false);
			}
		},
		[addAttachment, modelSupportsImages],
	);

	const handleSubmit = (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!canSend) return;

		onSendMessage(input, attachments.length ? attachments : undefined);
		setInput("");
		setAttachments([]);
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		// Handle suggestion navigation
		if (showSuggestions) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIndex((prev) =>
					prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
				);
				return;
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIndex((prev) =>
					prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
				);
				return;
			} else if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				if (filteredSuggestions[selectedIndex]) {
					handleSelectSuggestion(filteredSuggestions[selectedIndex]);
				}
				return;
			} else if (e.key === "Escape") {
				setShowSuggestions(false);
				return;
			}
		}

		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (canSend) {
				handleSubmit();
			}
		}
	};

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (files.length === 0) return;

		// Check if any files are images that need conversion
		const hasImages = files.some((f) => fileHelpers.isImageFile(f));
		if (hasImages) {
			setIsConvertingImage(true);
		}

		try {
			for (const file of files) {
				try {
					if (fileHelpers.isAudioFile(file)) {
						if (!currentModel?.capabilities?.supportsAudio) {
							toast({
								title: "Unsupported File Type",
								description: "Current model doesn't support audio files.",
								variant: "destructive",
							});
							continue;
						}
					} else if (
						!fileHelpers.isTextFile(file) &&
						!fileHelpers.isImageFile(file)
					) {
						toast({
							title: "Unsupported File Type",
							description: "Please upload text, image, or audio files.",
							variant: "destructive",
						});
						continue;
					}

					const attachment = await fileHelpers.fileToAttachment(file);
					await addAttachment(attachment);

					if (fileHelpers.isImageFile(file) && !modelSupportsImages) {
						toast({ description: "Parsing image for text-only model..." });
					}
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Failed to upload file";
					toast({
						title: "Upload Error",
						description: errorMessage,
						variant: "destructive",
					});
				}
			}
		} finally {
			setIsConvertingImage(false);
		}

		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const removeAttachment = (id: string) => {
		backgroundAI.cancelImageParsing(id);
		setAttachments((prev) => prev.filter((a) => a.id !== id));
	};

	const getAttachmentIcon = (attachment: Attachment) => {
		if (attachment.isParsing)
			return <Loader2 size={12} className="animate-spin" />;
		if (attachment.parseError)
			return <AlertCircle size={12} className="text-destructive" />;
		if (attachment.parsedDescription)
			return <Check size={12} className="text-green-500" />;
		switch (attachment.type) {
			case "image":
				return <ImageIcon size={12} />;
			case "audio":
				return <Music size={12} />;
			default:
				return <FileText size={12} />;
		}
	};

	return (
		<div className="bg-transparent">
			<motion.div
				className="max-w-3xl mx-auto relative group"
				initial={false}
				animate={{ y: 0 }}
				transition={{ type: "spring", stiffness: 300, damping: 30 }}
			>
				<AnimatePresence>
					{attachments.length > 0 && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 10 }}
							className="absolute bottom-full left-0 mb-2 flex flex-wrap gap-2 w-full"
						>
							{attachments.map((attachment) => (
								<motion.div
									key={attachment.id}
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.8 }}
									transition={{ type: "spring", stiffness: 400, damping: 25 }}
								>
									<Badge
										variant={
											attachment.parseError ? "destructive" : "secondary"
										}
										className={`gap-2 pr-1 cursor-pointer hover:bg-muted-foreground/20 transition-colors ${attachment.isParsing ? "animate-pulse" : ""}`}
										title={
											attachment.parseError ||
											(attachment.parsedDescription
												? "Image parsed - Click to preview"
												: "Click to preview")
										}
										onClick={() => setPreviewAttachment(attachment)}
									>
										{getAttachmentIcon(attachment)}
										<span className="max-w-[200px] truncate">
											{attachment.name}
										</span>
										{attachment.isParsing && (
											<span className="text-[10px] text-muted-foreground ml-1">
												parsing...
											</span>
										)}
										<Button
											variant="ghost"
											size="icon"
											className="h-4 w-4 hover:bg-muted"
											onClick={(e) => {
												e.stopPropagation();
												removeAttachment(attachment.id);
											}}
										>
											<X size={10} />
										</Button>
									</Badge>
								</motion.div>
							))}
						</motion.div>
					)}
				</AnimatePresence>

				{/* Command suggestions dropdown */}
				<AnimatePresence>
					{showSuggestions && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 10 }}
							className="absolute bottom-full left-0 right-0 mb-2 p-1 rounded-lg border bg-popover shadow-lg z-20"
						>
							{filteredSuggestions.map((suggestion, index) => (
								<button
									key={suggestion.type}
									onClick={() => handleSelectSuggestion(suggestion)}
									className={cn(
										"w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
										index === selectedIndex
											? "bg-accent text-accent-foreground"
											: "hover:bg-accent/50",
									)}
								>
									{suggestion.icon}
									<span>@{suggestion.label}</span>
									<span className="text-muted-foreground text-xs ml-auto">
										{suggestion.description}
									</span>
								</button>
							))}
						</motion.div>
					)}
				</AnimatePresence>

				{/* Double Border Input Container - outer border + inner muted border + drop shadow */}
				<div className="relative rounded-3xl p-px bg-border/60 shadow-lg">
					<motion.div
						className="rounded-[23px] bg-background/95 border border-border/40 overflow-hidden"
						layout
						transition={{
							layout: { type: "spring", stiffness: 300, damping: 30 },
						}}
					>
						<input
							type="file"
							ref={fileInputRef}
							className="hidden"
							onChange={handleFileUpload}
							multiple
							accept="text/*,image/*,audio/*,.js,.ts,.tsx,.jsx,.json,.md,.css,.html,.py,.java,.c,.cpp"
						/>

						{/* Input Area */}
						<div className="p-3 sm:p-4">
							<motion.textarea
								ref={textareaRef}
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={handleKeyDown}
								onPaste={handlePaste}
								placeholder={isTTS ? "Text to speech..." : "Message Synapse"}
								className="w-full bg-transparent border-none outline-none resize-none min-h-[24px] text-sm leading-6 placeholder:text-muted-foreground"
								rows={1}
								style={{
									overflow: input.split("\n").length > 8 ? "auto" : "hidden",
								}}
							/>
						</div>

						{/* Bottom Bar - Controls */}
						<div className="px-3 sm:px-4 pb-3 sm:pb-4 flex items-center justify-between">
							<div className="flex items-center gap-2">
								{/* Attach Button */}
								<Button
									variant="outline"
									size="icon"
									onClick={() => fileInputRef.current?.click()}
									className="h-8 w-8 rounded-full border-border/50"
									title="Attach files"
								>
									<Plus size={16} />
								</Button>

								{/* Reasoning Select - Only show if model supports it */}
								{supportsReasoning && !isTTS && onUpdateSettings && (
									<AnimatedSelect
										value={settings.reasoningEffort}
										onValueChange={(value) =>
											onUpdateSettings({
												reasoningEffort: value as ReasoningEffort,
											})
										}
										options={reasoningOptions}
										compact
										side="top"
									/>
								)}

								{/* Tools Menu - shows when model supports tools */}
								{supportsTools && !isTTS && onUpdateSettings && (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												size="icon"
												className="h-8 w-8 rounded-full border-border/50"
												title="Tools"
											>
												<Wrench size={14} />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="start" className="w-56">
											<DropdownMenuLabel>AI Tools</DropdownMenuLabel>
											<DropdownMenuSeparator />

											<DropdownMenuCheckboxItem
												checked={settings.tools.webSearch}
												onCheckedChange={(checked) =>
													onUpdateSettings({
														tools: { ...settings.tools, webSearch: checked },
													})
												}
											>
												<Search size={14} className="mr-2" />
												Web Search
											</DropdownMenuCheckboxItem>

											<DropdownMenuCheckboxItem
												checked={settings.tools.imageGeneration}
												onCheckedChange={(checked) =>
													onUpdateSettings({
														tools: {
															...settings.tools,
															imageGeneration: checked,
														},
													})
												}
												disabled
											>
												Image Generation
												<Badge variant="outline" className="ml-2 text-[10px]">
													Soon
												</Badge>
											</DropdownMenuCheckboxItem>

											<DropdownMenuCheckboxItem
												checked={settings.tools.codeExecution}
												onCheckedChange={(checked) =>
													onUpdateSettings({
														tools: {
															...settings.tools,
															codeExecution: checked,
														},
													})
												}
												disabled
											>
												Code Execution
												<Badge variant="outline" className="ml-2 text-[10px]">
													Soon
												</Badge>
											</DropdownMenuCheckboxItem>
										</DropdownMenuContent>
									</DropdownMenu>
								)}
							</div>

							{/* Right Side - Send/Stop */}
							{isLoading ? (
								<Button
									onClick={onStop}
									size="icon"
									className="h-8 w-8 rounded-full"
								>
									<Square size={12} fill="currentColor" />
								</Button>
							) : (
								<Button
									onClick={() => handleSubmit()}
									disabled={!canSend}
									size="icon"
									className="h-8 w-8 rounded-full"
									title={
										isConvertingImage
											? "Converting image..."
											: isParsingImages
												? "Waiting for image parsing..."
												: undefined
									}
								>
									{isParsingImages || isConvertingImage ? (
										<Loader2 size={16} className="animate-spin" />
									) : (
										<ArrowUp size={16} strokeWidth={2.5} />
									)}
								</Button>
							)}
						</div>
					</motion.div>
				</div>
			</motion.div>

			<FilePreview
				attachment={previewAttachment}
				open={!!previewAttachment}
				onClose={() => setPreviewAttachment(null)}
			/>
		</div>
	);
}
