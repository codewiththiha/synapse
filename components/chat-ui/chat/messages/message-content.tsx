"use client";

import { motion } from "framer-motion";
import { StopCircle } from "lucide-react";
import { Message } from "@/lib/types";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { LoadingDots } from "@/components/shared/loading-dots";
import { fadeIn } from "@/lib/utils/motion-variants";

interface MessageContentProps {
	message: Message;
	isStreaming?: boolean;
}

export function MessageContent({ message, isStreaming }: MessageContentProps) {
	if (message.role === "user") {
		return <p className="whitespace-pre-wrap">{message.content}</p>;
	}

	// Show pending indicator when streaming but no content yet
	if (isStreaming && !message.content) {
		return <PendingToGenerate />;
	}

	// Show "Stopped" message when content is empty and not streaming (user cancelled)
	if (!message.content && !isStreaming) {
		return <StoppedMessage />;
	}

	return <MarkdownContent content={message.content} />;
}

// Simple 3-dot pending indicator using shared component
function PendingToGenerate() {
	return (
		<motion.div
			variants={fadeIn}
			initial="initial"
			animate="animate"
			className="py-1"
		>
			<LoadingDots size={8} />
		</motion.div>
	);
}

// Stopped message when user cancels before receiving response
function StoppedMessage() {
	return (
		<motion.div
			variants={fadeIn}
			initial="initial"
			animate="animate"
			className="flex items-center gap-2 text-muted-foreground text-sm italic"
		>
			<StopCircle size={14} />
			<span>Response stopped</span>
		</motion.div>
	);
}
