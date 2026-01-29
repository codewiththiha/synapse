"use client";

import { motion } from "framer-motion";
import { ChevronLeft, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Flashcard } from "@/lib/types/flashcard";

interface MasteredViewProps {
	cards: Flashcard[];
	isMobile: boolean;
	previousViewState: string;
	onBack: (e?: React.MouseEvent) => void;
	onUnmaster: (cardId: string, e: React.MouseEvent) => void;
}

export function MasteredView({
	cards,
	isMobile,
	previousViewState,
	onBack,
	onUnmaster,
}: MasteredViewProps) {
	const showBackButton =
		previousViewState === "study" || previousViewState === "spread";

	return (
		<div className="w-full max-w-2xl mx-4 flex flex-col max-h-[70vh]">
			{showBackButton && (
				<div className="flex justify-center mb-4">
					<Button
						variant="outline"
						size="lg"
						onClick={onBack}
						className="gap-2"
					>
						<ChevronLeft size={18} />
						Back to {previousViewState === "study" ? "Study" : "Cards"}
					</Button>
				</div>
			)}

			<p className="text-center text-muted-foreground text-sm mb-4">
				{isMobile
					? "Tap a card to restore"
					: "Click a card to restore it to active study"}
			</p>

			<div className="space-y-3 overflow-y-auto flex-1 p-4">
				{cards.map((card) => (
					<motion.div
						key={card.id}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						className="p-4 rounded-xl border bg-card flex items-center justify-between gap-4 cursor-pointer hover:border-primary/50"
						onClick={(e) => onUnmaster(card.id, e)}
					>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium truncate">{card.question}</p>
							<p className="text-xs text-muted-foreground truncate">
								{card.answer}
							</p>
						</div>
						<Button variant="outline" size="sm" className="shrink-0">
							<Undo2 size={14} className="mr-1" />
							<span className="hidden sm:inline">Restore</span>
						</Button>
					</motion.div>
				))}
			</div>

			{!isMobile && (
				<p className="text-center text-xs text-muted-foreground mt-4">
					ESC to go back
				</p>
			)}
		</div>
	);
}
