"use client";

/**
 * Cards Page
 * Flashcard management with drag-drop, collections, and AI organization
 * Refactored to use useCardsPage hook and error boundaries
 */

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
	Sparkles,
	FolderOpen,
	Layers,
	Plus,
	Wand2,
	Loader2,
	BookOpen,
	Settings,
	MoreVertical,
	Pencil,
	Trash2,
	Home,
} from "lucide-react";
import { AppLoader } from "@/components/shared/loading";
import { CardGenerator } from "@/components/cards/card-generator";
import { Button } from "@/components/ui/button";
import { SettingsPanel } from "@/components/shared/settings-panel";
import {
	RenameDialog,
	InputDialog,
	SelectDialog,
} from "@/components/shared/dialogs";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CardCollection } from "@/lib/types/flashcard";
import { useMobile } from "@/hooks/use-mobile";
import { useCardsPage } from "@/hooks/use-cards-page";
import Link from "next/link";
import {
	DragDropProvider,
	DraggableCardCover,
	DroppableCollection,
	CollectionNameEditor,
	FolderIcon,
} from "@/components/cards/drag-drop";
import { AIErrorBoundary } from "@/components/shared/error-boundary";
import { ProfileButton } from "@/components/shared/auth";

// ============================================
// CollectionCard Component
// ============================================
interface CollectionCardProps {
	collection: CardCollection;
	coverCount: number;
	hasContents: boolean;
	isEditing: boolean;
	onNavigate: () => void;
	onStartEdit: () => void;
	onSaveEdit: (name: string) => void;
	onCancelEdit: () => void;
	onDelete: () => void;
}

function CollectionCard({
	collection,
	coverCount,
	hasContents,
	isEditing,
	onNavigate,
	onStartEdit,
	onSaveEdit,
	onCancelEdit,
	onDelete,
}: CollectionCardProps) {
	const [isDropTarget, setIsDropTarget] = React.useState(false);

	return (
		<DroppableCollection
			collection={collection}
			onDropTargetChange={setIsDropTarget}
		>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="group relative flex flex-col items-center cursor-pointer p-2"
				onClick={onNavigate}
			>
				<FolderIcon
					hasContents={hasContents}
					contentCount={coverCount}
					isOpen={isDropTarget}
					size="lg"
					className="mb-2"
				/>

				<div
					className="w-full text-center"
					onClick={(e) => e.stopPropagation()}
				>
					<CollectionNameEditor
						collection={collection}
						isEditing={isEditing}
						onStartEdit={onStartEdit}
						onSave={onSaveEdit}
						onCancel={onCancelEdit}
						onClick={onNavigate}
						className="font-medium text-sm line-clamp-2 break-words"
					/>
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100"
							onClick={(e) => {
								e.stopPropagation();
								e.preventDefault();
							}}
						>
							<MoreVertical size={14} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								onStartEdit();
							}}
						>
							<Pencil size={14} className="mr-2" />
							Rename
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								onDelete();
							}}
							className="text-destructive focus:text-destructive"
						>
							<Trash2 size={14} className="mr-2" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</motion.div>
		</DroppableCollection>
	);
}

// ============================================
// Main Page Export
// ============================================
export default function CardsPage() {
	return (
		<Suspense fallback={<AppLoader message="Loading Cards..." />}>
			<AIErrorBoundary>
				<CardsPageContent />
			</AIErrorBoundary>
		</Suspense>
	);
}

// ============================================
// Page Content (uses hook)
// ============================================
function CardsPageContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const isMobile = useMobile();

	// Use the extracted hook for all page logic
	const {
		// Data
		sortedCovers,
		sortedCollections,
		hasContent,
		isInitialized,
		isOrganizing,
		memos,
		currentCoverId,
		collections,
		covers,

		// Actions
		handleOrganizeAll,
		handleCreateCollection,
		handleMoveToCollection,
		handleSelectCollection,
		handleRenameCover,
		handleConfirmRename,
		handleCoverClick,
		handleDragDrop,
		handleCreateCollectionFromStack,

		// Collection editing
		editingCollectionId,
		handleStartCollectionEdit,
		handleSaveCollectionName,
		handleCancelCollectionEdit,

		// Dialog state
		showNewCollection,
		setShowNewCollection,
		showMoveDialog,
		setShowMoveDialog,
		showSettings,
		setShowSettings,
		showRenameDialog,
		setShowRenameDialog,
		renamingCover,
		showStackDialog,
		setShowStackDialog,
		setStackingCovers,

		// Store actions
		initializeFlashcards,
		deleteCover,
		togglePinCover,
		getCardsByCover,
		deleteCollection,
	} = useCardsPage();

	// Initialize on mount
	React.useEffect(() => {
		if (!isInitialized) {
			initializeFlashcards();
		}
	}, [isInitialized, initializeFlashcards]);

	// Handle ?cover= query param to auto-open a cover
	React.useEffect(() => {
		const coverParam = searchParams.get("cover");
		if (
			coverParam &&
			isInitialized &&
			covers.some((c) => c.id === coverParam)
		) {
			handleCoverClick(coverParam);
			window.history.replaceState({}, "", "/cards");
		}
	}, [searchParams, isInitialized, covers, handleCoverClick]);

	if (!isInitialized) {
		return <AppLoader message="Loading Cards..." />;
	}

	return (
		<DragDropProvider onDrop={handleDragDrop}>
			<div className="h-full flex flex-col bg-background">
				{/* Header */}
				<header className="h-14 flex items-center justify-between px-4 border-b shrink-0">
					<div className="flex items-center gap-3">
						<Link href="/">
							<Button variant="ghost" size="sm">
								<Home />
							</Button>
						</Link>
						<div className="flex items-center gap-2">
							<Layers size={20} className="text-primary" />
							<h1 className="font-semibold">Flashcards</h1>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{!isMobile && (
							<>
								{memos.length > 0 && (
									<Link href="/cards/memos">
										<Button variant="outline" size="sm" title="View Memos">
											<BookOpen size={16} className="mr-2" />
											Memos
										</Button>
									</Link>
								)}
								{covers.length > 0 && (
									<Button
										variant="outline"
										size="sm"
										onClick={handleOrganizeAll}
										disabled={isOrganizing}
										title="Organize"
									>
										{isOrganizing ? (
											<Loader2 size={16} className="mr-2 animate-spin" />
										) : (
											<Wand2 size={16} className="mr-2" />
										)}
										Organize
									</Button>
								)}
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowNewCollection(true)}
									title="New Collection"
								>
									<Plus size={16} className="mr-2" />
									Collection
								</Button>
							</>
						)}
						<ProfileButton />
						<Button
							variant="outline"
							size="icon"
							onClick={() => setShowSettings(true)}
							title="Settings"
						>
							<Settings size={18} />
						</Button>
					</div>
				</header>

				{/* Mobile Action Bar */}
				{isMobile && hasContent && (
					<div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 overflow-x-auto">
						{memos.length > 0 && (
							<Link href="/cards/memos">
								<Button variant="outline" size="sm">
									<BookOpen size={14} className="mr-1" />
									Memos
								</Button>
							</Link>
						)}
						{covers.length > 0 && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleOrganizeAll}
								disabled={isOrganizing}
							>
								{isOrganizing ? (
									<Loader2 size={14} className="mr-1 animate-spin" />
								) : (
									<Wand2 size={14} className="mr-1" />
								)}
								Organize
							</Button>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowNewCollection(true)}
						>
							<Plus size={14} className="mr-1" />
							Collection
						</Button>
					</div>
				)}

				{/* Main content */}
				<main className="flex-1 overflow-y-auto p-6">
					{!hasContent ? (
						<div className="h-full flex flex-col items-center justify-center gap-4">
							<div className="p-4 rounded-full bg-primary/10">
								<Sparkles size={40} className="text-primary" />
							</div>
							<h2 className="text-xl font-semibold">No flashcards yet</h2>
							<p className="text-muted-foreground text-center max-w-md">
								Create your first flashcard set by uploading an image, taking a
								photo, or pasting text. AI will generate study cards for you.
							</p>
						</div>
					) : (
						<div className="max-w-6xl mx-auto space-y-8">
							{/* Collections */}
							{sortedCollections.length > 0 && (
								<section>
									<h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
										<FolderOpen size={20} />
										Collections
									</h2>
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
										{sortedCollections.map((collection) => {
											const collectionCovers = covers.filter(
												(c) => c.collectionId === collection.id,
											);
											const isEditing = editingCollectionId === collection.id;
											const hasContents = collectionCovers.length > 0;

											return (
												<CollectionCard
													key={collection.id}
													collection={collection}
													coverCount={collectionCovers.length}
													hasContents={hasContents}
													isEditing={isEditing}
													onNavigate={() =>
														router.push(`/cards/collection/${collection.id}`)
													}
													onStartEdit={() =>
														handleStartCollectionEdit(collection.id)
													}
													onSaveEdit={(name) =>
														handleSaveCollectionName(collection.id, name)
													}
													onCancelEdit={handleCancelCollectionEdit}
													onDelete={() => deleteCollection(collection.id)}
												/>
											);
										})}
									</div>
								</section>
							)}

							{/* Card Covers */}
							{sortedCovers.length > 0 && (
								<section>
									<h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
										<Layers size={20} />
										Card Sets
									</h2>
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
													<DraggableCardCover
														cover={cover}
														cards={coverCards}
														isSelected={currentCoverId === cover.id}
														onClick={() => handleCoverClick(cover.id)}
														onDelete={() => deleteCover(cover.id)}
														onRename={() => handleRenameCover(cover.id)}
														onTogglePin={() => togglePinCover(cover.id)}
														onMoveToCollection={() =>
															handleMoveToCollection(cover.id)
														}
													/>
												</motion.div>
											);
										})}
									</div>
								</section>
							)}
						</div>
					)}
				</main>

				{/* Card Generator FAB */}
				<AIErrorBoundary>
					<CardGenerator
						onComplete={(coverId) => {
							handleCoverClick(coverId);
						}}
					/>
				</AIErrorBoundary>

				{/* Dialogs */}
				<InputDialog
					open={showNewCollection}
					onOpenChange={setShowNewCollection}
					title="New Collection"
					placeholder="Collection name..."
					confirmLabel="Create"
					onConfirm={handleCreateCollection}
				/>

				<SelectDialog
					open={showMoveDialog}
					onOpenChange={setShowMoveDialog}
					title="Move to Collection"
					options={collections.map((c) => ({ id: c.id, name: c.name }))}
					emptyOption={{ label: "No collection", value: null }}
					onSelect={handleSelectCollection}
				/>

				<RenameDialog
					open={showRenameDialog}
					onOpenChange={setShowRenameDialog}
					title="Rename Card Set"
					currentName={renamingCover?.name || ""}
					placeholder="Card set name..."
					onConfirm={handleConfirmRename}
				/>

				<InputDialog
					open={showStackDialog}
					onOpenChange={(open) => {
						setShowStackDialog(open);
						if (!open) setStackingCovers(null);
					}}
					title="Create Collection"
					placeholder="Collection name..."
					confirmLabel="Create"
					onConfirm={handleCreateCollectionFromStack}
				/>

				<SettingsPanel
					isOpen={showSettings}
					onClose={() => setShowSettings(false)}
					routeType="cards"
				/>
			</div>
		</DragDropProvider>
	);
}
