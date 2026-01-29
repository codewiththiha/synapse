/**
 * Achievements Configuration
 * Defines achievement badges and their unlock conditions for the gamification system
 */

import type { GamificationState } from "@/lib/types/gamification";

/**
 * Achievement definition with condition function
 */
export interface Achievement {
	id: string;
	title: string;
	description: string;
	icon: string; // Emoji
	condition: (state: GamificationState) => boolean;
}

/**
 * Helper to get today's date key in YYYY-MM-DD format
 */
function getTodayDateKey(): string {
	return new Date().toISOString().split("T")[0];
}

/**
 * Achievement definitions
 * Each achievement has a condition function that checks if it should be unlocked
 */
export const ACHIEVEMENTS: Achievement[] = [
	{
		id: "deep-worker",
		title: "Deep Worker",
		description: "4 hours focused in one day",
		icon: "🧠",
		condition: (state) => {
			const today = getTodayDateKey();
			return (state.dailyFocusStats[today] || 0) >= 240;
		},
	},
	{
		id: "early-bird",
		title: "Early Bird",
		description: "Complete a session before 7 AM",
		icon: "🌅",
		condition: (state) => state.unlockedAchievements.includes("early-bird"),
	},
	{
		id: "night-owl",
		title: "Night Owl",
		description: "Complete a session after 9 PM",
		icon: "🦉",
		condition: (state) => state.unlockedAchievements.includes("night-owl"),
	},
	{
		id: "week-warrior",
		title: "Week Warrior",
		description: "7-day streak",
		icon: "⚔️",
		condition: (state) => state.dailyStreak >= 7,
	},
	{
		id: "centurion",
		title: "Centurion",
		description: "100 sessions completed",
		icon: "🏛️",
		condition: (state) => state.totalSessionsCompleted >= 100,
	},
];

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
	return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Check which achievements should be newly unlocked based on current state
 * @param state - Current gamification state
 * @returns Array of achievement IDs that should be newly unlocked
 */
export function checkNewAchievements(state: GamificationState): string[] {
	const newlyUnlocked: string[] = [];

	for (const achievement of ACHIEVEMENTS) {
		// Skip if already unlocked
		if (state.unlockedAchievements.includes(achievement.id)) {
			continue;
		}

		// Check if condition is met
		if (achievement.condition(state)) {
			newlyUnlocked.push(achievement.id);
		}
	}

	return newlyUnlocked;
}
