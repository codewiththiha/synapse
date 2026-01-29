"use client";

/**
 * Virtualized Session List
 * Uses @tanstack/react-virtual for efficient rendering of large session lists
 */

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence } from "framer-motion";
import { ChatSession, ChatFolder } from "@/lib/types";
import { SessionItem } from "./session-item";
import { checkIsMobile } from "@/hooks/use-mobile";

interface VirtualizedSessionListProps {
	sessions: ChatSession[];
	folders: ChatFolder[];
	currentSessionId: string;
	processingSessionId: string | null;
	movingSessionId: string | null;
	loadingSessions: Set<string>;
	onSelectSession: (id: string) => void;
	onDeleteSession: (id: string) => void;
	onTogglePinSession: (id: string) => void;
	onMoveSession: (sessionId: string, folderId: string | undefined) => void;
	onClose: () => void;
}

// Threshold for enabling virtualization
const VIRTUALIZATION_THRESHOLD = 50;

export function VirtualizedSessionList({
	sessions,
	folders,
	currentSessionId,
	processingSessionId,
	movingSessionId,
	loadingSessions,
	onSelectSession,
	onDeleteSession,
	onTogglePinSession,
	onMoveSession,
	onClose,
}: VirtualizedSessionListProps) {
	const parentRef = useRef<HTMLDivElement>(null);

	// Only virtualize if we have many sessions
	const shouldVirtualize = sessions.length > VIRTUALIZATION_THRESHOLD;

	const virtualizer = useVirtualizer({
		count: sessions.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 60, // Estimated row height
		overscan: 5, // Render 5 extra items above/below viewport
		enabled: shouldVirtualize,
	});

	// Non-virtualized rendering for small lists
	if (!shouldVirtualize) {
		return (
			<div className="flex flex-col">
				<AnimatePresence mode="popLayout">
					{sessions.map((session) => (
						<SessionItem
							key={session.id}
							session={session}
							isActive={session.id === currentSessionId}
							isProcessing={processingSessionId === session.id}
							isMoving={movingSessionId === session.id}
							isGenerating={loadingSessions.has(session.id)}
							folders={folders}
							onSelect={() => {
								onSelectSession(session.id);
								if (checkIsMobile()) onClose();
							}}
							onDelete={() => onDeleteSession(session.id)}
							onTogglePin={() => onTogglePinSession(session.id)}
							onMoveToFolder={(folderId) => onMoveSession(session.id, folderId)}
						/>
					))}
				</AnimatePresence>
			</div>
		);
	}

	// Virtualized rendering for large lists
	const virtualItems = virtualizer.getVirtualItems();

	return (
		<div
			ref={parentRef}
			className="flex-1 overflow-auto"
			style={{ contain: "strict" }}
		>
			<div
				style={{
					height: `${virtualizer.getTotalSize()}px`,
					width: "100%",
					position: "relative",
				}}
			>
				{virtualItems.map((virtualItem) => {
					const session = sessions[virtualItem.index];
					return (
						<div
							key={session.id}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: "100%",
								height: `${virtualItem.size}px`,
								transform: `translateY(${virtualItem.start}px)`,
							}}
						>
							<SessionItem
								session={session}
								isActive={session.id === currentSessionId}
								isProcessing={processingSessionId === session.id}
								isMoving={movingSessionId === session.id}
								isGenerating={loadingSessions.has(session.id)}
								folders={folders}
								onSelect={() => {
									onSelectSession(session.id);
									if (checkIsMobile()) onClose();
								}}
								onDelete={() => onDeleteSession(session.id)}
								onTogglePin={() => onTogglePinSession(session.id)}
								onMoveToFolder={(folderId) =>
									onMoveSession(session.id, folderId)
								}
							/>
						</div>
					);
				})}
			</div>
		</div>
	);
}
