"use client";

import { cn } from "@/lib/utils";
import { SpreadCardProps } from "./types";

const CARD_COLORS = [
	"border-blue-500/40 bg-blue-500/5",
	"border-green-500/40 bg-green-500/5",
	"border-purple-500/40 bg-purple-500/5",
	"border-orange-500/40 bg-orange-500/5",
	"border-pink-500/40 bg-pink-500/5",
];

export function SpreadCard({ card, index, total }: SpreadCardProps) {
	return (
		<div
			className={cn(
				"aspect-[3/4] rounded-xl border-2 shadow-lg p-4 flex flex-col bg-card select-none",
				CARD_COLORS[(index - 1) % CARD_COLORS.length],
			)}
		>
			<div className="text-xs text-muted-foreground mb-2">
				{index} / {total}
			</div>
			<div className="flex-1 flex items-center justify-center text-center overflow-hidden">
				<p className="text-sm font-medium line-clamp-5">{card.question}</p>
			</div>
		</div>
	);
}
