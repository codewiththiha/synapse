"use client";

/**
 * TradeDialog Component
 * Confirmation dialog for AI-negotiated trades
 * Displays AI response message, calculated cost, and Agree/Cancel buttons
 *
 * Requirements: 5.5, 5.6, 7.5, 14.4, 14.5
 */

import { useCallback } from "react";
import { motion } from "framer-motion";
import { useGamificationStore } from "@/stores/use-gamification-store";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Bot, Check, X, Star, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function TradeDialog() {
	const { pendingTrade, currentCoins, setPendingTrade, confirmTrade } =
		useGamificationStore();

	const isOpen = pendingTrade !== null && !pendingTrade.errorMessage;
	const canAfford = pendingTrade
		? pendingTrade.costCoins <= currentCoins
		: false;

	const handleClose = useCallback(() => {
		setPendingTrade(null);
	}, [setPendingTrade]);

	const handleAgree = useCallback(() => {
		if (!pendingTrade) return;

		const success = confirmTrade();
		if (success) {
			toast.success("Trade confirmed! Enjoy your reward!", {
				icon: "🎉",
			});
		} else {
			toast.error("Insufficient coins for this trade");
		}
	}, [pendingTrade, confirmTrade]);

	if (!pendingTrade) return null;

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent className="sm:max-w-md z-70">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Bot className="w-5 h-5 text-primary" />
						Trade Offer
					</DialogTitle>
					<DialogDescription>
						The trading bot has calculated a price for your request
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* AI Response Message */}
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						className="p-4 rounded-lg bg-muted/50 border"
					>
						<p className="text-sm leading-relaxed">
							{pendingTrade.responseMessage}
						</p>
					</motion.div>

					{/* Cost Display */}
					<div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
						<div className="flex items-center gap-2">
							<Star className="w-5 h-5 text-yellow-500" />
							<span className="font-medium">Cost</span>
						</div>
						<span className="text-xl font-bold">
							{pendingTrade.costCoins.toLocaleString()} coins
						</span>
					</div>

					{/* Balance Info */}
					<div className="flex items-center justify-between text-sm text-muted-foreground">
						<span>Your balance</span>
						<span
							className={
								canAfford
									? "text-green-600 dark:text-green-400"
									: "text-red-600 dark:text-red-400"
							}
						>
							{currentCoins.toLocaleString()} coins
						</span>
					</div>

					{/* Insufficient Balance Warning */}
					{!canAfford && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
						>
							<AlertCircle className="w-4 h-4 shrink-0" />
							<span>
								You need{" "}
								{(pendingTrade.costCoins - currentCoins).toLocaleString()} more
								coins
							</span>
						</motion.div>
					)}
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={handleClose}>
						<X className="w-4 h-4 mr-2" />
						Cancel
					</Button>
					<Button onClick={handleAgree} disabled={!canAfford}>
						<Check className="w-4 h-4 mr-2" />
						Agree ({pendingTrade.costCoins} coins)
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
