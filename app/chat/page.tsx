/**
 * Chat Page (Copilot-style)
 * New design with collapsible sidebar and transparent header
 */

"use client";

import { Suspense, useEffect } from "react";
import { useSessionsStore } from "@/stores/use-sessions-store";
import { NewChatShell } from "@/components/chat-ui/new-chat-shell";
import { AppLoader } from "@/components/shared/loading";

function ChatPageContent() {
	const isInitialized = useSessionsStore((s) => s.isInitialized);
	const initializeSessions = useSessionsStore((s) => s.initializeSessions);

	useEffect(() => {
		if (!isInitialized) {
			initializeSessions();
		}
	}, [isInitialized, initializeSessions]);

	if (!isInitialized) {
		return <AppLoader message="Loading Chat..." />;
	}

	return <NewChatShell sessionType="chat" />;
}

export default function ChatPage() {
	return (
		<Suspense fallback={<AppLoader message="Loading Chat..." />}>
			<ChatPageContent />
		</Suspense>
	);
}
