"use client";

/**
 * StepComplete Component
 *
 * PURPOSE:
 * Displays success state after card generation completes.
 * Shows celebratory animation and confirmation message.
 *
 * PARAMETERS:
 * None - stateless component
 *
 * WHAT IT DOES:
 * 1. Displays animated green checkmark icon (scales in)
 * 2. Shows "Flashcards created successfully!" message
 * 3. Provides visual confirmation of successful generation
 *
 * BENEFITS:
 * - Provides clear success feedback to user
 * - Animated icon is more engaging than static
 * - Simple, focused component
 * - No parameters needed (fully self-contained)
 * - Reusable for any success confirmation
 *
 * USAGE:
 * {step === 'complete' && <StepComplete />}
 */

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function StepComplete() {
	return (
		<div className="flex flex-col items-center gap-4 py-8">
			<motion.div
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				className="p-4 rounded-full bg-green-500/20"
			>
				<Sparkles size={32} className="text-green-500" />
			</motion.div>
			<p className="text-sm font-medium">Flashcards created successfully!</p>
		</div>
	);
}
