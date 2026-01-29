"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Message, AppSettings, Attachment } from "@/lib/types";
import { PuterService } from "@/lib/services/puter-service";
import { AVAILABLE_MODELS } from "@/lib/constants";
import {
	useConcurrencyStore,
	MAX_CONCURRENT_CHATS,
} from "@/stores/use-concurrency-store";
import { toast } from "@/stores/use-global-store";
import { cardCommandService } from "@/lib/services/card-command";
import { plannerCommandService } from "@/lib/services/planner-command";
import { summarizationService } from "@/lib/services/summarization-service";
import { devLog } from "@/lib/utils/dev-logger";
import { getPuterErrorMessage } from "@/lib/utils/puter-helpers";
import { fileHelpers } from "@/lib/utils/file-helpers";

export function useChat(
	sessionId: string,
	messages: Message[],
	aiHistory: Message[],
	updateSessionMessages: (
		sessionId: string,
		updater: (prev: Message[]) => Message[],
	) => void,
	updateAIHistory: (
		sessionId: string,
		newAIHistory: Message[],
		summaryMessage?: Message,
	) => void,
	settings: AppSettings,
) {
	// Use Zustand store for concurrency management
	const isActive = useConcurrencyStore((state) =>
		state.isActive("chat", sessionId),
	);
	const startTask = useConcurrencyStore((state) => state.startTask);
	const endTask = useConcurrencyStore((state) => state.endTask);
	const cancelTask = useConcurrencyStore((state) => state.cancelTask);
	const canStart = useConcurrencyStore((state) => state.canStart);

	const [isLoading, setIsLoading] = useState(isActive);

	// Track if summarization is in progress to avoid duplicate triggers
	const summarizationInProgressRef = useRef(false);

	// Sync loading state with store
	useEffect(() => {
		setIsLoading(isActive);
	}, [isActive]);

	/**
	 * Trigger background summarization if threshold is reached
	 * Requirements: 2.1, 6.1
	 * Non-blocking - runs in background without affecting user interactions
	 *
	 * Key improvement: We now track the exact message count when summarization starts
	 * and use that to correctly remove messages even if more messages arrive during
	 * the summarization process.
	 */
	const triggerSummarizationIfNeeded = useCallback(
		async (currentAIHistory: Message[]) => {
			// Check if summarization should be triggered
			if (
				!summarizationService.shouldSummarize(
					sessionId,
					currentAIHistory.length,
				)
			) {
				return;
			}

			// Prevent duplicate triggers
			if (summarizationInProgressRef.current) {
				return;
			}

			summarizationInProgressRef.current = true;

			// DEBUG: Log summarization trigger
			devLog("=== SUMMARIZATION TRIGGERED ===");
			devLog("Session ID:", sessionId);
			devLog("AI History length at trigger:", currentAIHistory.length);

			try {
				// Get the oldest MESSAGE_THRESHOLD messages to summarize
				const threshold = summarizationService.getMessageThreshold();

				// IMPORTANT: Record the trigger index BEFORE starting summarization
				// This captures the exact state of the history when we started
				summarizationService.markSummarizationStart(
					sessionId,
					currentAIHistory.length,
				);

				const messagesToSummarize = currentAIHistory.slice(0, threshold);

				// Get existing summary if any
				const session = summarizationService.getState(sessionId);
				const existingSummary = session?.summaryMessageId
					? currentAIHistory.find((m) => m.id === session.summaryMessageId)
							?.content
					: undefined;

				// Call summarize in background (non-blocking)
				// Requirements: 1.3, 6.1
				const result = await summarizationService.summarize(
					sessionId,
					messagesToSummarize,
					existingSummary,
				);

				if (result.success && result.summary && result.summaryMessageId) {
					// Create summary message (Requirements: 5.1)
					const summaryMessage: Message = {
						id: result.summaryMessageId,
						role: "system",
						content: result.summary,
						timestamp: Date.now(),
					};

					// CRITICAL FIX: Use summarizedCount from result to determine how many
					// messages to remove. This ensures we remove exactly the messages that
					// were summarized, even if more messages arrived during summarization.
					const summarizedCount = result.summarizedCount ?? threshold;

					// Get the LATEST aiHistory from the store (may have grown during summarization)
					// We dynamically import to avoid circular dependencies
					const { useSessionsStore } =
						await import("@/stores/use-sessions-store");
					const latestSession = useSessionsStore
						.getState()
						.sessions.find((s) => s.id === sessionId);
					const latestAIHistory = latestSession?.aiHistory ?? currentAIHistory;

					// Calculate remaining messages: everything after the summarized messages
					// This handles the case where user sent more messages while summarizing
					const remainingMessages = latestAIHistory.slice(summarizedCount);

					// Update AI_History with summary + remaining messages
					// Requirements: 6.3 - Only update after successful completion
					const newAIHistory = [summaryMessage, ...remainingMessages];

					// DEBUG: Log summarization result
					devLog("=== SUMMARIZATION COMPLETE ===");
					devLog("Messages summarized:", summarizedCount);
					devLog("Latest AI History length:", latestAIHistory.length);
					devLog("Remaining messages:", remainingMessages.length);
					devLog("New AI History length:", newAIHistory.length);

					// Clear the trigger index since summarization completed
					summarizationService.clearSummarizationTriggerIndex(sessionId);

					updateAIHistory(sessionId, newAIHistory, summaryMessage);

					// Check for chained summarization (Requirements: 2.3)
					// If remaining messages still exceed threshold, trigger another cycle
					if (newAIHistory.length >= threshold) {
						// Reset flag and trigger again after a short delay
						summarizationInProgressRef.current = false;
						setTimeout(() => {
							triggerSummarizationIfNeeded(newAIHistory);
						}, 100);
						return;
					}
				} else {
					// Summarization failed or was cancelled, clear the trigger index
					summarizationService.clearSummarizationTriggerIndex(sessionId);
				}
			} catch (error) {
				console.error("Summarization error:", error);
				// Errors are handled by the service, state is preserved
				summarizationService.clearSummarizationTriggerIndex(sessionId);
			} finally {
				summarizationInProgressRef.current = false;
			}
		},
		[sessionId, updateAIHistory],
	);

	const currentModel = AVAILABLE_MODELS.find((m) => m.id === settings.modelId);
	const modelSupportsImages =
		currentModel?.capabilities?.supportsImages ?? false;

	// Handle AI chat with optimized streaming using requestAnimationFrame batching
	// Requirements: 4.3, 6.2 - Send aiHistory instead of messages to AI
	const handleAIChat = useCallback(
		async (historyToSend: Message[], targetSessionId: string) => {
			// Filter out messages with empty content before sending to AI
			// This prevents the "each message must have a 'content' property" error
			const cleanedHistory = historyToSend.filter(
				(msg) => msg.content && msg.content.trim() !== "",
			);

			// DEBUG: Log the raw AI history being sent
			devLog("=== AI HISTORY BEING SENT ===");
			devLog("Session ID:", targetSessionId);
			devLog("Message count:", cleanedHistory.length);
			devLog("=== PUTER AI REQUEST ===");
			devLog(
				"Messages being sent to AI:",
				JSON.stringify(
					cleanedHistory.map((m) => ({ role: m.role, content: m.content })),
					null,
					2,
				),
			);
			devLog("=== END PUTER AI REQUEST ===");

			const abortController = startTask("chat", targetSessionId);
			if (!abortController) {
				toast({
					title: "Concurrent limit reached",
					description: `Maximum ${MAX_CONCURRENT_CHATS} chats can run simultaneously.`,
					variant: "destructive",
				});
				return;
			}

			const assistantMsgId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

			// Add empty assistant message
			updateSessionMessages(targetSessionId, (prev) => [
				...prev,
				{
					id: assistantMsgId,
					role: "assistant",
					content: "",
					reasoning: "",
					timestamp: Date.now(),
					isStreaming: true,
				},
			]);

			// Accumulate chunks for batched updates (smoother streaming)
			let accumulatedContent = "";
			let accumulatedReasoning = "";
			let rafId: number | null = null;
			let pendingUpdate = false;

			const flushUpdate = () => {
				if (!pendingUpdate) return;

				updateSessionMessages(targetSessionId, (prev) =>
					prev.map((msg) => {
						if (msg.id === assistantMsgId) {
							return {
								...msg,
								content: accumulatedContent,
								reasoning: accumulatedReasoning || msg.reasoning,
								isStreaming: true,
							};
						}
						return msg;
					}),
				);
				pendingUpdate = false;
			};

			const scheduleUpdate = () => {
				if (rafId !== null) return;
				rafId = requestAnimationFrame(() => {
					rafId = null;
					flushUpdate();
				});
			};

			try {
				await PuterService.streamChat(
					cleanedHistory,
					settings,
					(textChunk, reasoningChunk) => {
						// Accumulate chunks instead of updating immediately
						if (textChunk) {
							accumulatedContent += textChunk;
						}
						if (reasoningChunk) {
							accumulatedReasoning += reasoningChunk;
						}
						pendingUpdate = true;
						scheduleUpdate();
					},
					abortController.signal,
				);

				// Cancel any pending RAF and do final flush
				if (rafId !== null) {
					cancelAnimationFrame(rafId);
					rafId = null;
				}
				flushUpdate();

				// Mark as complete and add model ID for successful response
				updateSessionMessages(targetSessionId, (prev) =>
					prev.map((msg) =>
						msg.id === assistantMsgId
							? { ...msg, isStreaming: false, modelId: settings.modelId }
							: msg,
					),
				);

				// Trigger background summarization after successful response
				// Requirements: 2.1, 6.1 - Check and trigger summarization in background
				// The aiHistory will be updated by updateSessionMessages, so we need to
				// calculate the new history including the assistant response
				const assistantMsg: Message = {
					id: assistantMsgId,
					role: "assistant",
					content: accumulatedContent,
					reasoning: accumulatedReasoning || undefined,
					timestamp: Date.now(),
					modelId: settings.modelId, // Track which model generated this response
				};

				// Strip image data from history AFTER AI has processed it
				// This prevents broken image_url objects in subsequent requests
				const strippedHistory = cleanedHistory.map((msg) => ({
					...msg,
					attachments: fileHelpers.stripMessageAttachments(msg.attachments),
				}));
				const updatedAIHistory = [...strippedHistory, assistantMsg];

				// Update the aiHistory with stripped image data
				updateAIHistory(targetSessionId, updatedAIHistory);

				// Non-blocking summarization trigger
				triggerSummarizationIfNeeded(updatedAIHistory);
			} catch (error: unknown) {
				// Cancel any pending RAF
				if (rafId !== null) {
					cancelAnimationFrame(rafId);
				}

				console.error("Chat error:", error);

				// Get user-friendly error message
				const errorMessage = getPuterErrorMessage(error);

				// Check if this was a cancellation/abort
				const isAborted =
					errorMessage.includes("aborted") ||
					errorMessage.includes("stopped") ||
					errorMessage.includes("cancelled") ||
					(error instanceof Error && error.name === "AbortError");

				if (isAborted) {
					// If user cancelled before receiving any content, mark as stopped
					// but keep the message to show "Response stopped" UI
					if (!accumulatedContent) {
						updateSessionMessages(targetSessionId, (prev) =>
							prev.map((msg) =>
								msg.id === assistantMsgId
									? { ...msg, content: "", isStreaming: false }
									: msg,
							),
						);

						// Also clean up aiHistory - remove any empty assistant messages
						// This prevents the "each message must have a 'content' property" error
						const { useSessionsStore } =
							await import("@/stores/use-sessions-store");
						const currentSession = useSessionsStore
							.getState()
							.sessions.find((s) => s.id === targetSessionId);
						if (currentSession?.aiHistory) {
							const cleanedAIHistory = currentSession.aiHistory.filter(
								(msg) => msg.content && msg.content.trim() !== "",
							);
							if (cleanedAIHistory.length !== currentSession.aiHistory.length) {
								updateAIHistory(targetSessionId, cleanedAIHistory);
							}
						}
					} else {
						// User cancelled but we have some content - keep it
						updateSessionMessages(targetSessionId, (prev) =>
							prev.map((msg) =>
								msg.id === assistantMsgId
									? {
											...msg,
											content: accumulatedContent,
											reasoning: accumulatedReasoning || undefined,
											isStreaming: false,
										}
									: msg,
							),
						);

						// Update aiHistory with partial content
						const partialAssistantMsg: Message = {
							id: assistantMsgId,
							role: "assistant",
							content: accumulatedContent,
							reasoning: accumulatedReasoning || undefined,
							timestamp: Date.now(),
							modelId: settings.modelId, // Track model even for partial responses
						};
						const strippedHistory = cleanedHistory.map((msg) => ({
							...msg,
							attachments: fileHelpers.stripMessageAttachments(msg.attachments),
						}));
						updateAIHistory(targetSessionId, [
							...strippedHistory,
							partialAssistantMsg,
						]);
					}

					toast({
						title: "Request Stopped",
						description: accumulatedContent
							? "Response was stopped. Partial content saved."
							: "The request was stopped.",
					});
				} else if (
					errorMessage.includes("flagged") ||
					errorMessage.includes("moderation")
				) {
					// Remove failed assistant message for moderation errors
					updateSessionMessages(targetSessionId, (prev) => {
						const failedIndex = prev.findIndex(
							(msg) => msg.id === assistantMsgId,
						);
						if (failedIndex === -1) return prev;
						return prev.slice(0, failedIndex);
					});

					toast({
						title: "Content Moderation Failed",
						description: "Your message was flagged. Please try rephrasing.",
						variant: "destructive",
					});
				} else if (errorMessage.includes("must have a 'content' property")) {
					// Handle empty content error - clean up aiHistory and retry silently
					const { useSessionsStore } =
						await import("@/stores/use-sessions-store");
					const currentSession = useSessionsStore
						.getState()
						.sessions.find((s) => s.id === targetSessionId);
					if (currentSession?.aiHistory) {
						const cleanedAIHistory = currentSession.aiHistory.filter(
							(msg) => msg.content && msg.content.trim() !== "",
						);
						updateAIHistory(targetSessionId, cleanedAIHistory);
					}

					// Remove the failed assistant message
					updateSessionMessages(targetSessionId, (prev) => {
						const failedIndex = prev.findIndex(
							(msg) => msg.id === assistantMsgId,
						);
						if (failedIndex === -1) return prev;
						return prev.slice(0, failedIndex);
					});

					toast({
						title: "Error",
						description:
							"There was an issue with the conversation history. Please try again.",
						variant: "destructive",
					});
				} else {
					// Remove failed assistant message for other errors
					updateSessionMessages(targetSessionId, (prev) => {
						const failedIndex = prev.findIndex(
							(msg) => msg.id === assistantMsgId,
						);
						if (failedIndex === -1) return prev;
						return prev.slice(0, failedIndex);
					});

					toast({
						title: "Error",
						description: errorMessage,
						variant: "destructive",
					});
				}
			} finally {
				endTask("chat", targetSessionId);
			}
		},
		[
			settings,
			updateSessionMessages,
			updateAIHistory,
			triggerSummarizationIfNeeded,
			startTask,
			endTask,
		],
	);

	// Handle TTS
	const handleTTS = useCallback(
		async (text: string, targetSessionId: string) => {
			const abortController = startTask("chat", targetSessionId);
			if (!abortController) {
				toast({
					title: "Concurrent limit reached",
					description: `Maximum ${MAX_CONCURRENT_CHATS} chats can run simultaneously.`,
					variant: "destructive",
				});
				return;
			}

			const assistantMsgId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

			updateSessionMessages(targetSessionId, (prev) => [
				...prev,
				{
					id: assistantMsgId,
					role: "assistant",
					content: "Generating audio...",
					timestamp: Date.now(),
				},
			]);

			try {
				const audioUrl = await PuterService.generateSpeech(
					text,
					settings.ttsModelId,
					settings.ttsVoice,
				);

				updateSessionMessages(targetSessionId, (prev) =>
					prev.map((msg) => {
						if (msg.id === assistantMsgId) {
							return {
								...msg,
								content: `"${text.slice(0, 100)}${text.length > 100 ? "..." : ""}"`,
								audioUrl,
							};
						}
						return msg;
					}),
				);

				toast({
					title: "Audio Generated",
					description: "Your text has been converted to speech.",
				});
			} catch (error: unknown) {
				console.error("TTS error:", error);
				const errorMessage =
					error instanceof Error ? error.message : String(error);

				updateSessionMessages(targetSessionId, (prev) =>
					prev.map((msg) => {
						if (msg.id === assistantMsgId) {
							return {
								...msg,
								content: `Error: ${errorMessage}`,
								error: true,
							};
						}
						return msg;
					}),
				);

				toast({
					title: "TTS Error",
					description: errorMessage || "Failed to generate speech",
					variant: "destructive",
				});
			} finally {
				endTask("chat", targetSessionId);
			}
		},
		[
			settings.ttsModelId,
			settings.ttsVoice,
			updateSessionMessages,
			startTask,
			endTask,
		],
	);

	// Send message handler
	// Requirements: 4.3, 6.2 - Use aiHistory for AI requests
	const handleSendMessage = useCallback(
		async (content: string, attachments?: Attachment[]) => {
			if (!content.trim() && !attachments?.length) return;

			// Check for @card command FIRST - intercept and route to CardCommandService
			// Requirements: 4.1, 4.2, 4.3, 4.4
			if (cardCommandService.isCardCommand(content)) {
				// Show instant "Processing..." toast
				toast({
					title: "Processing Card Command",
					description: "Analyzing your request...",
				});

				// Format conversation context - limit to last 10 messages to avoid token limits
				// Requirements: 1.4, 4.4
				const recentMessages = messages.slice(-10);
				const conversationContext = recentMessages
					.map((m) => {
						const role = m.role === "user" ? "User" : "Assistant";
						return `${role}: ${m.content}`;
					})
					.join("\n\n");

				// Process the @card command
				const result = await cardCommandService.processCommand({
					command: content,
					conversationContext,
				});

				// Show toast with AI's message from the result
				toast({
					title: result.success
						? "Card Generation Started"
						: "Card Command Error",
					description: result.message,
					variant: result.success ? "default" : "destructive",
				});

				// Return early to skip normal chat flow (don't add to history)
				return;
			}

			// Check for @planner command - intercept and route to PlannerCommandService
			if (plannerCommandService.isPlannerCommand(content)) {
				toast({
					title: "Processing Planner Command",
					description: "Analyzing your request...",
				});

				// Format conversation context
				const recentMessages = messages.slice(-10);
				const conversationContext = recentMessages
					.map((m) => {
						const role = m.role === "user" ? "User" : "Assistant";
						return `${role}: ${m.content}`;
					})
					.join("\n\n");

				const result = await plannerCommandService.processCommand({
					command: content,
					conversationContext,
				});

				toast({
					title: result.success ? "Schedule Updated" : "Planner Command Error",
					description: result.message,
					variant: result.success ? "default" : "destructive",
				});

				return;
			}

			// Check concurrent limit
			if (!canStart("chat") && !isActive) {
				toast({
					title: "Concurrent limit reached",
					description: `Maximum ${MAX_CONCURRENT_CHATS} chats can run simultaneously. Please wait for one to finish.`,
					variant: "destructive",
				});
				return;
			}

			// Build the actual content to send to AI
			let aiContent = content;
			const displayAttachments: Attachment[] = [];
			const aiAttachments: Attachment[] = [];

			if (attachments) {
				const imageDescriptions: string[] = [];

				for (const attachment of attachments) {
					if (
						attachment.type === "image" &&
						attachment.parsedDescription &&
						!modelSupportsImages
					) {
						imageDescriptions.push(
							`[Image: ${attachment.name}]\n${attachment.parsedDescription}`,
						);
					}

					// For display/storage: strip image data to save space
					// Keep only metadata (name, type, size) for images
					displayAttachments.push(
						fileHelpers.stripAttachmentData({
							...attachment,
							parsedDescription: undefined,
							isParsing: undefined,
							parseError: undefined,
						}),
					);

					// For AI: keep the full attachment with data
					aiAttachments.push({
						...attachment,
						parsedDescription: undefined,
						isParsing: undefined,
						parseError: undefined,
					});
				}

				if (imageDescriptions.length > 0) {
					const imageContext = imageDescriptions.join("\n\n---\n\n");
					aiContent = `${imageContext}\n\n---\n\n[User Message]: ${content}`;
				}
			}

			// Message for display/storage (without image data)
			const userMsg: Message = {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				role: "user",
				content,
				attachments:
					displayAttachments.length > 0 ? displayAttachments : undefined,
				timestamp: Date.now(),
			};

			// Message for AI (with full image data)
			const aiUserMsg: Message = {
				...userMsg,
				content: aiContent,
				attachments: aiAttachments.length > 0 ? aiAttachments : undefined,
			};

			// Use aiHistory for AI requests (Requirements: 4.3, 6.2)
			// aiHistory contains summarized history + recent messages
			// Include summary message if exists
			const currentAIHistory = [...aiHistory];
			const historyToSend = [...currentAIHistory, aiUserMsg];

			// Add user message to session (updates both messages and aiHistory)
			updateSessionMessages(sessionId, (prev) => [...prev, userMsg]);

			if (settings.mode === "tts") {
				await handleTTS(content, sessionId);
			} else {
				await handleAIChat(historyToSend, sessionId);
			}
		},
		[
			messages,
			aiHistory,
			settings.mode,
			modelSupportsImages,
			sessionId,
			updateSessionMessages,
			handleAIChat,
			handleTTS,
			canStart,
			isActive,
		],
	);

	// Stop handler
	const handleStop = useCallback(() => {
		cancelTask("chat", sessionId);
	}, [sessionId, cancelTask]);

	// Regenerate handler
	// Requirements: 4.3 - Use aiHistory for regeneration
	const handleRegenerate = useCallback(
		(messageId: string) => {
			if (isLoading) return;

			const msgIndex = messages.findIndex((m) => m.id === messageId);
			if (msgIndex === -1) return;

			let lastUserIndex = -1;
			for (let i = msgIndex - 1; i >= 0; i--) {
				if (messages[i].role === "user") {
					lastUserIndex = i;
					break;
				}
			}

			if (lastUserIndex === -1) return;

			// Update display messages
			const newDisplayHistory = messages.slice(0, lastUserIndex + 1);
			updateSessionMessages(sessionId, () => newDisplayHistory);

			// For AI history, find the corresponding user message and use aiHistory up to that point
			// This preserves any summarization that has occurred
			const userMsgId = messages[lastUserIndex].id;
			const aiHistoryUserIndex = aiHistory.findIndex((m) => m.id === userMsgId);

			let historyToSend: Message[];
			if (aiHistoryUserIndex !== -1) {
				// Use aiHistory up to and including the user message
				historyToSend = aiHistory.slice(0, aiHistoryUserIndex + 1);
			} else {
				// Fallback to display messages if not found in aiHistory
				historyToSend = newDisplayHistory;
			}

			handleAIChat(historyToSend, sessionId);
		},
		[
			messages,
			aiHistory,
			isLoading,
			sessionId,
			updateSessionMessages,
			handleAIChat,
		],
	);

	return {
		isLoading,
		handleSendMessage,
		handleStop,
		handleRegenerate,
	};
}
