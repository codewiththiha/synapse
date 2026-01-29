"use client";

/**
 * TradingBotInput Component
 * Input field for custom reward requests with AI trading bot
 *
 * Requirements: 5.1, 7.4
 */

import {
	useState,
	useCallback,
	type FormEvent,
	type KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGamificationStore } from "@/stores/use-gamification-store";
import { negotiateTrade } from "@/lib/services/trading-bot";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bot, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function TradingBotInput() {
	const [inputValue, setInputValue] = useState("");
	const { isTradingBotLoading, setTradingBotLoading, setPendingTrade } =
		useGamificationStore();

	const handleSubmit = useCallback(
		async (e?: FormEvent) => {
			e?.preventDefault();

			const message = inputValue.trim();
			if (!message || isTradingBotLoading) return;

			setTradingBotLoading(true);

			try {
				const response = await negotiateTrade({ userMessage: message });

				if (response.errorMessage) {
					toast.error(response.errorMessage);
				} else {
					// Set pending trade to show in dialog
					setPendingTrade(response);
				}
			} catch {
				toast.error("Failed to process your request. Please try again.");
			} finally {
				setTradingBotLoading(false);
				setInputValue("");
			}
		},
		[inputValue, isTradingBotLoading, setTradingBotLoading, setPendingTrade],
	);

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Bot className="w-4 h-4" />
				<span>Ask for a custom reward</span>
			</div>

			<form onSubmit={handleSubmit} className="flex gap-2">
				<div className="relative flex-1">
					<Input
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder='e.g., "gaming 2 hours" or "movie night"'
						disabled={isTradingBotLoading}
						className="pr-10"
					/>
					<AnimatePresence>
						{isTradingBotLoading && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="absolute right-3 top-1/2 -translate-y-1/2"
							>
								<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				<Button
					type="submit"
					size="icon"
					disabled={!inputValue.trim() || isTradingBotLoading}
				>
					{isTradingBotLoading ? (
						<Loader2 className="w-4 h-4 animate-spin" />
					) : (
						<Send className="w-4 h-4" />
					)}
				</Button>
			</form>

			<p className="text-xs text-muted-foreground">
				Describe what you want and the AI will calculate a fair price
			</p>
		</div>
	);
}
