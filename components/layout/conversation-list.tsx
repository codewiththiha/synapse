"use client";

/**
 * Conversation List (Copilot-style with folders)
 *
 * Displays folders with expandable sessions inside
 * Groups standalone sessions by date: Today, Yesterday, Previous 7 Days, etc.
 */

import * as React from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
	Folder,
	FolderOpen,
	MoreHorizontal,
	Trash2,
	Pin,
	PinOff,
	ChevronRight,
	Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatSession, ChatFolder } from "@/lib/types";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	LIQUID_TRANSITION,
	liquidListVariants,
	liquidFolderVariants,
} from "@/lib/constants/animations";

interface ConversationListProps {
	sessions: ChatSession[];
	folders: ChatFolder[];
	currentSessionId: string;
	loadingSessions?: Set<string>;
	organizingSessionIds?: string[];
	isOrganizing?: boolean;
	onSelectSession: (id: string) => void;
	onDeleteSession: (id: string) => void;
	onTogglePinSession: (id: string) => void;
	onDeleteFolder?: (id: string) => void;
	onRenameFolder?: (id: string, name: string) => void;
	onTogglePinFolder?: (id: string) => void;
}

// Group sessions by date
function groupSessionsByDate(sessions: ChatSession[]) {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
	const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
	const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

	const groups: { label: string; sessions: ChatSession[] }[] = [
		{ label: "Pinned", sessions: [] },
		{ label: "Today", sessions: [] },
		{ label: "Yesterday", sessions: [] },
		{ label: "Previous 7 Days", sessions: [] },
		{ label: "Previous 30 Days", sessions: [] },
		{ label: "Older", sessions: [] },
	];

	for (const session of sessions) {
		const date = new Date(session.updatedAt);

		if (session.isPinned) {
			groups[0].sessions.push(session);
		} else if (date >= today) {
			groups[1].sessions.push(session);
		} else if (date >= yesterday) {
			groups[2].sessions.push(session);
		} else if (date >= lastWeek) {
			groups[3].sessions.push(session);
		} else if (date >= lastMonth) {
			groups[4].sessions.push(session);
		} else {
			groups[5].sessions.push(session);
		}
	}

	// Filter out empty groups
	return groups.filter((g) => g.sessions.length > 0);
}

export function ConversationList({
	sessions,
	folders,
	currentSessionId,
	loadingSessions = new Set(),
	organizingSessionIds = [],
	isOrganizing = false,
	onSelectSession,
	onDeleteSession,
	onTogglePinSession,
	onDeleteFolder,
	onRenameFolder,
	onTogglePinFolder,
}: ConversationListProps) {
	const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(
		new Set(),
	);
	const [editingFolderId, setEditingFolderId] = React.useState<string | null>(
		null,
	);
	const [editingName, setEditingName] = React.useState("");

	// Find current session
	const currentSession = React.useMemo(
		() => sessions.find((s) => s.id === currentSessionId),
		[sessions, currentSessionId],
	);

	// Sort folders - pinned first, then by updatedAt
	const sortedFolders = React.useMemo(
		() =>
			[...folders].sort((a, b) => {
				if (a.isPinned && !b.isPinned) return -1;
				if (!a.isPinned && b.isPinned) return 1;
				return b.updatedAt - a.updatedAt;
			}),
		[folders],
	);

	// Get sessions for each folder
	const sessionsByFolder = React.useMemo(() => {
		const map: Record<string, ChatSession[]> = {};
		for (const folder of folders) {
			map[folder.id] = sessions
				.filter((s) => s.folderId === folder.id)
				.sort((a, b) => {
					if (a.isPinned && !b.isPinned) return -1;
					if (!a.isPinned && b.isPinned) return 1;
					return b.updatedAt - a.updatedAt;
				});
		}
		return map;
	}, [folders, sessions]);

	// Get standalone sessions (not in any folder)
	const standaloneSessions = React.useMemo(
		() => sessions.filter((s) => !s.folderId),
		[sessions],
	);

	const groups = React.useMemo(
		() => groupSessionsByDate(standaloneSessions),
		[standaloneSessions],
	);

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

	const handleStartRename = (folder: ChatFolder) => {
		setEditingFolderId(folder.id);
		setEditingName(folder.name);
	};

	const handleSaveRename = () => {
		if (editingFolderId && editingName.trim() && onRenameFolder) {
			onRenameFolder(editingFolderId, editingName.trim());
		}
		setEditingFolderId(null);
		setEditingName("");
	};

	if (sessions.length === 0 && folders.length === 0) {
		return (
			<div className="text-sm text-muted-foreground text-center py-8">
				No conversations yet
			</div>
		);
	}

	return (
		<LayoutGroup>
			<div className="space-y-3">
				{/* Folders Section */}
				{sortedFolders.length > 0 && (
					<div className="space-y-1">
						{sortedFolders.map((folder) => {
							const isExpanded = expandedFolders.has(folder.id);
							const folderSessions = sessionsByFolder[folder.id] || [];
							const isEditing = editingFolderId === folder.id;

							return (
								<div key={folder.id}>
									{/* Folder Header */}
									{(() => {
										const hasSelectedSession =
											currentSession?.folderId === folder.id;
										const showAsOpen = isExpanded || hasSelectedSession;

										return (
											<div
												className={cn(
													"group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
													"hover:bg-muted/50",
												)}
											>
												<button
													onClick={() => toggleFolder(folder.id)}
													className="flex items-center gap-2 flex-1 min-w-0"
												>
													<motion.div
														animate={{ rotate: showAsOpen ? 90 : 0 }}
														transition={{ duration: 0.2 }}
													>
														<ChevronRight
															size={12}
															className="text-muted-foreground"
														/>
													</motion.div>
													{showAsOpen ? (
														<FolderOpen
															size={14}
															className="text-muted-foreground shrink-0"
														/>
													) : (
														<Folder
															size={14}
															className="text-muted-foreground shrink-0"
														/>
													)}
													{folder.isPinned && (
														<Pin size={10} className="text-primary shrink-0" />
													)}
													{isEditing ? (
														<input
															type="text"
															value={editingName}
															onChange={(e) => setEditingName(e.target.value)}
															onBlur={handleSaveRename}
															onKeyDown={(e) => {
																if (e.key === "Enter") handleSaveRename();
																if (e.key === "Escape") {
																	setEditingFolderId(null);
																	setEditingName("");
																}
															}}
															autoFocus
															className="flex-1 text-sm bg-transparent border-b border-primary outline-none"
															onClick={(e) => e.stopPropagation()}
														/>
													) : (
														<span className="text-sm truncate">
															{folder.name}
														</span>
													)}
													<span className="text-[10px] text-muted-foreground ml-auto">
														{folderSessions.length}
													</span>
												</button>

												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<button
															onClick={(e) => e.stopPropagation()}
															className={cn(
																"p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
																"hover:bg-muted",
															)}
														>
															<MoreHorizontal size={14} />
														</button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end" className="w-40">
														{onTogglePinFolder && (
															<DropdownMenuItem
																onClick={() => onTogglePinFolder(folder.id)}
															>
																{folder.isPinned ? (
																	<>
																		<PinOff size={14} className="mr-2" />
																		Unpin
																	</>
																) : (
																	<>
																		<Pin size={14} className="mr-2" />
																		Pin
																	</>
																)}
															</DropdownMenuItem>
														)}
														{onRenameFolder && (
															<DropdownMenuItem
																onClick={() => handleStartRename(folder)}
															>
																<Pencil size={14} className="mr-2" />
																Rename
															</DropdownMenuItem>
														)}
														{onDeleteFolder && (
															<>
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	onClick={() => onDeleteFolder(folder.id)}
																	className="text-destructive"
																>
																	<Trash2 size={14} className="mr-2" />
																	Delete
																</DropdownMenuItem>
															</>
														)}
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										);
									})()}

									{/* Folder Contents */}
									{(() => {
										const hasSelectedSession =
											currentSession?.folderId === folder.id;
										const shouldShowContent = isExpanded || hasSelectedSession;

										return (
											<AnimatePresence>
												{shouldShowContent && (
													<motion.div
														initial="collapsed"
														animate="expanded"
														exit="collapsed"
														variants={liquidFolderVariants}
														transition={LIQUID_TRANSITION}
														className="overflow-hidden"
													>
														<div className="pl-6 space-y-0.5">
															<AnimatePresence mode="popLayout">
																{folderSessions.length === 0 ? (
																	<motion.div
																		key="empty"
																		variants={liquidListVariants}
																		initial="hidden"
																		animate="visible"
																		exit="exit"
																		className="px-2 py-1.5 text-xs text-muted-foreground italic"
																	>
																		Empty folder
																	</motion.div>
																) : isExpanded ? (
																	// Show all sessions when expanded
																	folderSessions.map((session, index) => (
																		<ConversationItem
																			key={session.id}
																			session={session}
																			isActive={session.id === currentSessionId}
																			isLoading={loadingSessions.has(
																				session.id,
																			)}
																			onSelect={() =>
																				onSelectSession(session.id)
																			}
																			onDelete={() =>
																				onDeleteSession(session.id)
																			}
																			onTogglePin={() =>
																				onTogglePinSession(session.id)
																			}
																			index={index}
																		/>
																	))
																) : (
																	// Show only selected session when collapsed
																	currentSession && (
																		<ConversationItem
																			key={currentSession.id}
																			session={currentSession}
																			isActive={true}
																			isLoading={loadingSessions.has(
																				currentSession.id,
																			)}
																			onSelect={() =>
																				onSelectSession(currentSession.id)
																			}
																			onDelete={() =>
																				onDeleteSession(currentSession.id)
																			}
																			onTogglePin={() =>
																				onTogglePinSession(currentSession.id)
																			}
																			index={0}
																		/>
																	)
																)}
															</AnimatePresence>
														</div>
													</motion.div>
												)}
											</AnimatePresence>
										);
									})()}
								</div>
							);
						})}
					</div>
				)}

				{/* Standalone Sessions grouped by date */}
				{/* First render organizing sessions in a special wrapper - without date labels */}
				<AnimatePresence mode="popLayout">
					{isOrganizing && organizingSessionIds.length > 0 && (
						<motion.div
							key="organizing-wrapper"
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={LIQUID_TRANSITION}
							className="organizing-wrapper rounded-lg overflow-hidden mb-2 p-1"
						>
							<div className="space-y-0.5">
								{groups.flatMap((group) =>
									group.sessions
										.filter((s) => organizingSessionIds.includes(s.id))
										.map((session, index) => (
											<ConversationItem
												key={session.id}
												session={session}
												isActive={session.id === currentSessionId}
												isLoading={loadingSessions.has(session.id)}
												isOrganizing={true}
												onSelect={() => onSelectSession(session.id)}
												onDelete={() => onDeleteSession(session.id)}
												onTogglePin={() => onTogglePinSession(session.id)}
												index={index}
											/>
										)),
								)}
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Non-organizing sessions grouped by date */}
				{groups.map((group) => {
					const nonOrganizingSessions = isOrganizing
						? group.sessions.filter((s) => !organizingSessionIds.includes(s.id))
						: group.sessions;
					if (nonOrganizingSessions.length === 0) return null;
					return (
						<div key={group.label}>
							<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 px-2">
								{group.label}
							</div>
							<div className="space-y-0.5">
								<AnimatePresence mode="popLayout">
									{nonOrganizingSessions.map((session, index) => (
										<ConversationItem
											key={session.id}
											session={session}
											isActive={session.id === currentSessionId}
											isLoading={loadingSessions.has(session.id)}
											isOrganizing={false}
											onSelect={() => onSelectSession(session.id)}
											onDelete={() => onDeleteSession(session.id)}
											onTogglePin={() => onTogglePinSession(session.id)}
											index={index}
										/>
									))}
								</AnimatePresence>
							</div>
						</div>
					);
				})}
			</div>
		</LayoutGroup>
	);
}

interface ConversationItemProps {
	session: ChatSession;
	isActive: boolean;
	isLoading?: boolean;
	isOrganizing?: boolean;
	index?: number;
	onSelect: () => void;
	onDelete: () => void;
	onTogglePin: () => void;
}

function ConversationItem({
	session,
	isActive,
	isLoading = false,
	isOrganizing = false,
	index = 0,
	onSelect,
	onDelete,
	onTogglePin,
}: ConversationItemProps) {
	const title = session.title || "New conversation";

	// Render text with per-character animation when organizing
	const renderTitle = () => {
		if (isOrganizing) {
			return (
				<span className="organize-wiggle-text text-sm truncate">
					{title.split("").map((char, i) => (
						<span key={i}>{char === " " ? "\u00A0" : char}</span>
					))}
				</span>
			);
		}
		return (
			<span className={cn("text-sm truncate", isLoading && "rainbow-text")}>
				{title}
			</span>
		);
	};

	return (
		<motion.div
			layoutId={`conversation-${session.id}`}
			layout="position"
			variants={liquidListVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
			transition={{
				layout: LIQUID_TRANSITION,
				...LIQUID_TRANSITION,
				delay: index * 0.03,
			}}
			className={cn(
				"group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
				isActive
					? "bg-white/10 dark:bg-white/10"
					: "hover:bg-muted/50 text-foreground",
			)}
		>
			<button onClick={onSelect} className="flex-1 text-left min-w-0">
				<div className="flex items-center gap-1.5">
					{session.isPinned && (
						<Pin size={10} className="text-primary shrink-0" />
					)}
					{renderTitle()}
				</div>
			</button>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						onClick={(e) => e.stopPropagation()}
						className={cn(
							"p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
							"hover:bg-muted",
						)}
					>
						<MoreHorizontal size={14} />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<DropdownMenuItem onClick={onTogglePin}>
						{session.isPinned ? (
							<>
								<PinOff size={14} className="mr-2" />
								Unpin
							</>
						) : (
							<>
								<Pin size={14} className="mr-2" />
								Pin
							</>
						)}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={onDelete} className="text-destructive">
						<Trash2 size={14} className="mr-2" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</motion.div>
	);
}
