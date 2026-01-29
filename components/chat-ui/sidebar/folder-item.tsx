"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
	ChevronRight,
	Folder,
	FolderOpen,
	MoreHorizontal,
	Pencil,
	Trash2,
	Pin,
	PinOff,
} from "lucide-react";
import { ChatFolder, ChatSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ControlledInput } from "@/components/ui/form";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SessionItem } from "./session-item";
import { checkIsMobile } from "@/hooks/use-mobile";
import { inlineEditSchema, InlineEditSchema } from "@/lib/schemas/chat";

interface FolderItemProps {
	folder: ChatFolder;
	sessions: ChatSession[];
	allFolders: ChatFolder[];
	isExpanded: boolean;
	hasIncomingChat: boolean;
	currentSessionId: string;
	processingSessionId: string | null;
	movingSessionId: string | null;
	loadingSessions: Set<string>;
	onToggle: () => void;
	onRename: (newName: string) => void;
	onDelete: () => void;
	onTogglePin: () => void;
	onSelectSession: (id: string) => void;
	onDeleteSession: (id: string) => void;
	onTogglePinSession: (id: string) => void;
	onMoveSession: (sessionId: string, folderId: string | undefined) => void;
	onClose: () => void;
}

export function FolderItem({
	folder,
	sessions,
	allFolders,
	isExpanded,
	hasIncomingChat,
	currentSessionId,
	processingSessionId,
	movingSessionId,
	loadingSessions,
	onToggle,
	onRename,
	onDelete,
	onTogglePin,
	onSelectSession,
	onDeleteSession,
	onTogglePinSession,
	onMoveSession,
	onClose,
}: FolderItemProps) {
	const [isEditing, setIsEditing] = useState(false);

	const form = useForm<InlineEditSchema>({
		resolver: zodResolver(inlineEditSchema),
		defaultValues: { name: folder.name },
	});

	// Reset form when folder name changes or editing starts
	useEffect(() => {
		if (isEditing) {
			form.reset({ name: folder.name });
		}
	}, [isEditing, folder.name, form]);

	const handleRename = form.handleSubmit((data) => {
		onRename(data.name);
		setIsEditing(false);
	});

	const handleCancel = () => {
		form.reset({ name: folder.name });
		setIsEditing(false);
	};

	return (
		<div>
			<motion.div
				className="group flex items-center px-4 py-2 hover:bg-muted/50 transition-colors relative"
				animate={{
					backgroundColor: hasIncomingChat
						? "rgba(var(--primary), 0.1)"
						: "rgba(0, 0, 0, 0)",
				}}
			>
				{/* Glow effect when receiving chat */}
				{hasIncomingChat && (
					<motion.div
						className="absolute inset-0 bg-primary/20 rounded"
						initial={{ opacity: 0 }}
						animate={{ opacity: [0.2, 0.5, 0.2] }}
						transition={{ duration: 0.5, repeat: Infinity }}
					/>
				)}

				<button
					onClick={onToggle}
					className="flex items-center gap-2 flex-1 text-left relative z-10"
				>
					{folder.isPinned && (
						<Pin size={10} className="text-primary shrink-0" />
					)}
					<motion.div
						animate={{ rotate: isExpanded ? 90 : 0 }}
						transition={{ duration: 0.2 }}
					>
						<ChevronRight size={12} className="text-muted-foreground" />
					</motion.div>
					{isExpanded ? (
						<FolderOpen size={14} className="text-muted-foreground" />
					) : (
						<Folder size={14} className="text-muted-foreground" />
					)}
					{isEditing ? (
						<FormProvider {...form}>
							<form onSubmit={handleRename} className="flex-1">
								<ControlledInput<InlineEditSchema>
									name="name"
									className="h-6 text-sm py-0 px-1"
									autoFocus
									onClick={(e: React.MouseEvent) => e.stopPropagation()}
									onKeyDown={(e: React.KeyboardEvent) => {
										e.stopPropagation();
										if (e.key === "Enter") handleRename();
										if (e.key === "Escape") handleCancel();
									}}
									onBlur={() => {
										if (form.formState.isValid) {
											handleRename();
										} else {
											handleCancel();
										}
									}}
								/>
							</form>
						</FormProvider>
					) : (
						<span className="text-sm truncate">{folder.name}</span>
					)}
					<span className="text-[10px] text-muted-foreground ml-auto">
						{sessions.length}
					</span>
				</button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6 md:opacity-0 md:group-hover:opacity-100 transition-opacity relative z-10"
							onClick={(e) => e.stopPropagation()}
						>
							<MoreHorizontal size={12} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={onTogglePin}>
							{folder.isPinned ? (
								<>
									<PinOff size={12} className="mr-2" />
									Unpin
								</>
							) : (
								<>
									<Pin size={12} className="mr-2" />
									Pin to top
								</>
							)}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setIsEditing(true);
							}}
						>
							<Pencil size={12} className="mr-2" />
							Rename
						</DropdownMenuItem>
						<DropdownMenuItem onClick={onDelete} className="text-destructive">
							<Trash2 size={12} className="mr-2" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</motion.div>

			<AnimatePresence>
				{isExpanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className="pl-4 overflow-hidden"
					>
						{sessions.length === 0 ? (
							<div className="px-4 py-2 text-xs text-muted-foreground italic">
								Empty folder
							</div>
						) : (
							sessions.map((session) => (
								<SessionItem
									key={session.id}
									session={session}
									isActive={session.id === currentSessionId}
									isProcessing={processingSessionId === session.id}
									isMoving={movingSessionId === session.id}
									isGenerating={loadingSessions.has(session.id)}
									folders={allFolders}
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
							))
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
