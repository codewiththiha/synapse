"use client";

import { motion } from "framer-motion";
import {
	ChevronRight,
	MoreHorizontal,
	Trash2,
	Pin,
	PinOff,
	Folder,
	X,
	Loader2,
	Sparkles,
} from "lucide-react";
import { ChatSession, ChatFolder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { alert } from "@/stores/use-global-store";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SessionItemProps {
	session: ChatSession;
	isActive: boolean;
	isProcessing: boolean;
	isMoving: boolean;
	isGenerating: boolean;
	isOrganizing?: boolean;
	folders: ChatFolder[];
	onSelect: () => void;
	onDelete: () => void;
	onTogglePin: () => void;
	onMoveToFolder: (folderId: string | undefined) => void;
}

export function SessionItem({
	session,
	isActive,
	isProcessing,
	isMoving,
	isGenerating,
	isOrganizing = false,
	folders,
	onSelect,
	onDelete,
	onTogglePin,
	onMoveToFolder,
}: SessionItemProps) {
	const handleDelete = () => {
		alert({
			title: "Delete Chat?",
			description: "This action cannot be undone.",
			confirmLabel: "Delete",
			variant: "destructive",
			onConfirm: onDelete,
		});
	};

	return (
		<motion.div
			initial={{ opacity: 0, x: -20 }}
			animate={{
				opacity: isMoving ? 0 : 1,
				x: isMoving ? 50 : 0,
				scale: isMoving ? 0.8 : 1,
			}}
			exit={{ opacity: 0, x: 20, height: 0 }}
			transition={{ duration: 0.3 }}
			layout
			className={`group relative flex items-center border-b transition-colors ${
				isActive
					? "bg-primary text-primary-foreground"
					: "bg-transparent hover:bg-muted"
			} ${isOrganizing ? "organize-wiggle" : ""}`}
		>
			{/* Glow effect when processing */}
			{isProcessing && (
				<motion.div
					className="absolute inset-0 bg-primary/20 rounded"
					animate={{
						opacity: [0.2, 0.5, 0.2],
						scale: [1, 1.02, 1],
					}}
					transition={{
						duration: 1.5,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			)}

			<button
				onClick={onSelect}
				className="flex-1 text-left px-4 py-3 flex items-center gap-3 overflow-hidden relative z-10"
			>
				{session.isPinned && (
					<Pin size={10} className="text-primary shrink-0" />
				)}
				<motion.span
					initial={false}
					animate={{ opacity: isActive ? 1 : 0 }}
					className="text-xs font-mono shrink-0 group-hover:opacity-50"
				>
					<ChevronRight size={12} />
				</motion.span>
				<div className="flex flex-col min-w-0">
					<span
						className={`truncate text-sm ${isActive ? "font-medium" : "font-normal"}`}
					>
						{session.title || "Untitled Sequence"}
					</span>
					<span
						className={`text-[10px] uppercase tracking-wider ${
							isActive ? "text-primary-foreground/60" : "text-muted-foreground"
						}`}
					>
						{new Date(session.updatedAt).toLocaleDateString()}
					</span>
				</div>

				{/* Generating indicator */}
				{isGenerating && (
					<motion.div
						initial={{ opacity: 0, scale: 0 }}
						animate={{ opacity: 1, scale: 1 }}
						className="ml-auto shrink-0"
						title="AI is responding..."
					>
						<Loader2
							size={14}
							className={`animate-spin ${isActive ? "text-primary-foreground" : "text-primary"}`}
						/>
					</motion.div>
				)}

				{/* Processing indicator (for organization) */}
				{isProcessing && !isGenerating && (
					<motion.div
						initial={{ opacity: 0, scale: 0 }}
						animate={{ opacity: 1, scale: 1 }}
						className="ml-auto"
					>
						<Sparkles size={12} className="text-primary animate-pulse" />
					</motion.div>
				)}
			</button>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="mx-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity h-7 w-7"
						onClick={(e) => e.stopPropagation()}
					>
						<MoreHorizontal size={14} />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48">
					<DropdownMenuItem onClick={onTogglePin}>
						{session.isPinned ? (
							<>
								<PinOff size={14} className="mr-2" />
								Unpin
							</>
						) : (
							<>
								<Pin size={14} className="mr-2" />
								Pin to top
							</>
						)}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					{folders.length > 0 && (
						<>
							<DropdownMenuItem
								disabled
								className="text-xs text-muted-foreground"
							>
								Move to folder
							</DropdownMenuItem>
							{folders.map((folder) => (
								<DropdownMenuItem
									key={folder.id}
									onClick={() => onMoveToFolder(folder.id)}
								>
									<Folder size={14} className="mr-2" />
									{folder.name}
								</DropdownMenuItem>
							))}
							{session.folderId && (
								<DropdownMenuItem onClick={() => onMoveToFolder(undefined)}>
									<X size={14} className="mr-2" />
									Remove from folder
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
						</>
					)}
					<DropdownMenuItem onClick={handleDelete} className="text-destructive">
						<Trash2 size={14} className="mr-2" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{isActive && (
				<motion.div
					layoutId="activeIndicator"
					className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary-foreground z-20"
					transition={{ type: "spring", stiffness: 500, damping: 30 }}
				/>
			)}
		</motion.div>
	);
}
