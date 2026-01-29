"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Layers, ArrowLeft, Trash2, Pencil } from "lucide-react";
import { useFlashcardStore } from "@/stores/use-flashcard-store";
import { AppLoader } from "@/components/shared/loading";
import { CardCover } from "@/components/cards/card-cover";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { RenameDialog } from "@/components/shared/dialogs";
import { toast } from "@/stores/use-global-store";
import Link from "next/link";

export default function CollectionPage() {
	const params = useParams();
	const router = useRouter();
	const collectionId = params.id as string;

	const {
		isInitialized,
		initializeFlashcards,
		covers,
		collections,
		currentCoverId,
		selectCover,
		deleteCover,
		togglePinCover,
		moveCoverToCollection,
		deleteCollection,
		renameCollection,
		getCardsByCover,
		updateCover,
	} = useFlashcardStore();

	const [showRenameDialog, setShowRenameDialog] = React.useState(false);
	const [renamingCover, setRenamingCover] = React.useState<{
		id: string;
		name: string;
	} | null>(null);

	// State for collection rename dialog (Requirements 1.1, 1.2)
	const [showCollectionRenameDialog, setShowCollectionRenameDialog] =
		React.useState(false);

	React.useEffect(() => {
		if (!isInitialized) {
			initializeFlashcards();
		}
	}, [isInitialized, initializeFlashcards]);

	const collection = collections.find((c) => c.id === collectionId);
	const collectionCovers = covers.filter(
		(c) => c.collectionId === collectionId,
	);

	const sortedCovers = [...collectionCovers].sort((a, b) => {
		if (a.isPinned && !b.isPinned) return -1;
		if (!a.isPinned && b.isPinned) return 1;
		return b.updatedAt - a.updatedAt;
	});

	const handleCoverClick = (coverId: string) => {
		selectCover(coverId);
	};

	const handleRemoveFromCollection = (coverId: string) => {
		moveCoverToCollection(coverId, null);
	};

	const handleRenameCover = (coverId: string) => {
		const cover = covers.find((c) => c.id === coverId);
		if (cover) {
			setRenamingCover({ id: cover.id, name: cover.name });
			setShowRenameDialog(true);
		}
	};

	const handleConfirmRename = (newName: string) => {
		if (renamingCover) {
			updateCover(renamingCover.id, { name: newName });
			toast({ description: "Card set renamed!" });
		}
	};

	// Handle collection rename (Requirements 1.1, 1.2)
	const handleConfirmCollectionRename = (newName: string) => {
		if (collection) {
			// Check if name is the same as current - skip if unchanged
			if (collection.name === newName.trim()) {
				return;
			}

			const success = renameCollection(collection.id, newName);
			if (success) {
				toast({ description: "Collection renamed!" });
			} else {
				toast({ description: "Name cannot be empty", variant: "destructive" });
			}
		}
	};

	const handleDeleteCollection = () => {
		if (collection) {
			deleteCollection(collection.id);
			router.push("/cards");
		}
	};

	if (!isInitialized) {
		return <AppLoader message="Loading Collection..." />;
	}

	if (!collection) {
		return (
			<div className="h-full flex flex-col items-center justify-center gap-4">
				<p className="text-muted-foreground">Collection not found</p>
				<Link href="/cards">
					<Button variant="outline">Back to Cards</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col bg-background">
			{/* Header */}
			<header className="h-14 flex items-center justify-between px-4 border-b shrink-0">
				<div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
					<Link href="/cards">
						<Button variant="ghost" size="sm" className="shrink-0">
							<ArrowLeft size={16} className="mr-1 md:mr-2" />
							<span className="hidden sm:inline">Back</span>
						</Button>
					</Link>
					<div className="flex items-center gap-2 min-w-0">
						<Layers size={18} className="text-primary shrink-0 md:w-5 md:h-5" />
						<h1 className="font-semibold text-sm md:text-base truncate">
							{collection.name}
						</h1>
						<span className="text-xs md:text-sm text-muted-foreground shrink-0">
							({collectionCovers.length})
						</span>
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{/* Rename button */}
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowCollectionRenameDialog(true)}
						className="hidden md:flex"
					>
						<Pencil size={16} className="mr-2" />
						Rename
					</Button>
					{/* Delete button only on desktop */}
					<Button
						variant="outline"
						size="sm"
						onClick={handleDeleteCollection}
						className="hidden md:flex text-destructive hover:text-destructive"
					>
						<Trash2 size={16} className="mr-2" />
						Delete Collection
					</Button>
					<ThemeToggle />
				</div>
			</header>

			{/* Main content */}
			<main className="flex-1 overflow-y-auto p-4 md:p-6">
				{/* Mobile action bar */}
				<div className="md:hidden mb-4 flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowCollectionRenameDialog(true)}
					>
						<Pencil size={14} className="mr-1.5" />
						Rename
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleDeleteCollection}
						className="text-destructive hover:text-destructive"
					>
						<Trash2 size={14} className="mr-1.5" />
						Delete Collection
					</Button>
				</div>

				{sortedCovers.length === 0 ? (
					<div className="h-full flex flex-col items-center justify-center gap-4">
						<p className="text-muted-foreground">
							No card sets in this collection
						</p>
						<p className="text-sm text-muted-foreground">
							Move card sets here from the main cards page
						</p>
					</div>
				) : (
					<div className="max-w-6xl mx-auto">
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
							{sortedCovers.map((cover, index) => {
								const coverCards = getCardsByCover(cover.id);
								return (
									<motion.div
										key={cover.id}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: index * 0.05 }}
									>
										<CardCover
											cover={cover}
											cards={coverCards}
											isSelected={currentCoverId === cover.id}
											onClick={() => handleCoverClick(cover.id)}
											onDelete={() => deleteCover(cover.id)}
											onRename={() => handleRenameCover(cover.id)}
											onTogglePin={() => togglePinCover(cover.id)}
											onMoveToCollection={() =>
												handleRemoveFromCollection(cover.id)
											}
										/>
									</motion.div>
								);
							})}
						</div>
					</div>
				)}
			</main>

			{/* Rename Cover Dialog */}
			<RenameDialog
				open={showRenameDialog}
				onOpenChange={setShowRenameDialog}
				title="Rename Card Set"
				currentName={renamingCover?.name || ""}
				placeholder="Card set name..."
				onConfirm={handleConfirmRename}
			/>

			{/* Rename Collection Dialog (Requirements 1.1, 1.2) */}
			<RenameDialog
				open={showCollectionRenameDialog}
				onOpenChange={setShowCollectionRenameDialog}
				title="Rename Collection"
				currentName={collection?.name || ""}
				placeholder="Collection name..."
				onConfirm={handleConfirmCollectionRename}
			/>
		</div>
	);
}
