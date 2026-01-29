"use client";

/**
 * Home Assistant
 * Draggable floating circle button with auto-expanding input for AI assistance
 *
 * Refactored to use:
 * - useFloatingAssistant hook for drag/position logic
 * - FloatingAssistantButton for the FAB
 * - AssistantInputShell for the animated container
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
	X,
	Send,
	Loader2,
	MessageSquare,
	Volume2,
	Layers,
	Calendar,
	Sparkles,
} from "lucide-react";
import { useGlobalStore, toast } from "@/stores/use-global-store";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { cardCommandService } from "@/lib/services/card-command";
import { plannerCommandService } from "@/lib/services/planner-command";
import { AI_CONFIGS } from "@/lib/services/ai-config";
import { AI_PROMPTS } from "@/lib/config/prompts";
import { cn } from "@/lib/utils";
import { useFloatingAssistant } from "@/hooks/use-floating-assistant";
import {
	FloatingAssistantButton,
	AssistantInputShell,
} from "@/components/ui/assistant";

const INPUT_MIN_WIDTH = 300;
const INPUT_MAX_WIDTH = 450;

type Suggestion = {
	type: "chat" | "tts" | "cards" | "card" | "planner";
	label: string;
	icon: React.ReactNode;
};

type Message = {
	role: "user" | "assistant";
	content: string;
};

const suggestions: Suggestion[] = [
	{ type: "chat", label: "Chat", icon: <MessageSquare size={14} /> },
	{ type: "tts", label: "TTS", icon: <Volume2 size={14} /> },
	{ type: "cards", label: "Cards", icon: <Layers size={14} /> },
	{ type: "card", label: "Card", icon: <Layers size={14} /> },
	{ type: "planner", label: "Planner", icon: <Calendar size={14} /> },
];

export function HomeAssistant() {
	const router = useRouter();
	const { setTransportText } = useGlobalStore();

	const {
		isExpanded,
		isDragging,
		buttonPos,
		inputPos,
		inputWidth,
		textareaRef,
		measureRef,
		buttonRef,
		setIsExpanded,
		handleDragStart,
		handleButtonClick,
		updateInputWidth,
	} = useFloatingAssistant({
		minWidth: INPUT_MIN_WIDTH,
		maxWidth: INPUT_MAX_WIDTH,
		placeholder: "Ask me anything or use @...",
	});

	const [input, setInput] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>(
		[],
	);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [conversation, setConversation] = useState<Message[]>([]);
	const [response, setResponse] = useState<string | null>(null);
	const [isStreaming, setIsStreaming] = useState(false);

	const isLoading = isProcessing || isStreaming;

	// Check for @ mentions
	useEffect(() => {
		const atIndex = input.lastIndexOf("@");
		if (atIndex !== -1) {
			const query = input.slice(atIndex + 1).toLowerCase();
			const filtered = suggestions.filter((s) =>
				s.label.toLowerCase().startsWith(query),
			);
			setFilteredSuggestions(filtered);
			setShowSuggestions(filtered.length > 0);
			setSelectedIndex(0);
		} else {
			setShowSuggestions(false);
		}
	}, [input]);

	// Update width when input changes
	useEffect(() => {
		updateInputWidth(input);
	}, [input, updateInputWidth]);

	// Auto-resize textarea height
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
		}
	}, [input, textareaRef]);

	const handleSelectSuggestion = async (suggestion: Suggestion) => {
		const atIndex = input.lastIndexOf("@");
		const beforeAt = input.slice(0, atIndex);
		const afterQuery = input.slice(atIndex).split(" ").slice(1).join(" ");
		const message = (beforeAt + afterQuery).trim();

		if (suggestion.type === "card") {
			const command = input.trim();
			setInput("");
			setIsExpanded(false);
			toast({
				title: "Processing Card Command",
				description: "Analyzing your request...",
			});
			const result = await cardCommandService.processCommand({ command });
			toast({
				title: result.success
					? "Card Generation Started"
					: "Card Command Error",
				description: result.message,
				variant: result.success ? "default" : "destructive",
			});
			return;
		}

		if (suggestion.type === "planner") {
			const command = input.trim();
			if (
				command.toLowerCase() === "@planner" ||
				command.toLowerCase() === "@plan" ||
				command.toLowerCase() === "@schedule"
			) {
				router.push("/planner");
				setInput("");
				setIsExpanded(false);
				return;
			}
			setInput("");
			setIsExpanded(false);
			toast({
				title: "Processing Planner Command",
				description: "Analyzing your request...",
			});
			const result = await plannerCommandService.processCommand({ command });
			toast({
				title: result.success ? "Schedule Updated" : "Planner Command Error",
				description: result.message,
				variant: result.success ? "default" : "destructive",
			});
			return;
		}

		if (message && suggestion.type !== "cards") {
			setTransportText(message);
		}

		const routes: Record<string, string> = {
			chat: "/chat",
			tts: "/tts",
			cards: "/cards",
		};
		router.push(routes[suggestion.type]);
		setIsExpanded(false);
	};

	const checkAndHandleMention = async (): Promise<boolean> => {
		const chatMatch = input.match(/@chat\s*(.*)/i);
		const ttsMatch = input.match(/@tts\s*(.*)/i);
		const cardsMatch = input.match(/@cards\s*(.*)/i);
		const cardMatch = input.match(/@card\s*(.*)/i);
		const plannerMatch = input.match(/@(?:planner|plan|schedule)\s*(.*)/i);

		if (plannerMatch && plannerCommandService.isPlannerCommand(input)) {
			const content = plannerMatch[1].trim();
			if (!content) {
				router.push("/planner");
				setInput("");
				setIsExpanded(false);
				return true;
			}
			setInput("");
			setIsExpanded(false);
			toast({
				title: "Processing Planner Command",
				description: "Analyzing your request...",
			});
			const result = await plannerCommandService.processCommand({
				command: input.trim(),
			});
			toast({
				title: result.success ? "Schedule Updated" : "Planner Command Error",
				description: result.message,
				variant: result.success ? "default" : "destructive",
			});
			return true;
		}

		if (cardMatch && cardCommandService.isCardCommand(input)) {
			setInput("");
			setIsExpanded(false);
			toast({
				title: "Processing Card Command",
				description: "Analyzing your request...",
			});
			const result = await cardCommandService.processCommand({
				command: input.trim(),
			});
			toast({
				title: result.success
					? "Card Generation Started"
					: "Card Command Error",
				description: result.message,
				variant: result.success ? "default" : "destructive",
			});
			return true;
		}

		if (chatMatch) {
			const message = chatMatch[1].trim();
			if (message) setTransportText(message);
			router.push("/chat");
			setIsExpanded(false);
			return true;
		}

		if (ttsMatch) {
			const message = ttsMatch[1].trim();
			if (message) setTransportText(message);
			router.push("/tts");
			setIsExpanded(false);
			return true;
		}

		if (cardsMatch) {
			router.push("/cards");
			setIsExpanded(false);
			return true;
		}

		return false;
	};

	const handleSendToAssistant = async () => {
		if (!input.trim() || isLoading) return;

		if (await checkAndHandleMention()) {
			setInput("");
			return;
		}

		const userMessage = input.trim();
		setInput("");
		setIsStreaming(true);
		setResponse("");

		const newConversation: Message[] = [
			...conversation,
			{ role: "user", content: userMessage },
		];
		setConversation(newConversation);

		try {
			if (typeof window !== "undefined" && window.puter) {
				const messages = [
					{ role: "system", content: AI_PROMPTS.homeAssistant.instruction },
					...newConversation.map((m) => ({ role: m.role, content: m.content })),
				];

				const stream = await window.puter.ai.chat(messages, {
					model: AI_CONFIGS.homeAssistant.model,
					max_tokens: AI_CONFIGS.homeAssistant.maxTokens,
					temperature: AI_CONFIGS.homeAssistant.temperature,
					stream: true,
				});

				let fullResponse = "";
				if (
					stream &&
					typeof stream === "object" &&
					Symbol.asyncIterator in stream
				) {
					for await (const chunk of stream as AsyncIterable<{
						text?: string;
					}>) {
						if (chunk?.text) {
							fullResponse += chunk.text;
							setResponse(fullResponse);
						}
					}
				}
				setConversation([
					...newConversation,
					{ role: "assistant", content: fullResponse },
				]);
			}
		} catch (error) {
			console.error("Assistant error:", error);
			setResponse(
				"Sorry, I couldn't process that. Try using @chat or @tts to get started!",
			);
		} finally {
			setIsStreaming(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (showSuggestions) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIndex((prev) =>
					prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
				);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIndex((prev) =>
					prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
				);
			} else if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				if (filteredSuggestions[selectedIndex])
					handleSelectSuggestion(filteredSuggestions[selectedIndex]);
			} else if (e.key === "Escape") {
				setShowSuggestions(false);
			}
		} else if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendToAssistant();
		} else if (e.key === "Escape") {
			setIsExpanded(false);
		}
	};

	const handleCancel = () => {
		setIsStreaming(false);
		setIsProcessing(false);
	};

	return (
		<>
			{/* Hidden span for measuring text width */}
			<span
				ref={measureRef}
				className="fixed invisible whitespace-pre text-sm"
				style={{ top: -9999, left: -9999 }}
			/>

			{/* Draggable button */}
			<FloatingAssistantButton
				ref={buttonRef}
				visible={!isExpanded}
				position={buttonPos}
				isLoading={isLoading}
				isDragging={isDragging}
				onClick={() => handleButtonClick(handleCancel, isLoading)}
				onPointerDown={handleDragStart}
			/>

			{/* Expanded input */}
			<AssistantInputShell
				isExpanded={isExpanded}
				buttonPos={buttonPos}
				inputPos={inputPos}
				inputWidth={inputWidth}
				minWidth={INPUT_MIN_WIDTH}
			>
				<motion.div
					className="bg-card border rounded-2xl shadow-lg flex flex-col"
					layout
					transition={{ duration: 0.2 }}
				>
					{/* Suggestions dropdown */}
					<AnimatePresence>
						{showSuggestions && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								className="border-b overflow-hidden"
							>
								<div className="p-1">
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
												{suggestion.type === "chat" && "Start a conversation"}
												{suggestion.type === "tts" && "Convert text to speech"}
												{suggestion.type === "cards" && "Browse flashcards"}
												{suggestion.type === "card" &&
													"Create flashcards with AI"}
												{suggestion.type === "planner" && "Schedule with AI"}
											</span>
										</button>
									))}
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Input area */}
					<div className="flex items-end gap-2 p-1.5 pl-4">
						<textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Ask me anything or use @..."
							rows={1}
							className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground min-w-0 resize-none py-2 max-h-[120px] overflow-y-auto"
							disabled={isLoading}
						/>
						<div className="flex items-center gap-1 shrink-0 pb-0.5">
							<Button
								size="icon"
								variant="ghost"
								onClick={() => setIsExpanded(false)}
								className="h-9 w-9 rounded-full"
							>
								<X size={18} />
							</Button>
							<Button
								size="icon"
								onClick={handleSendToAssistant}
								disabled={!input.trim() || isLoading}
								className="h-9 w-9 rounded-full"
							>
								{isLoading ? (
									<Loader2 size={16} className="animate-spin" />
								) : (
									<Send size={16} />
								)}
							</Button>
						</div>
					</div>

					{/* Response area */}
					<AnimatePresence>
						{(response || isStreaming) && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								className="border-t overflow-hidden"
							>
								<div className="p-3 max-h-[200px] overflow-y-auto relative">
									<div className="flex items-start gap-2">
										<Sparkles
											size={14}
											className="text-primary mt-0.5 shrink-0"
										/>
										<div className="flex-1 min-w-0 text-sm">
											{response ? (
												<MarkdownContent content={response} compact />
											) : (
												<span className="text-muted-foreground">
													Thinking...
												</span>
											)}
										</div>
									</div>
									{!isStreaming && response && (
										<button
											onClick={() => setResponse(null)}
											className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
										>
											<X size={12} />
										</button>
									)}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			</AssistantInputShell>
		</>
	);
}
