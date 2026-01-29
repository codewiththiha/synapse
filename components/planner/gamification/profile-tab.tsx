"use client";

/**
 * ProfileTab Component
 * Level badge with current level
 * XP progress bar (XP / XP_To_Next_Level)
 * Stats grid (Total Focus, Streak, Sessions, Lifetime Coins)
 * Achievement badges grid (locked: grey+padlock, unlocked: color+glow)
 *
 * Requirements: 8.5, 12.1, 12.2, 12.3, 12.4
 */

import { motion } from "framer-motion";
import { useGamificationStore } from "@/stores/use-gamification-store";
import { ACHIEVEMENTS } from "@/lib/config/achievements";
import { xpForLevel } from "@/lib/utils/level";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, Flame, Clock, Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProfileTab() {
	const {
		totalXP,
		currentCoins,
		lifetimeCoinsEarned,
		dailyStreak,
		totalFocusedMinutes,
		totalSessionsCompleted,
		unlockedAchievements,
		getLevel,
		getLevelProgress,
		getXPForNextLevel,
	} = useGamificationStore();

	const level = getLevel();
	const levelProgress = getLevelProgress();
	const xpForNext = getXPForNextLevel();
	const currentLevelXP = xpForLevel(level);
	const xpInCurrentLevel = totalXP - currentLevelXP;
	const xpNeededForNext = xpForNext - currentLevelXP;

	const formatMinutes = (minutes: number) => {
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
	};

	return (
		<div className="flex flex-col h-full">
			<ScrollArea className="flex-1 -mx-1 px-1">
				<div className="space-y-6 pb-4">
					{/* Top section: Level + Stats side by side */}
					<div className="flex gap-6">
						{/* Level badge and XP progress - Requirements 12.1 */}
						<div className="flex-1 space-y-3">
							<div className="flex items-center gap-4">
								<div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary">
									<span className="text-2xl font-bold text-primary">
										{level}
									</span>
								</div>
								<div className="flex-1">
									<p className="text-base font-medium">Level {level}</p>
									<p className="text-sm text-muted-foreground">
										{xpInCurrentLevel.toLocaleString()} /{" "}
										{xpNeededForNext.toLocaleString()} XP
									</p>
								</div>
							</div>

							{/* XP Progress bar */}
							<div className="space-y-1">
								<div className="h-2.5 bg-muted rounded-full overflow-hidden">
									<motion.div
										initial={{ width: 0 }}
										animate={{ width: `${levelProgress}%` }}
										className="h-full bg-primary rounded-full"
										transition={{ duration: 0.5, ease: "easeOut" }}
									/>
								</div>
								<p className="text-xs text-muted-foreground text-right">
									{Math.round(levelProgress)}% to Level {level + 1}
								</p>
							</div>

							{/* Current balance */}
							<div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
								<span className="text-sm text-muted-foreground">
									Current Balance
								</span>
								<div className="flex items-center gap-1.5">
									<Star className="w-4 h-4 text-yellow-500" />
									<span className="font-semibold">
										{currentCoins.toLocaleString()}
									</span>
								</div>
							</div>
						</div>

						{/* Stats grid - Requirements 12.2, 12.4 */}
						<div className="grid grid-cols-2 gap-2 w-48 shrink-0">
							<StatCard
								icon={Clock}
								label="Total Focus"
								value={formatMinutes(totalFocusedMinutes)}
								color="blue"
							/>
							<StatCard
								icon={Flame}
								label="Streak"
								value={`${dailyStreak}d`}
								color="orange"
							/>
							<StatCard
								icon={Trophy}
								label="Sessions"
								value={totalSessionsCompleted.toLocaleString()}
								color="purple"
							/>
							<StatCard
								icon={Star}
								label="Earned"
								value={lifetimeCoinsEarned.toLocaleString()}
								color="yellow"
							/>
						</div>
					</div>

					{/* Achievement badges grid - Requirements 12.3 */}
					<div className="space-y-3">
						<h3 className="text-sm font-medium">Achievements</h3>
						<div className="grid grid-cols-5 gap-3">
							{ACHIEVEMENTS.map((achievement) => {
								const isUnlocked = unlockedAchievements.includes(
									achievement.id,
								);
								return (
									<AchievementBadge
										key={achievement.id}
										icon={achievement.icon}
										title={achievement.title}
										description={achievement.description}
										isUnlocked={isUnlocked}
									/>
								);
							})}
						</div>
					</div>
				</div>
			</ScrollArea>
		</div>
	);
}

interface StatCardProps {
	icon: typeof Clock;
	label: string;
	value: string;
	color: "blue" | "orange" | "purple" | "yellow";
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
	const colorClasses = {
		blue: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
		orange: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
		purple: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
		yellow: "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10",
	};

	return (
		<div
			className={cn(
				"flex flex-col items-center gap-1.5 p-3 rounded-lg",
				colorClasses[color],
			)}
		>
			<Icon className="w-4 h-4" />
			<span className="text-xs text-muted-foreground">{label}</span>
			<span className="text-sm font-semibold">{value}</span>
		</div>
	);
}

interface AchievementBadgeProps {
	icon: string;
	title: string;
	description: string;
	isUnlocked: boolean;
}

function AchievementBadge({
	icon,
	title,
	description,
	isUnlocked,
}: AchievementBadgeProps) {
	return (
		<div
			className={cn(
				"relative flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all",
				isUnlocked
					? "bg-accent/50 border-primary/30 shadow-sm"
					: "bg-muted/30 border-muted opacity-60",
			)}
			title={`${title}: ${description}`}
		>
			{/* Lock overlay for locked achievements */}
			{!isUnlocked && (
				<div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-lg">
					<Lock className="w-4 h-4 text-muted-foreground" />
				</div>
			)}

			{/* Achievement icon with glow effect when unlocked */}
			<div
				className={cn(
					"text-2xl transition-all",
					isUnlocked && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]",
				)}
			>
				{icon}
			</div>

			<span className="text-[10px] font-medium text-center line-clamp-1">
				{title}
			</span>
		</div>
	);
}
