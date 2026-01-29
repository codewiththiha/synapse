"use client";

/**
 * Sidebar Component
 * Session/folder management with virtualization for large lists
 * Polished mobile overlay with solid background
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { Sparkles, Volume2, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChatSession, ChatFolder, SessionType } from "@/lib/types";
import { useConcurrencyStore } from "@/stores/use-concurrency-store";
import { SidebarHeader } from "./sidebar-header";
import { SidebarActions } from "./sidebar-actions";
import { SidebarFooter } from "./sidebar-footer";
import { FolderItem } from "./folder-item";
import { SessionItem } from "./session-item";
import { checkIsMobile, useMobile } from "@/hooks/use-mobile";
import { SMOOTH_TWEEN } from "@/lib/constants/animations";

// Threshold for enabling virtualization
const VIRTUALIZATION_THRESHOLD = 50;

interface SidebarProps {
	isOpen: boolean;
	onClose: () => void;
	sessions: ChatSession[];
	folders: ChatFolder[];
	currentSessionId: string;
	onSelectSession: (id: string) => void;
	onDeleteSession: (id: string) => void;
	onNewChat: () => void;
	onClearAll: () => void;
	onCreateFolder: (name: string) => void;
	onDeleteFolder: (folderId: string) => void;
	onRenameFolder: (folderId: string, newName: string) => void;
	onMoveSession: (sessionId: string, folderId: string | undefined) => void;
	onTogglePinSession: (sessionId: string) => void;
	onTogglePinFolder: (folderId: string) => void;
	onOrganizeAll: () => void;
	isOrganizing?: boolean;
	organizingSessionIds?: string[];
	processingSessionId?: string | null;
	movingSession?: { sessionId: string; targetFolderId: string } | null;
	closeAllFolders?: boolean;
	onCloseAllFoldersHandled?: () => void;
	sessionType?: SessionType;
}

export function Sidebar({
	isOpen,
	onClose,
	sessions,
	folders,
	currentSessionId,
	onSelectSession,
	onDeleteSession,
	onNewChat,
	onClearAll,
	onCreateFolder,
	onDeleteFolder,
	onRenameFolder,
	onMoveSession,
	onTogglePinSession,
	onTogglePinFolder,
	onOrganizeAll,
	isOrganizing = false,
	organizingSessionIds = [],
	processingSessionId = null,
	movingSession = null,
	closeAllFolders = false,
	onCloseAllFoldersHandled,
	sessionType = "chat",
}: SidebarProps) {
	const sectionLabel = sessionType === "tts" ? "TTS Sessions" : "Chats";
	const SectionIcon = sessionType === "tts" ? Volume2 : MessageSquare;
	const isMobile = useMobile();

	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
		new Set(),
	);

	// Virtualization ref
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// Use Zustand store for loading sessions (reactive)
	const activeChats = useConcurrencyStore((state) => state.activeTasks.chat);
	const loadingSessions = useMemo(() => new Set(activeChats), [activeChats]);

	// Close all folders when signal received
	useEffect(() => {
		if (closeAllFolders) {
			const timer = setTimeout(() => {
				setExpandedFolders(new Set());
				onCloseAllFoldersHandled?.();
			}, 0);
			return () => clearTimeout(timer);
		}
	}, [closeAllFolders, onCloseAllFoldersHandled]);

	// Auto-expand folder when a chat is moving into it
	useEffect(() => {
		if (movingSession?.targetFolderId) {
			const timer = setTimeout(() => {
				setExpandedFolders((prev) => {
					const next = new Set(prev);
					next.add(movingSession.targetFolderId);
					return next;
				});
			}, 0);
			return () => clearTimeout(timer);
		}
	}, [movingSession]);

	const toggleFolder = (folderId: string) => {
		setExpandedFolders((prev) => {
			const next = new Set(prev);
			if (next.has(folderId)) {
				next.delete(folderId);
			} else {
				next.add(folderId);
			}
			return next;
		});
	};

	// Memoized sorted data
	const sortedFolders = useMemo(
		() =>
			[...folders].sort((a, b) => {
				if (a.isPinned && !b.isPinned) return -1;
				if (!a.isPinned && b.isPinned) return 1;
				return b.updatedAt - a.updatedAt;
			}),
		[folders],
	);

	const unorganizedSessions = useMemo(
		() =>
			sessions
				.filter((s) => !s.folderId)
				.sort((a, b) => {
					if (a.isPinned && !b.isPinned) return -1;
					if (!a.isPinned && b.isPinned) return 1;
					return b.updatedAt - a.updatedAt;
				}),
		[sessions],
	);

	const sessionsByFolder = useMemo(
		() =>
			sortedFolders.reduce(
				(acc, folder) => {
					acc[folder.id] = sessions
						.filter((s) => s.folderId === folder.id)
						.sort((a, b) => {
							if (a.isPinned && !b.isPinned) return -1;
							if (!a.isPinned && b.isPinned) return 1;
							return b.updatedAt - a.updatedAt;
						});
					return acc;
				},
				{} as Record<string, ChatSession[]>,
			),
		[sortedFolders, sessions],
	);

	// Virtualization for large session lists
	const shouldVirtualize =
		unorganizedSessions.length > VIRTUALIZATION_THRESHOLD;

	const virtualizer = useVirtualizer({
		count: unorganizedSessions.length,
		getScrollElement: () => scrollContainerRef.current,
		estimateSize: () => 60,
		overscan: 5,
		enabled: shouldVirtualize,
	});

	// Render session list (virtualized or not)
	const renderSessionList = () => {
		if (unorganizedSessions.length === 0 && sortedFolders.length === 0) {
			return (
				<div className="px-6 py-10 text-center">
					<p className="text-xs text-muted-foreground font-mono">
						No active logs found.
					</p>
				</div>
			);
		}

		if (!shouldVirtualize) {
			// Separate sessions into organizing and non-organizing groups
			const organizingSessions = unorganizedSessions.filter((s) =>
				organizingSessionIds.includes(s.id),
			);
			const nonOrganizingSessions = unorganizedSessions.filter(
				(s) => !organizingSessionIds.includes(s.id),
			);

			return (
				<>
					{/* Organizing sessions wrapper with rainbow border */}
					<AnimatePresence>
						{isOrganizing && organizingSessions.length > 0 && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="mx-2 my-1 rounded-lg overflow-hidden organizing-wrapper"
							>
								<AnimatePresence mode="popLayout">
									{organizingSessions.map((session) => (
										<SessionItem
											key={session.id}
											session={session}
											isActive={session.id === currentSessionId}
											isProcessing={processingSessionId === session.id}
											isMoving={movingSession?.sessionId === session.id}
											isGenerating={loadingSessions.has(session.id)}
											isOrganizing={true}
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
									))}
								</AnimatePresence>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Non-organizing sessions */}
					<AnimatePresence mode="popLayout">
						{nonOrganizingSessions.map((session) => (
							<SessionItem
								key={session.id}
								session={session}
								isActive={session.id === currentSessionId}
								isProcessing={processingSessionId === session.id}
								isMoving={movingSession?.sessionId === session.id}
								isGenerating={loadingSessions.has(session.id)}
								isOrganizing={false}
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
						))}
					</AnimatePresence>
				</>
			);
		}

		// Virtualized rendering (no organizing animation for performance)
		const virtualItems = virtualizer.getVirtualItems();

		return (
			<div
				style={{
					height: `${virtualizer.getTotalSize()}px`,
					width: "100%",
					position: "relative",
				}}
			>
				{virtualItems.map((virtualItem) => {
					const session = unorganizedSessions[virtualItem.index];
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
								isMoving={movingSession?.sessionId === session.id}
								isGenerating={loadingSessions.has(session.id)}
								isOrganizing={organizingSessionIds.includes(session.id)}
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
		);
	};

	return (
		<>
			{/* Mobile Overlay Backdrop */}
			<AnimatePresence>
				{isOpen && isMobile && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
						onClick={onClose}
					/>
				)}
			</AnimatePresence>

			{/* Sidebar Container */}
			<motion.div
				initial={false}
				animate={{
					x: isOpen ? 0 : -350,
					width: isOpen ? 350 : 0,
				}}
				transition={SMOOTH_TWEEN}
				className="fixed inset-y-0 left-0 z-50 bg-background border-r flex flex-col md:relative md:z-auto overflow-hidden"
			>
				<SidebarHeader onClose={onClose} />

				<SidebarActions
					sessions={sessions}
					isOrganizing={isOrganizing}
					onNewChat={onNewChat}
					onCreateFolder={onCreateFolder}
					onOrganizeAll={onOrganizeAll}
					onClose={onClose}
				/>

				{/* Organizing Banner */}
				<AnimatePresence>
					{isOrganizing && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							className="px-4 py-2 bg-primary/10 border-b overflow-hidden"
						>
							<div className="flex items-center gap-2 text-xs text-primary">
								<motion.div
									animate={{ rotate: 360 }}
									transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
								>
									<Sparkles size={12} />
								</motion.div>
								<span>AI is organizing your chats...</span>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Session List */}
				<div ref={scrollContainerRef} className="flex-1 overflow-auto">
					{/* Folders */}
					{sortedFolders.length > 0 && (
						<div className="py-2">
							{sortedFolders.map((folder) => (
								<FolderItem
									key={folder.id}
									folder={folder}
									sessions={sessionsByFolder[folder.id] || []}
									allFolders={folders}
									isExpanded={expandedFolders.has(folder.id)}
									hasIncomingChat={movingSession?.targetFolderId === folder.id}
									currentSessionId={currentSessionId}
									processingSessionId={processingSessionId}
									movingSessionId={movingSession?.sessionId || null}
									loadingSessions={loadingSessions}
									onToggle={() => toggleFolder(folder.id)}
									onRename={(newName) => onRenameFolder(folder.id, newName)}
									onDelete={() => onDeleteFolder(folder.id)}
									onTogglePin={() => onTogglePinFolder(folder.id)}
									onSelectSession={onSelectSession}
									onDeleteSession={onDeleteSession}
									onTogglePinSession={onTogglePinSession}
									onMoveSession={onMoveSession}
									onClose={onClose}
								/>
							))}
						</div>
					)}

					{/* Unorganized Sessions */}
					<div className="px-4 py-3 flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
						<SectionIcon size={10} />
						<span>{sectionLabel}</span>
						{isOrganizing && unorganizedSessions.length > 0 && (
							<motion.span
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								className="ml-auto text-primary"
							>
								organizing...
							</motion.span>
						)}
					</div>

					<div className="flex flex-col">{renderSessionList()}</div>
				</div>

				<SidebarFooter onClearAll={onClearAll} />
			</motion.div>
		</>
	);
}
