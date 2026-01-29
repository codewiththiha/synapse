"use client";

/**
 * StepProgress Component
 *
 * PURPOSE:
 * Displays generation progress during the card generation process.
 * Shows animated progress bar, percentage, and helpful messaging.
 *
 * PARAMETERS:
 * - progress: number
 *   Generation progress as percentage (0-100)
 *
 * WHAT IT DOES:
 * 1. Displays large animated spinner with percentage in center
 * 2. Shows "Generating your flashcards..." message
 * 3. Renders animated progress bar that fills from 0 to progress%
 * 4. Shows helper text: "You can minimize and browse existing cards"
 * 5. Updates in real-time as progress prop changes
 *
 * BENEFITS:
 * - Provides clear visual feedback during long operations
 * - Animated progress bar is more engaging than static
 * - Informs user they can minimize and continue browsing
 * - Simple, focused component with single responsibility
 * - Fully controlled (no internal state)
 * - Prevents user from thinking app is frozen
 *
 * USAGE:
 * <StepProgress progress={generation.generationProgress} />
 */

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface StepProgressProps {
	progress: number;
}

export function StepProgress({ progress }: StepProgressProps) {
	return (
		<div className="flex flex-col items-center gap-4 py-8">
			<div className="relative">
				<Loader2 size={48} className="animate-spin text-primary" />
				<span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
					{Math.round(progress)}%
				</span>
			</div>
			<p className="text-sm text-muted-foreground">
				Generating your flashcards...
			</p>
			<div className="w-full bg-muted rounded-full h-2">
				<motion.div
					className="bg-primary h-full rounded-full"
					initial={{ width: 0 }}
					animate={{ width: `${progress}%` }}
				/>
			</div>
			<p className="text-xs text-muted-foreground">
				You can minimize and browse existing cards
			</p>
		</div>
	);
}
