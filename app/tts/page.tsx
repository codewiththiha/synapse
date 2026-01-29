/**
 * TTS Page (Copilot-style)
 * New design with collapsible sidebar and transparent header
 */

"use client";

import { Suspense, useEffect } from "react";
import { useSessionsStore } from "@/stores/use-sessions-store";
import { NewChatShell } from "@/components/chat-ui/new-chat-shell";
import { AppLoader } from "@/components/shared/loading";

function TtsPageContent() {
	const isInitialized = useSessionsStore((s) => s.isInitialized);
	const initializeSessions = useSessionsStore((s) => s.initializeSessions);

	useEffect(() => {
		if (!isInitialized) {
			initializeSessions();
		}
	}, [isInitialized, initializeSessions]);

	if (!isInitialized) {
		return <AppLoader message="Loading TTS..." />;
	}

	return <NewChatShell sessionType="tts" />;
}

export default function TtsPage() {
	return (
		<Suspense fallback={<AppLoader message="Loading TTS..." />}>
			<TtsPageContent />
		</Suspense>
	);
}
