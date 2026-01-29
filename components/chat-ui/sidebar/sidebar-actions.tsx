"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, FolderPlus, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ControlledInput } from "@/components/ui/form";
import { toast } from "@/stores/use-global-store";
import { ChatSession } from "@/lib/types";
import { checkIsMobile } from "@/hooks/use-mobile";
import {
	folderSchema,
	FolderSchema,
	folderDefaultValues,
} from "@/lib/schemas/dialog";

interface SidebarActionsProps {
	sessions: ChatSession[];
	isOrganizing: boolean;
	onNewChat: () => void;
	onCreateFolder: (name: string) => void;
	onOrganizeAll: () => void;
	onClose: () => void;
}

export function SidebarActions({
	sessions,
	isOrganizing,
	onNewChat,
	onCreateFolder,
	onOrganizeAll,
	onClose,
}: SidebarActionsProps) {
	const [isCreatingFolder, setIsCreatingFolder] = useState(false);

	const form = useForm<FolderSchema>({
		resolver: zodResolver(folderSchema),
		defaultValues: folderDefaultValues,
	});

	const handleCreateFolder = form.handleSubmit((data) => {
		onCreateFolder(data.name);
		form.reset(folderDefaultValues);
		setIsCreatingFolder(false);
	});

	const handleCancel = () => {
		form.reset(folderDefaultValues);
		setIsCreatingFolder(false);
	};

	const handleOrganize = () => {
		const unorganizedSessions = sessions.filter(
			(s) => !s.folderId && s.title && s.title !== "New Chat",
		);

		if (unorganizedSessions.length === 0) {
			toast({
				title: "Nothing to organize",
				description: "All chats are already organized or unnamed.",
			});
			return;
		}

		onOrganizeAll();
	};

	return (
		<>
			<div className="p-4 border-b bg-muted/30 shrink-0 space-y-2 relative z-60">
				<Button
					onClick={() => {
						onNewChat();
						if (checkIsMobile()) onClose();
					}}
					className="w-full justify-between"
					variant="outline"
				>
					<span className="text-sm font-medium">New Thread</span>
					<Plus size={16} />
				</Button>
				<div className="flex gap-2">
					<motion.div
						className="flex-1"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
					>
						<Button
							onClick={() => setIsCreatingFolder(true)}
							variant="outline"
							size="sm"
							className="w-full text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
						>
							<FolderPlus size={14} className="mr-1" />
							New Folder
						</Button>
					</motion.div>
					<motion.div
						className="flex-1"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
					>
						<Button
							onClick={handleOrganize}
							variant="outline"
							size="sm"
							className="w-full text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
							title="AI Organize"
							disabled={isOrganizing}
						>
							{isOrganizing ? (
								<Loader2 size={14} className="mr-1 animate-spin" />
							) : (
								<Sparkles size={14} className="mr-1" />
							)}
							{isOrganizing ? "Working..." : "Organize"}
						</Button>
					</motion.div>
				</div>
			</div>

			{/* Create Folder Input */}
			<AnimatePresence>
				{isCreatingFolder && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className="px-4 py-2 border-b bg-muted/50 overflow-hidden relative z-60"
					>
						<FormProvider {...form}>
							<form onSubmit={handleCreateFolder} className="flex gap-2">
								<ControlledInput<FolderSchema>
									name="name"
									placeholder="Folder name"
									className="h-8 text-sm"
									autoFocus
									onKeyDown={(e) => {
										if (e.key === "Escape") handleCancel();
									}}
								/>
								<Button
									type="submit"
									size="sm"
									className="h-8"
									disabled={!form.formState.isValid}
								>
									Add
								</Button>
							</form>
						</FormProvider>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
