"use client";

import * as React from "react";
import { Message, AppSettings } from "@/lib/types";
import { AVAILABLE_MODELS } from "@/lib/constants";
import { MessageBubble } from "@/components/chat-ui/chat/messages/message-bubble";
import { EmptyState } from "@/components/chat-ui/chat/messages/empty-state";
import { LoadingIndicator } from "@/components/chat-ui/chat/messages/loading-indicator";

interface ChatMessagesProps {
	messages: Message[];
	isLoading: boolean;
	settings: AppSettings;
	onRegenerate: (messageId: string) => void;
}

export function ChatMessages({
	messages,
	isLoading,
	settings,
	onRegenerate,
}: ChatMessagesProps) {
	const messagesEndRef = React.useRef<HTMLDivElement>(null);
	const scrollContainerRef = React.useRef<HTMLDivElement>(null);

	const currentModel = AVAILABLE_MODELS.find((m) => m.id === settings.modelId);
	const isTTS = settings.mode === "tts";

	// Auto-scroll logic
	const scrollToBottom = (force = false) => {
		const container = scrollContainerRef.current;
		if (container) {
			const isNearBottom =
				container.scrollHeight - container.scrollTop - container.clientHeight <
				150;

			if (force || isNearBottom) {
				messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
			}
		}
	};

	React.useEffect(() => {
		scrollToBottom(true);
	}, [messages.length, isLoading]);

	return (
		<div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
			<div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10 space-y-6 sm:space-y-8">
				{messages.length === 0 && (
					<EmptyState isTTS={isTTS} currentModel={currentModel} />
				)}

				{messages.map((msg, idx) => {
					const isLast = idx === messages.length - 1;
					return (
						<MessageBubble
							key={msg.id}
							message={msg}
							isLast={isLast}
							isLoading={isLoading}
							onRegenerate={onRegenerate}
						/>
					);
				})}

				{isLoading && messages[messages.length - 1]?.role === "user" && (
					<LoadingIndicator />
				)}

				<div ref={messagesEndRef} className="h-4" />
			</div>
		</div>
	);
}
