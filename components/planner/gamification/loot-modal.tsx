"use client";

/**
 * LootModal Component
 * Displayed after session completion showing rewards earned
 *
 * Features:
 * - "Session Complete!" header
 * - XP gained display
 * - Coin breakdown (base, day multiplier, combo, critical, time bonus)
 * - Total coins with animation
 * - "Collect" button
 *
 * Requirements: 7.2, 7.3
 */

import { motion, AnimatePresence } from "framer-motion";
import { SessionReward } from "@/lib/types/gamification";
import { Button } from "@/components/ui/button";
import { Star, Zap, Flame, Sun, Moon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LootModalProps {
	reward: SessionReward | null;
	isOpen: boolean;
	onCollect: () => void;
}

export function LootModal({ reward, isOpen, onCollect }: LootModalProps) {
	if (!reward) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
						onClick={onCollect}
					/>

					{/* Modal */}
					<motion.div
						initial={{ opacity: 0, scale: 0.9, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.9, y: 20 }}
						transition={{ type: "spring", damping: 25, stiffness: 300 }}
						className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-sm"
					>
						<div className="bg-background border rounded-xl shadow-2xl overflow-hidden">
							{/* Header with gradient */}
							<div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 p-6 text-center">
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ delay: 0.2, type: "spring", damping: 10 }}
								>
									<Sparkles className="w-12 h-12 mx-auto text-primary mb-2" />
								</motion.div>
								<h2 className="text-2xl font-bold">Session Complete!</h2>
								<p className="text-muted-foreground mt-1">
									{reward.minutesFocused} minutes of focus
								</p>
							</div>

							{/* Content */}
							<div className="p-6 space-y-4">
								{/* XP Gained */}
								<div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
									<div className="flex items-center gap-2">
										<Zap className="w-5 h-5 text-blue-500" />
										<span className="font-medium">XP Gained</span>
									</div>
									<motion.span
										initial={{ opacity: 0, x: 20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: 0.3 }}
										className="text-lg font-bold text-blue-500"
									>
										+{reward.xpGained}
									</motion.span>
								</div>

								{/* Coin Breakdown */}
								<div className="space-y-2">
									<h3 className="text-sm font-medium text-muted-foreground">
										Coin Breakdown
									</h3>

									{/* Base coins */}
									<CoinRow
										icon={<Star className="w-4 h-4" />}
										label="Base"
										value={reward.baseCoins}
										delay={0.4}
									/>

									{/* Day multiplier bonus */}
									{reward.dayMultiplierBonus > 0 && (
										<CoinRow
											icon={<Flame className="w-4 h-4 text-orange-500" />}
											label={`Streak (${reward.dayMultiplier}x)`}
											value={reward.dayMultiplierBonus}
											delay={0.5}
											highlight
										/>
									)}

									{/* Combo bonus */}
									{reward.comboBonus > 0 && (
										<CoinRow
											icon={<Zap className="w-4 h-4 text-purple-500" />}
											label="Flow Combo"
											value={reward.comboBonus}
											delay={0.55}
											highlight
										/>
									)}

									{/* Critical success */}
									{reward.criticalSuccess && (
										<CoinRow
											icon={<Sparkles className="w-4 h-4 text-yellow-500" />}
											label="Critical Success! 2x"
											value={reward.criticalBonus}
											delay={0.6}
											highlight
											critical
										/>
									)}

									{/* Time bonus */}
									{reward.timeBonus && (
										<CoinRow
											icon={
												reward.timeBonus === "earlyBird" ? (
													<Sun className="w-4 h-4 text-amber-500" />
												) : (
													<Moon className="w-4 h-4 text-indigo-500" />
												)
											}
											label={
												reward.timeBonus === "earlyBird"
													? "Early Bird"
													: "Night Owl"
											}
											value={reward.timeBonusCoins}
											delay={0.7}
											highlight
										/>
									)}
								</div>

								{/* Total */}
								<div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
									<span className="font-semibold">Total Coins</span>
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{
											delay: 0.8,
											type: "spring",
											damping: 10,
											stiffness: 200,
										}}
										className="flex items-center gap-2"
									>
										<Star className="w-5 h-5 text-yellow-500" />
										<span className="text-2xl font-bold text-primary">
											+{reward.totalCoins}
										</span>
									</motion.div>
								</div>

								{/* Collect button */}
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 1 }}
								>
									<Button onClick={onCollect} className="w-full" size="lg">
										Collect
									</Button>
								</motion.div>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

interface CoinRowProps {
	icon: React.ReactNode;
	label: string;
	value: number;
	delay: number;
	highlight?: boolean;
	critical?: boolean;
}

function CoinRow({
	icon,
	label,
	value,
	delay,
	highlight,
	critical,
}: CoinRowProps) {
	return (
		<motion.div
			initial={{ opacity: 0, x: -10 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay }}
			className={cn(
				"flex items-center justify-between py-1.5 px-2 rounded",
				highlight && "bg-muted/50",
				critical && "bg-yellow-500/10",
			)}
		>
			<div className="flex items-center gap-2 text-sm">
				{icon}
				<span
					className={cn(
						critical && "font-medium text-yellow-600 dark:text-yellow-400",
					)}
				>
					{label}
				</span>
			</div>
			<span
				className={cn(
					"font-medium",
					critical && "text-yellow-600 dark:text-yellow-400",
				)}
			>
				+{value}
			</span>
		</motion.div>
	);
}
