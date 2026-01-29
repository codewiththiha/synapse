"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronLeft, Layers, Eye, EyeOff } from "lucide-react";
import { useFlashcardStore } from "@/stores/use-flashcard-store";
import { AppLoader } from "@/components/shared/loading";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { CardMemo } from "@/lib/types/flashcard";
import Link from "next/link";

export default function MemosPage() {
	const {
		isInitialized,
		initializeFlashcards,
		memos,
		covers,
		getCardsByCover,
	} = useFlashcardStore();

	const [selectedMemo, setSelectedMemo] = React.useState<CardMemo | null>(null);
	const [showCards, setShowCards] = React.useState(false);

	React.useEffect(() => {
		if (!isInitialized) {
			initializeFlashcards();
		}
	}, [isInitialized, initializeFlashcards]);

	if (!isInitialized) {
		return <AppLoader message="Loading Memos..." />;
	}

	// Group memos by cover
	const memosByCover = memos.reduce(
		(acc, memo) => {
			if (!acc[memo.coverId]) {
				acc[memo.coverId] = [];
			}
			acc[memo.coverId].push(memo);
			return acc;
		},
		{} as Record<string, CardMemo[]>,
	);

	const getCoverName = (coverId: string) => {
		const cover = covers.find((c) => c.id === coverId);
		return cover?.name || "Unknown Set";
	};

	return (
		<div className="h-full flex flex-col bg-background">
			{/* Header */}
			<header className="h-14 flex items-center justify-between px-4 border-b shrink-0">
				<div className="flex items-center gap-3">
					<Link href="/cards">
						<Button variant="ghost" size="sm">
							<ChevronLeft size={16} className="mr-1" />
							Cards
						</Button>
					</Link>
					<div className="flex items-center gap-2">
						<BookOpen size={20} className="text-primary" />
						<h1 className="font-semibold">Memos</h1>
					</div>
				</div>
				<ThemeToggle />
			</header>

			{/* Main content */}
			<main className="flex-1 overflow-y-auto p-4 md:p-6">
				{memos.length === 0 ? (
					<div className="h-full flex flex-col items-center justify-center gap-4">
						<div className="p-4 rounded-full bg-primary/10">
							<BookOpen size={40} className="text-primary" />
						</div>
						<h2 className="text-xl font-semibold">No memos yet</h2>
						<p className="text-muted-foreground text-center max-w-md">
							Save explanations while studying flashcards to create memos.
							They&apos;ll appear here for easy reference.
						</p>
						<Link href="/cards">
							<Button>Go to Flashcards</Button>
						</Link>
					</div>
				) : (
					<div className="max-w-4xl mx-auto">
						{/* Memo List */}
						<div className="grid gap-4">
							{Object.entries(memosByCover).map(([coverId, coverMemos]) => (
								<div key={coverId} className="space-y-3">
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Layers size={14} />
										<span>{getCoverName(coverId)}</span>
										<span className="text-xs">({coverMemos.length} memos)</span>
									</div>
									<div className="grid gap-3">
										{coverMemos.map((memo) => (
											<MemoCard
												key={memo.id}
												memo={memo}
												isSelected={selectedMemo?.id === memo.id}
												onClick={() => setSelectedMemo(memo)}
											/>
										))}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</main>

			{/* Memo Detail Modal */}
			<AnimatePresence>
				{selectedMemo && (
					<MemoDetail
						memo={selectedMemo}
						coverName={getCoverName(selectedMemo.coverId)}
						cards={getCardsByCover(selectedMemo.coverId)}
						showCards={showCards}
						onToggleCards={() => setShowCards(!showCards)}
						onClose={() => {
							setSelectedMemo(null);
							setShowCards(false);
						}}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}

function MemoCard({
	memo,
	isSelected,
	onClick,
}: {
	memo: CardMemo;
	isSelected: boolean;
	onClick: () => void;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className={`p-4 rounded-xl border bg-card cursor-pointer transition-colors hover:border-primary/50 ${
				isSelected ? "border-primary" : ""
			}`}
			onClick={onClick}
		>
			<div className="space-y-2">
				<p className="font-medium text-sm">{memo.question}</p>
				<p className="text-xs text-muted-foreground line-clamp-2">
					{memo.explanation}
				</p>
				<p className="text-xs text-muted-foreground">
					{new Date(memo.createdAt).toLocaleDateString()}
				</p>
			</div>
		</motion.div>
	);
}

function MemoDetail({
	memo,
	coverName,
	cards,
	showCards,
	onToggleCards,
	onClose,
}: {
	memo: CardMemo;
	coverName: string;
	cards: Array<{ id: string; question: string; answer: string }>;
	showCards: boolean;
	onToggleCards: () => void;
	onClose: () => void;
}) {
	return (
		<>
			{/* Backdrop - separate for smooth blur transition */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.2 }}
				className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl"
				onClick={onClose}
			/>

			{/* Content */}
			<motion.div
				initial={{ scale: 0.95, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				exit={{ scale: 0.95, opacity: 0 }}
				className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
			>
				<motion.div
					initial={{ scale: 0.95, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					exit={{ scale: 0.95, opacity: 0 }}
					className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border bg-card shadow-xl overflow-hidden pointer-events-auto"
				>
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b bg-muted/30">
						<div className="flex-1 min-w-0">
							<h2 className="font-semibold truncate">{memo.question}</h2>
							<p className="text-xs text-muted-foreground">{coverName}</p>
						</div>
						<div className="flex items-center gap-2 shrink-0">
							<Button
								variant="outline"
								size="sm"
								onClick={onToggleCards}
								title={showCards ? "Hide cards" : "Show related cards"}
							>
								{showCards ? <EyeOff size={14} /> : <Eye size={14} />}
								<span className="ml-1 hidden sm:inline">
									{showCards ? "Hide" : "Cards"}
								</span>
							</Button>
							<Button variant="outline" size="sm" onClick={onClose}>
								Close
							</Button>
						</div>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto p-4 md:p-6">
						{/* Question & Answer */}
						<div className="mb-6 p-4 rounded-lg bg-muted/50 space-y-3">
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
									Question
								</p>
								<p className="font-medium">{memo.question}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
									Answer
								</p>
								<p>{memo.answer}</p>
							</div>
						</div>

						{/* Explanation */}
						<div>
							<p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
								Explanation
							</p>
							<div className="prose prose-sm dark:prose-invert max-w-none">
								<MemoMarkdown content={memo.explanation} />
							</div>
						</div>

						{/* Related Cards */}
						<AnimatePresence>
							{showCards && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									className="mt-6 pt-6 border-t"
								>
									<p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
										Related Cards ({cards.length})
									</p>
									<div className="grid gap-2">
										{cards.slice(0, 10).map((card) => (
											<div
												key={card.id}
												className="p-3 rounded-lg border bg-muted/30 text-sm"
											>
												<p className="font-medium">{card.question}</p>
												<p className="text-muted-foreground text-xs mt-1">
													{card.answer}
												</p>
											</div>
										))}
										{cards.length > 10 && (
											<p className="text-xs text-muted-foreground text-center">
												+{cards.length - 10} more cards
											</p>
										)}
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</motion.div>
			</motion.div>
		</>
	);
}

// Enhanced markdown renderer for memos
function MemoMarkdown({ content }: { content: string }) {
	const parseInline = (text: string): React.ReactNode => {
		// Process inline elements
		const parts: React.ReactNode[] = [];
		let remaining = text;
		let key = 0;

		while (remaining.length > 0) {
			// Bold **text**
			const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
			if (boldMatch) {
				parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
				remaining = remaining.slice(boldMatch[0].length);
				continue;
			}

			// Italic *text*
			const italicMatch = remaining.match(/^\*(.+?)\*/);
			if (italicMatch) {
				parts.push(<em key={key++}>{italicMatch[1]}</em>);
				remaining = remaining.slice(italicMatch[0].length);
				continue;
			}

			// Inline code `code`
			const codeMatch = remaining.match(/^`([^`]+)`/);
			if (codeMatch) {
				parts.push(
					<code
						key={key++}
						className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono"
					>
						{codeMatch[1]}
					</code>,
				);
				remaining = remaining.slice(codeMatch[0].length);
				continue;
			}

			// Link [text](url)
			const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
			if (linkMatch) {
				parts.push(
					<a
						key={key++}
						href={linkMatch[2]}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary underline hover:no-underline"
					>
						{linkMatch[1]}
					</a>,
				);
				remaining = remaining.slice(linkMatch[0].length);
				continue;
			}

			// Regular character
			parts.push(remaining[0]);
			remaining = remaining.slice(1);
		}

		return parts;
	};

	const lines = content.split("\n");
	const elements: React.ReactNode[] = [];
	let inCodeBlock = false;
	let codeBlockContent: string[] = [];

	lines.forEach((line, i) => {
		// Code block start/end
		if (line.startsWith("```")) {
			if (inCodeBlock) {
				// End code block
				elements.push(
					<pre key={i} className="p-4 rounded-lg bg-muted overflow-x-auto my-3">
						<code className="text-sm font-mono">
							{codeBlockContent.join("\n")}
						</code>
					</pre>,
				);
				codeBlockContent = [];
				inCodeBlock = false;
			} else {
				// Start code block
				inCodeBlock = true;
			}
			return;
		}

		if (inCodeBlock) {
			codeBlockContent.push(line);
			return;
		}

		// Headers
		if (line.startsWith("#### ")) {
			elements.push(
				<h4 key={i} className="text-sm font-semibold mt-3 mb-1">
					{parseInline(line.slice(5))}
				</h4>,
			);
			return;
		}
		if (line.startsWith("### ")) {
			elements.push(
				<h3 key={i} className="text-base font-semibold mt-4 mb-2">
					{parseInline(line.slice(4))}
				</h3>,
			);
			return;
		}
		if (line.startsWith("## ")) {
			elements.push(
				<h2 key={i} className="text-lg font-semibold mt-5 mb-2">
					{parseInline(line.slice(3))}
				</h2>,
			);
			return;
		}
		if (line.startsWith("# ")) {
			elements.push(
				<h1 key={i} className="text-xl font-bold mt-5 mb-3">
					{parseInline(line.slice(2))}
				</h1>,
			);
			return;
		}

		// Blockquote
		if (line.startsWith("> ")) {
			elements.push(
				<blockquote
					key={i}
					className="border-l-4 border-primary/50 pl-4 py-1 my-2 text-muted-foreground italic"
				>
					{parseInline(line.slice(2))}
				</blockquote>,
			);
			return;
		}

		// Horizontal rule
		if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
			elements.push(<hr key={i} className="my-4 border-border" />);
			return;
		}

		// Bullet points
		if (line.startsWith("- ") || line.startsWith("* ")) {
			elements.push(
				<li key={i} className="ml-5 list-disc leading-relaxed">
					{parseInline(line.slice(2))}
				</li>,
			);
			return;
		}

		// Numbered lists
		if (/^\d+\.\s/.test(line)) {
			elements.push(
				<li key={i} className="ml-5 list-decimal leading-relaxed">
					{parseInline(line.replace(/^\d+\.\s/, ""))}
				</li>,
			);
			return;
		}

		// Empty lines
		if (line.trim() === "") {
			elements.push(<div key={i} className="h-2" />);
			return;
		}

		// Regular paragraphs
		elements.push(
			<p key={i} className="leading-relaxed mb-2">
				{parseInline(line)}
			</p>,
		);
	});

	// Handle unclosed code block
	if (inCodeBlock && codeBlockContent.length > 0) {
		elements.push(
			<pre
				key="unclosed"
				className="p-4 rounded-lg bg-muted overflow-x-auto my-3"
			>
				<code className="text-sm font-mono">{codeBlockContent.join("\n")}</code>
			</pre>,
		);
	}

	return <div className="space-y-1">{elements}</div>;
}
