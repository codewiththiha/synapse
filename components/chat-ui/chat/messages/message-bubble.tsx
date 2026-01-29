"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { User, Bot, Volume2, Copy, Check, RotateCcw } from "lucide-react";
import { Message } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MessageContent } from "@/components/chat-ui/chat/messages/message-content";
import { ThinkingBlock } from "@/components/chat-ui/chat/messages/thinking-block";
import { AttachmentList } from "@/components/chat-ui/chat/input/attachment-list";
import { toast } from "@/stores/use-global-store";
import { getModelDisplayName } from "@/lib/utils/model-helpers";

interface MessageBubbleProps {
	message: Message;
	isLast: boolean;
	isLoading: boolean;
	onRegenerate: (messageId: string) => void;
}

export function MessageBubble({
	message,
	isLast,
	isLoading,
	onRegenerate,
}: MessageBubbleProps) {
	const [copiedId, setCopiedId] = React.useState<string | null>(null);
	const [expandedThinking, setExpandedThinking] = React.useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(message.content);
		setCopiedId(message.id);
		setTimeout(() => setCopiedId(null), 2000);

		toast({ description: "Copied to clipboard" });
	};

	// Check if this message is currently streaming/generating
	const isGenerating =
		message.isStreaming ||
		(isLoading && isLast && message.role === "assistant");

	return (
		<div
			className={`group flex gap-4 md:gap-6 ${
				message.role === "user" ? "flex-row-reverse" : "flex-row"
			}`}
		>
			{/* Avatar */}
			<div
				className={`shrink-0 w-8 h-8 rounded flex items-center justify-center mt-1 border ${
					message.role === "user"
						? "bg-primary text-primary-foreground border-transparent"
						: "bg-background border text-muted-foreground"
				}`}
			>
				{message.role === "user" ? (
					<User size={14} />
				) : message.audioUrl ? (
					<Volume2 size={14} />
				) : isGenerating ? (
					// Animated bot icon when generating
					<motion.div
						animate={{
							y: [0, -2, 0],
							rotate: [0, -5, 5, 0],
						}}
						transition={{
							duration: 1.2,
							repeat: Infinity,
							ease: "easeInOut",
						}}
					>
						<Bot size={14} />
					</motion.div>
				) : (
					<Bot size={14} />
				)}
			</div>

			{/* Content */}
			<div
				className={`flex flex-col min-w-0 max-w-[85%] ${
					message.role === "user" ? "items-end" : "items-start"
				}`}
			>
				{/* Timestamp */}
				<div className="flex items-center gap-2 mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
					<span>{message.role === "user" ? "You" : "Assistant"}</span>
					<span>•</span>
					<span>
						{new Date(message.timestamp).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
				</div>

				{/* Audio Player */}
				{message.audioUrl && (
					<div className="w-full max-w-sm mb-2 p-2 bg-muted border rounded-sm">
						<audio controls src={message.audioUrl} className="w-full h-8" />
					</div>
				)}

				{/* Message Bubble */}
				<div
					className={`relative px-4 py-3 rounded-sm ${
						message.role === "user"
							? "bg-muted"
							: "w-full pl-0 pt-0 bg-transparent"
					}`}
				>
					{/* Thinking Block */}
					{message.reasoning && message.role === "assistant" && (
						<ThinkingBlock
							content={message.reasoning}
							isExpanded={expandedThinking}
							onToggle={() => setExpandedThinking(!expandedThinking)}
						/>
					)}

					{/* Message Content */}
					<MessageContent
						message={message}
						isStreaming={message.isStreaming || (isLoading && isLast)}
					/>

					{/* Attachments */}
					{message.attachments && message.attachments.length > 0 && (
						<AttachmentList attachments={message.attachments} />
					)}
				</div>

				{/* Actions */}
				{message.role === "assistant" &&
					!isLoading &&
					!message.audioUrl &&
					message.content && (
						<div className="flex items-center gap-3 mt-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
							<Button
								variant="ghost"
								size="sm"
								onClick={handleCopy}
								className="h-7 text-xs"
							>
								{copiedId === message.id ? (
									<>
										<Check size={12} className="mr-1.5" />
										Copied
									</>
								) : (
									<>
										<Copy size={12} className="mr-1.5" />
										Copy
									</>
								)}
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onRegenerate(message.id)}
								className="h-7 text-xs"
							>
								<RotateCcw size={12} className="mr-1.5" />
								Regenerate
							</Button>
						</div>
					)}

				{/* Model Watermark - shows which model generated this response */}
				{message.role === "assistant" &&
					!isGenerating &&
					!message.error &&
					message.modelId &&
					message.content && (
						<div className="mt-1.5 text-[10px] text-muted-foreground/50 font-medium">
							via {getModelDisplayName(message.modelId)}
						</div>
					)}
			</div>
		</div>
	);
}
