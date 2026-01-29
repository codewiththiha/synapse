"use client";

/**
 * New Chat Shell (Copilot-inspired)
 *
 * Features:
 * - AppShell with collapsible sidebar
 * - Action buttons (New, Organize) in sidebar
 * - Qwen-style model selector on left of header
 * - Config button on right of header with floating panel
 * - Conversation list in sidebar
 * - Centered input with greeting in new chat state
 * - Double border input design
 */

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
	Settings2,
	X,
	Plus,
	ArrowUp,
	Image as ImageIcon,
	Music,
	FileText,
	Loader2,
	Check,
	AlertCircle,
} from "lucide-react";
import { useSessionsStore } from "@/stores/use-sessions-store";
import { useSettingsStore } from "@/stores/use-settings-store";
import { useConcurrencyStore } from "@/stores/use-concurrency-store";
import { useAuthStore } from "@/stores/use-auth-store";
import { AppShell } from "@/components/layout/app-shell";
import { ConversationList } from "@/components/layout/conversation-list";
import { ModelSelector, ModelOption } from "@/components/ui/model-selector";
import { ChatMessages } from "@/components/chat-ui/chat/messages/chat-messages";
import { ChatInput } from "@/components/chat-ui/chat/input/chat-input";
import { SettingsPanel as ModelConfigPanel } from "@/components/chat-ui/chat/header/settings-panel";
import { AIErrorBoundary } from "@/components/shared/error-boundary";
import { useChat } from "@/hooks/use-chat";
import { useMobile } from "@/hooks/use-mobile";
import { SessionType, ReasoningEffort, Attachment } from "@/lib/types";
import { AVAILABLE_MODELS, AVAILABLE_TTS_MODELS } from "@/lib/constants";
import { sortModels } from "@/lib/utils/model-helpers";
import { fileHelpers } from "@/lib/utils/file-helpers";
import { backgroundAI } from "@/lib/services/background-ai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedSelect } from "@/components/ui/animated-select";
import { cn } from "@/lib/utils";
import { SPRING_SNAPPY, SMOOTH_TWEEN } from "@/lib/constants/animations";
import { toast } from "@/stores/use-global-store";
import { FilePreview } from "@/components/chat-ui/chat/input/file-preview";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface NewChatShellProps {
	sessionType: SessionType;
}

export function NewChatShell({ sessionType }: NewChatShellProps) {
	return (
		<AIErrorBoundary>
			<NewChatShellInner sessionType={sessionType} />
		</AIErrorBoundary>
	);
}

function NewChatShellInner({ sessionType }: NewChatShellProps) {
	const searchParams = useSearchParams();
	const initialMessage = searchParams.get("message");
	const [messageHandled, setMessageHandled] = React.useState(false);
	const [showConfig, setShowConfig] = React.useState(false);
	const [newChatInput, setNewChatInput] = React.useState("");
	const [attachments, setAttachments] = React.useState<Attachment[]>([]);
	const [isConvertingImage, setIsConvertingImage] = React.useState(false);
	const [previewAttachment, setPreviewAttachment] =
		React.useState<Attachment | null>(null);
	const configRef = React.useRef<HTMLDivElement>(null);
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const isMobile = useMobile();

	const isTTS = sessionType === "tts";

	// Auth store for username
	const { user } = useAuthStore();

	// Sessions store
	const {
		sessions,
		folders,
		currentChatSessionId,
		currentTtsSessionId,
		selectSession,
		deleteSession,
		createNewSession,
		togglePinSession,
		togglePinFolder,
		deleteFolder,
		renameFolder,
		organizeAllChats,
		isOrganizing,
		organizingSessionIds,
		updateSessionMessages,
		updateAIHistory,
	} = useSessionsStore();

	// Settings store
	const { settings, updateSettings } = useSettingsStore();

	// Sync mode with sessionType
	React.useEffect(() => {
		if (settings.mode !== sessionType) {
			updateSettings({ mode: sessionType });
		}
	}, [settings.mode, sessionType, updateSettings]);

	// Get loading sessions from concurrency store
	const activeChats = useConcurrencyStore((state) => state.activeTasks.chat);
	const loadingSessions = React.useMemo(
		() => new Set(activeChats),
		[activeChats],
	);

	// Get current session
	const currentSessionId = isTTS ? currentTtsSessionId : currentChatSessionId;
	const currentSession = sessions.find((s) => s.id === currentSessionId);
	const messages = currentSession?.messages ?? [];
	const aiHistory = currentSession?.aiHistory ?? messages;

	// Filter sessions by type
	const filteredSessions = React.useMemo(
		() =>
			sessions.filter(
				(s) => s.type === sessionType || (!s.type && sessionType === "chat"),
			),
		[sessions, sessionType],
	);

	const filteredFolders = React.useMemo(
		() => folders.filter((f) => f.type === sessionType),
		[folders, sessionType],
	);

	// Check if there are sessions that can actually be organized
	// (not in a folder, has a non-default title)
	const hasItemsToOrganize = React.useMemo(() => {
		const defaultTitle = sessionType === "tts" ? "New TTS" : "New Chat";
		return filteredSessions.some(
			(s) => !s.folderId && s.title && s.title !== defaultTitle,
		);
	}, [filteredSessions, sessionType]);

	// Auto-create session if none exists for this type
	// This handles the case when Puter cloud mode is enabled and all sessions were deleted
	React.useEffect(() => {
		if (!currentSession && filteredSessions.length === 0) {
			createNewSession(sessionType);
		}
	}, [currentSession, filteredSessions.length, sessionType, createNewSession]);

	// Chat hook
	const { isLoading, handleSendMessage, handleStop, handleRegenerate } =
		useChat(
			currentSessionId,
			messages,
			aiHistory,
			updateSessionMessages,
			updateAIHistory,
			settings,
		);

	// Wrapper to ensure session exists before sending message
	const handleSendMessageSafe = React.useCallback(
		(content: string, attachments?: Attachment[]) => {
			// If no current session exists, create one first
			if (!currentSession) {
				createNewSession(sessionType);
				// The message will be sent after the session is created
				// We need to wait for the next render cycle
				setTimeout(() => {
					handleSendMessage(content, attachments);
				}, 0);
				return;
			}
			handleSendMessage(content, attachments);
		},
		[currentSession, sessionType, createNewSession, handleSendMessage],
	);

	// Model options for selector
	const modelOptions: ModelOption[] = React.useMemo(() => {
		const models = isTTS ? AVAILABLE_TTS_MODELS : AVAILABLE_MODELS;
		const sorted = sortModels(models, settings.modelSortOrder || "fi");
		return sorted.map((m) => ({
			id: m.id,
			name: m.name,
			description: m.description,
		}));
	}, [isTTS, settings.modelSortOrder]);

	const currentModelId = isTTS ? settings.ttsModelId : settings.modelId;

	const handleModelChange = (modelId: string) => {
		if (isTTS) {
			updateSettings({ ttsModelId: modelId });
		} else {
			updateSettings({ modelId: modelId });
		}
	};

	// Check if we're in new chat state (no messages)
	const isNewChatState = messages.length === 0 && !isLoading;

	// Get username for greeting
	const username = user?.username || "there";

	// Current model for checking capabilities
	const currentModel = AVAILABLE_MODELS.find((m) => m.id === settings.modelId);
	const supportsReasoning =
		currentModel?.capabilities?.supportsReasoning ?? false;
	const modelSupportsImages =
		currentModel?.capabilities?.supportsImages ?? false;

	// Check if any images are being parsed
	const isParsingImages = attachments.some((a) => a.isParsing);
	const canSend =
		(newChatInput.trim() || attachments.length > 0) &&
		!isParsingImages &&
		!isConvertingImage;

	// Reasoning effort options for AnimatedSelect
	const reasoningOptions = [
		{ value: "low", label: "Low" },
		{ value: "medium", label: "Medium" },
		{ value: "high", label: "High" },
		{ value: "xhigh", label: "Extra High" },
	];

	// Parse image attachment for text-only models
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

	// Add attachment helper
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

	// Handle file upload in new chat state
	const handleFileUpload = React.useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(e.target.files || []);
			if (files.length === 0) return;

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
		},
		[
			addAttachment,
			currentModel?.capabilities?.supportsAudio,
			modelSupportsImages,
		],
	);

	// Remove attachment
	const removeAttachment = (id: string) => {
		backgroundAI.cancelImageParsing(id);
		setAttachments((prev) => prev.filter((a) => a.id !== id));
	};

	// Get attachment icon
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

	// Handle new chat input submit
	const handleNewChatSubmit = () => {
		if (!canSend) return;
		handleSendMessageSafe(
			newChatInput,
			attachments.length ? attachments : undefined,
		);
		setNewChatInput("");
		setAttachments([]);
	};

	// Handle textarea auto-resize
	const calculateHeight = React.useCallback(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			const scrollHeight = textareaRef.current.scrollHeight;
			const minHeight = 24;
			const maxHeight = 120;
			const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
			textareaRef.current.style.height = `${newHeight}px`;
		}
	}, []);

	React.useEffect(() => {
		calculateHeight();
	}, [newChatInput, calculateHeight]);

	// Handle pending message from URL
	React.useEffect(() => {
		if (initialMessage && !isLoading && !messageHandled) {
			handleSendMessageSafe(initialMessage);
			setMessageHandled(true);
			window.history.replaceState({}, "", `/${sessionType}`);
		}
	}, [
		initialMessage,
		isLoading,
		messageHandled,
		handleSendMessageSafe,
		sessionType,
	]);

	// Close config panel when clicking outside
	React.useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (configRef.current && !configRef.current.contains(e.target as Node)) {
				setShowConfig(false);
			}
		};

		if (showConfig && !isMobile) {
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [showConfig, isMobile]);

	// Sidebar content - conversation list
	const sidebarContent = (
		<div className="space-y-4">
			<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
				Conversations
			</div>
			<ConversationList
				sessions={filteredSessions}
				folders={filteredFolders}
				currentSessionId={currentSessionId}
				loadingSessions={loadingSessions}
				organizingSessionIds={organizingSessionIds}
				isOrganizing={isOrganizing}
				onSelectSession={(id) => selectSession(id, sessionType)}
				onDeleteSession={deleteSession}
				onTogglePinSession={togglePinSession}
				onDeleteFolder={deleteFolder}
				onRenameFolder={renameFolder}
				onTogglePinFolder={togglePinFolder}
			/>
		</div>
	);

	// Mobile header content - left side (model selector next to menu)
	const mobileHeaderLeft = (
		<ModelSelector
			value={currentModelId}
			options={modelOptions}
			onChange={handleModelChange}
			compact
		/>
	);

	// Mobile header content - right side (config + new chat)
	const mobileHeaderRight = (
		<>
			<button
				onClick={() => setShowConfig(!showConfig)}
				className={cn(
					"p-2 rounded-lg transition-colors",
					showConfig
						? "bg-primary/10 text-primary"
						: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
				)}
			>
				<Settings2 size={18} />
			</button>
			<button
				onClick={() => createNewSession(sessionType)}
				className="p-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
			>
				<Plus size={20} />
			</button>
		</>
	);

	return (
		<>
			<AppShell
				sidebarContent={sidebarContent}
				onNewChat={() => createNewSession(sessionType)}
				onOrganize={() => organizeAllChats(sessionType)}
				isOrganizing={isOrganizing}
				hasItemsToOrganize={hasItemsToOrganize}
				mobileHeaderLeft={mobileHeaderLeft}
				mobileHeaderRight={mobileHeaderRight}
			>
				<div className="flex flex-col h-full relative">
					{/* Floating Header - Model Selector (left) + Config Button (right) - Desktop only */}
					{!isMobile && (
						<div className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none flex items-start justify-between">
							{/* Model Selector - Left */}
							<div className="pointer-events-auto">
								<ModelSelector
									value={currentModelId}
									options={modelOptions}
									onChange={handleModelChange}
								/>
							</div>

							{/* Config Button + Panel - Right */}
							<div ref={configRef} className="pointer-events-auto relative">
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											onClick={() => setShowConfig(!showConfig)}
											className={cn(
												"p-2 rounded-lg transition-colors",
												showConfig
													? "bg-primary/10 text-primary"
													: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
											)}
										>
											<Settings2 size={18} />
										</button>
									</TooltipTrigger>
									<TooltipContent side="bottom">Model Config</TooltipContent>
								</Tooltip>

								{/* Desktop: Floating config panel */}
								<AnimatePresence>
									{showConfig && (
										<motion.div
											initial={{ opacity: 0, y: -8, scale: 0.96 }}
											animate={{ opacity: 1, y: 0, scale: 1 }}
											exit={{ opacity: 0, y: -8, scale: 0.96 }}
											transition={{ duration: 0.15 }}
											className="absolute top-full right-0 mt-2 w-80 bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
										>
											<div className="flex items-center justify-between px-4 py-3 border-b">
												<span className="text-sm font-medium">
													Model Config
												</span>
												<button
													onClick={() => setShowConfig(false)}
													className="p-1 rounded hover:bg-muted transition-colors"
												>
													<X size={14} />
												</button>
											</div>
											<div className="p-4 max-h-[60vh] overflow-y-auto">
												<ModelConfigPanel
													settings={settings}
													onUpdateSettings={updateSettings}
													sessionType={sessionType}
													searchQuery=""
													onSearchChange={() => {}}
												/>
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						</div>
					)}

					{/* Mobile: Bottom sheet config panel */}
					<AnimatePresence>
						{showConfig && isMobile && (
							<>
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
									onClick={() => setShowConfig(false)}
								/>
								<motion.div
									initial={{ opacity: 0, y: "100%" }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: "100%" }}
									transition={SPRING_SNAPPY}
									className="fixed inset-x-4 bottom-4 top-auto z-50 bg-card border rounded-2xl shadow-xl max-h-[70vh] overflow-hidden"
								>
									<div className="flex items-center justify-between p-3 border-b">
										<span className="font-medium text-sm">Model Config</span>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => setShowConfig(false)}
											className="h-8 w-8"
										>
											<X size={18} />
										</Button>
									</div>
									<div className="p-4 overflow-y-auto">
										<ModelConfigPanel
											settings={settings}
											onUpdateSettings={updateSettings}
											sessionType={sessionType}
											searchQuery=""
											onSearchChange={() => {}}
										/>
									</div>
								</motion.div>
							</>
						)}
					</AnimatePresence>

					{/* Content area */}
					<div className="flex-1 flex flex-col overflow-hidden">
						{/* Messages area - only show when not new chat */}
						{!isNewChatState && (
							<ChatMessages
								messages={messages}
								isLoading={isLoading}
								settings={settings}
								onRegenerate={handleRegenerate}
							/>
						)}

						{/* Input with layout animation */}
						<LayoutGroup>
							<motion.div
								layout
								layoutId="chat-input-container"
								className={cn(
									"px-3 sm:px-4 w-full",
									isNewChatState
										? "flex-1 flex flex-col items-center justify-center"
										: "pb-3 sm:pb-4 md:pb-6 mt-auto",
								)}
								transition={SMOOTH_TWEEN}
							>
								{/* Input box - same width in both states */}
								<motion.div
									layout
									layoutId="chat-input-box"
									className="w-full max-w-3xl mx-auto"
									transition={SMOOTH_TWEEN}
								>
									{/* Greeting - left aligned above input, show on mobile with smaller font */}
									{isNewChatState && attachments.length === 0 && (
										<h1
											className={cn(
												"font-medium text-left text-foreground mb-3 sm:mb-4",
												isMobile ? "text-base" : "text-xl sm:text-2xl",
											)}
										>
											Hey {username}, what&apos;s on your mind today?
										</h1>
									)}

									{isNewChatState ? (
										/* New chat input */
										<div className="relative">
											{/* Attachments preview */}
											<AnimatePresence>
												{attachments.length > 0 && (
													<motion.div
														initial={{ opacity: 0, y: 10 }}
														animate={{ opacity: 1, y: 0 }}
														exit={{ opacity: 0, y: 10 }}
														className="mb-2 flex flex-wrap gap-2"
													>
														{attachments.map((attachment) => (
															<motion.div
																key={attachment.id}
																initial={{ opacity: 0, scale: 0.8 }}
																animate={{ opacity: 1, scale: 1 }}
																exit={{ opacity: 0, scale: 0.8 }}
																transition={{
																	type: "spring",
																	stiffness: 400,
																	damping: 25,
																}}
															>
																<Badge
																	variant={
																		attachment.parseError
																			? "destructive"
																			: "secondary"
																	}
																	className={`gap-2 pr-1 cursor-pointer hover:bg-muted-foreground/20 transition-colors ${attachment.isParsing ? "animate-pulse" : ""}`}
																	title={
																		attachment.parseError ||
																		(attachment.parsedDescription
																			? "Image parsed - Click to preview"
																			: "Click to preview")
																	}
																	onClick={() =>
																		setPreviewAttachment(attachment)
																	}
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

											<div className="rounded-3xl p-px bg-border/60 shadow-lg">
												<div className="rounded-[23px] bg-background/95 border border-border/40 overflow-hidden">
													<input
														type="file"
														ref={fileInputRef}
														className="hidden"
														onChange={handleFileUpload}
														multiple
														accept="text/*,image/*,audio/*,.js,.ts,.tsx,.jsx,.json,.md,.css,.html,.py,.java,.c,.cpp"
													/>

													<div className="p-3 sm:p-4">
														<textarea
															ref={textareaRef}
															value={newChatInput}
															onChange={(e) => setNewChatInput(e.target.value)}
															onKeyDown={(e) => {
																if (e.key === "Enter" && !e.shiftKey) {
																	e.preventDefault();
																	handleNewChatSubmit();
																}
															}}
															placeholder={
																isTTS ? "Text to speech..." : "Message Synapse"
															}
															className="w-full bg-transparent border-none outline-none resize-none min-h-[24px] text-sm leading-6 placeholder:text-muted-foreground"
															rows={1}
														/>
													</div>

													<div className="px-3 sm:px-4 pb-3 sm:pb-4 flex items-center justify-between">
														<div className="flex items-center gap-2">
															<Button
																variant="outline"
																size="icon"
																onClick={() => fileInputRef.current?.click()}
																className="h-8 w-8 rounded-full border-border/50"
																title="Attach files"
															>
																<Plus size={16} />
															</Button>

															{supportsReasoning && !isTTS && (
																<AnimatedSelect
																	value={settings.reasoningEffort}
																	onValueChange={(value) =>
																		updateSettings({
																			reasoningEffort: value as ReasoningEffort,
																		})
																	}
																	options={reasoningOptions}
																	compact
																	side="top"
																/>
															)}
														</div>

														<Button
															onClick={handleNewChatSubmit}
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
													</div>
												</div>
											</div>
										</div>
									) : (
										/* Active chat input */
										<ChatInput
											isLoading={isLoading}
											settings={settings}
											onSendMessage={handleSendMessageSafe}
											onStop={handleStop}
											onUpdateSettings={updateSettings}
											sessionType={sessionType}
										/>
									)}
								</motion.div>
							</motion.div>
						</LayoutGroup>
					</div>
				</div>
			</AppShell>

			<FilePreview
				attachment={previewAttachment}
				open={!!previewAttachment}
				onClose={() => setPreviewAttachment(null)}
			/>
		</>
	);
}
