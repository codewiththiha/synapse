"use client";

/**
 * ShopTab Component
 * - Grid of selectable reward cards
 * - Fixed slider panel above trading bot
 * - Logarithmic pricing (more time = better rate)
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGamificationStore } from "@/stores/use-gamification-store";
import {
	DEFAULT_REWARDS,
	MIN_REWARD_DURATION,
	calculateCost,
	calculateMaxAffordableDuration,
} from "@/lib/config/rewards";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RewardItem } from "@/lib/types/gamification";
import { TradingBotInput } from "./trading-bot-input";
import { TradeDialog } from "./trade-dialog";

export function ShopTab() {
	const { currentCoins, purchaseReward, isRewardUnlocked } =
		useGamificationStore();

	const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
	const [selectedDuration, setSelectedDuration] = useState(MIN_REWARD_DURATION);

	const selectedReward = DEFAULT_REWARDS.find((r) => r.id === selectedRewardId);

	const maxDuration = useMemo(() => {
		if (!selectedReward) return MIN_REWARD_DURATION;
		return calculateMaxAffordableDuration(
			selectedReward.minutesPerCoin,
			currentCoins,
		);
	}, [selectedReward, currentCoins]);

	const cost = useMemo(() => {
		if (!selectedReward) return 0;
		return calculateCost(selectedReward.minutesPerCoin, selectedDuration);
	}, [selectedReward, selectedDuration]);

	const canAfford = cost <= currentCoins;

	const handleSelectReward = (reward: RewardItem) => {
		if (!isRewardUnlocked(reward.id)) return;

		const rewardMaxDuration = calculateMaxAffordableDuration(
			reward.minutesPerCoin,
			currentCoins,
		);

		if (rewardMaxDuration < MIN_REWARD_DURATION) {
			toast.error("Not enough coins for this reward");
			return;
		}

		if (selectedRewardId === reward.id) {
			setSelectedRewardId(null);
		} else {
			setSelectedRewardId(reward.id);
			setSelectedDuration(MIN_REWARD_DURATION);
		}
	};

	const handlePurchase = () => {
		if (!selectedReward || !canAfford) return;

		const success = purchaseReward(selectedReward.id, selectedDuration, cost);
		if (success) {
			toast.success(
				`Now Go Spent your ${selectedDuration} min ${selectedReward.title}!`,
				{
					icon: selectedReward.emoji,
				},
			);
			setSelectedRewardId(null);
		} else {
			toast.error("Purchase failed");
		}
	};

	return (
		<div className="flex flex-col h-full">
			{/* Coin balance header */}
			<div className="flex items-center justify-between mb-4">
				<span className="text-sm text-muted-foreground">Your Balance</span>
				<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
					<Star className="w-4 h-4" />
					<span className="text-base font-semibold">{currentCoins}</span>
				</div>
			</div>

			{/* Reward grid */}
			<ScrollArea className="flex-1 -mx-1 px-1">
				<div className="grid grid-cols-2 gap-2 pb-4">
					{DEFAULT_REWARDS.map((reward) => {
						const isUnlocked = isRewardUnlocked(reward.id);
						const rewardMaxDuration = calculateMaxAffordableDuration(
							reward.minutesPerCoin,
							currentCoins,
						);
						const canAffordReward = rewardMaxDuration >= MIN_REWARD_DURATION;
						const isSelected = selectedRewardId === reward.id;

						return (
							<RewardCard
								key={reward.id}
								reward={reward}
								isUnlocked={isUnlocked}
								canAfford={canAffordReward}
								isSelected={isSelected}
								onClick={() => handleSelectReward(reward)}
							/>
						);
					})}
				</div>
			</ScrollArea>

			{/* Fixed slider panel - appears when reward selected */}
			<AnimatePresence>
				{selectedReward && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 20 }}
						className="py-4 border-t space-y-4"
					>
						{/* Selected reward info */}
						<div className="flex items-center gap-3">
							<span className="text-2xl">{selectedReward.emoji}</span>
							<div className="flex-1">
								<p className="font-medium">{selectedReward.title}</p>
								<p className="text-xs text-muted-foreground">
									{selectedReward.minutesPerCoin} min/coin base rate
								</p>
							</div>
						</div>

						{/* Duration slider */}
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground flex items-center gap-1">
									<Clock className="w-4 h-4" />
									Duration
								</span>
								<span className="font-medium">{selectedDuration} min</span>
							</div>
							<Slider
								value={[selectedDuration]}
								onValueChange={([val]) => setSelectedDuration(val)}
								min={MIN_REWARD_DURATION}
								max={maxDuration}
								step={5}
								className="w-full"
							/>
							<div className="flex justify-between text-xs text-muted-foreground">
								<span>{MIN_REWARD_DURATION}m</span>
								<span>{maxDuration}m max</span>
							</div>
						</div>

						{/* Buy button */}
						<Button
							onClick={handlePurchase}
							disabled={!canAfford}
							className="w-full"
						>
							Buy {selectedDuration} min for {cost} coins
						</Button>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Trading bot input */}
			<div className="pt-4 border-t mt-auto">
				<TradingBotInput />
			</div>

			<TradeDialog />
		</div>
	);
}

interface RewardCardProps {
	reward: RewardItem;
	isUnlocked: boolean;
	canAfford: boolean;
	isSelected: boolean;
	onClick: () => void;
}

function RewardCard({
	reward,
	isUnlocked,
	canAfford,
	isSelected,
	onClick,
}: RewardCardProps) {
	return (
		<button
			onClick={onClick}
			disabled={!isUnlocked}
			className={cn(
				"relative flex items-center gap-2 p-3 rounded-xl border transition-all text-left",
				"hover:border-primary/30",
				// Selected state: white/light background
				isSelected &&
					"bg-white dark:bg-white/10 border-primary ring-1 ring-primary/30",
				!isSelected && "bg-card hover:bg-accent/30",
				!isUnlocked && "opacity-60 cursor-not-allowed",
				isUnlocked && !canAfford && "opacity-50",
			)}
		>
			{/* Lock overlay */}
			{!isUnlocked && (
				<div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl z-10">
					<div className="flex flex-col items-center gap-0.5">
						<Lock className="w-4 h-4 text-muted-foreground" />
						<span className="text-[10px] text-muted-foreground">
							Lvl {reward.requiredLevel}
						</span>
					</div>
				</div>
			)}

			<span className="text-xl">{reward.emoji}</span>
			<div className="flex-1 min-w-0">
				<p
					className={cn(
						"text-sm font-medium truncate",
						isSelected && "text-black dark:text-white",
					)}
				>
					{reward.title}
				</p>
				<p
					className={cn(
						"text-xs",
						isSelected
							? "text-black/60 dark:text-white/60"
							: "text-muted-foreground",
					)}
				>
					{reward.minutesPerCoin}m/coin
				</p>
			</div>
		</button>
	);
}
