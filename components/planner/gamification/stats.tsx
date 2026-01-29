"use client";

/**
 * GamificationStats Component
 * Displays focus time, coins, level, and streak stats below the Pomodoro timer
 *
 * Requirements: 1.6, 2.4, 5.1, 5.2, 7.1, 7.2, 7.3
 */

import { motion } from "framer-motion";
import { useGamificationStore } from "@/stores/use-gamification-store";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function GamificationStats() {
	const {
		totalFocusedMinutes,
		currentCoins,
		dailyStreak,
		activeTab,
		setActiveTab,
		getTodayFocusedMinutes,
		getLevel,
		getLevelProgress,
	} = useGamificationStore();

	const todayMinutes = getTodayFocusedMinutes();
	const level = getLevel();
	const levelProgress = getLevelProgress();

	// Format minutes to hours and minutes
	const formatMinutes = (minutes: number) => {
		if (minutes < 60) {
			return `${minutes} min`;
		}
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (mins === 0) {
			return `${hours} hr`;
		}
		return `${hours} hr ${mins} min`;
	};

	const isShopOpen = activeTab === "shop";

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className="w-full space-y-4"
		>
			{/* Level Progress Bar */}
			<div className="space-y-1">
				<div className="flex items-center justify-between text-xs">
					<span className="font-medium">Level {level}</span>
					<span className="text-muted-foreground">
						{Math.round(levelProgress)}%
					</span>
				</div>
				<div className="h-2 bg-muted rounded-full overflow-hidden">
					<motion.div
						initial={{ width: 0 }}
						animate={{ width: `${levelProgress}%` }}
						className="h-full bg-primary rounded-full"
						transition={{ duration: 0.5, ease: "easeOut" }}
					/>
				</div>
			</div>

			{/* Stats Grid - Responsive for desktop/mobile */}
			<div className="grid grid-cols-4 gap-2">
				{/* Total Focus Time */}
				<StatCard
					label="Total"
					value={formatMinutes(totalFocusedMinutes)}
					color="blue"
				/>

				{/* Today's Focus Time */}
				<StatCard
					label="Today"
					value={formatMinutes(todayMinutes)}
					color="orange"
				/>

				{/* Current Coins */}
				<StatCard
					label="Coins"
					value={currentCoins.toLocaleString()}
					color="yellow"
				/>

				{/* Daily Streak */}
				<StatCard
					label="Streak"
					value={dailyStreak > 0 ? `${dailyStreak}🔥` : "0"}
					color={dailyStreak >= 3 ? "green" : "blue"}
				/>
			</div>

			{/* Shop Button */}
			<Button
				variant={isShopOpen ? "secondary" : "outline"}
				className="w-full gap-2"
				onClick={() => setActiveTab(isShopOpen ? "timer" : "shop")}
			>
				<ShoppingBag className="w-4 h-4" />
				{isShopOpen ? "Close Shop" : "Reward Shop"}
			</Button>
		</motion.div>
	);
}

interface StatCardProps {
	label: string;
	value: string;
	color: "blue" | "orange" | "yellow" | "green";
}

function StatCard({ label, value, color }: StatCardProps) {
	const colorClasses = {
		blue: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
		orange: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
		yellow: "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10",
		green: "text-green-600 dark:text-green-400 bg-green-500/10",
	};

	return (
		<div
			className={cn(
				"flex flex-col items-center gap-1 p-2 rounded-lg",
				colorClasses[color],
			)}
		>
			<span className="text-xs font-medium opacity-80">{label}</span>
			<span className="text-sm font-bold tabular-nums">{value}</span>
		</div>
	);
}
