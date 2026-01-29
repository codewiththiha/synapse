/**
 * Daily Streak Calculator
 * Tracks consecutive days of focus sessions for consistency rewards.
 */

export interface DailyStreakResult {
	newStreak: number;
	dayMultiplier: number;
	displayText: string | null; // "🔥 Streak!" or null
}

/**
 * Get day multiplier based on streak count
 * - 1-2 days: 1.0x
 * - 3-6 days: 1.1x
 * - 7+ days: 1.2x (max cap)
 */
export function getDayMultiplier(streak: number): number {
	if (streak >= 7) return 1.2; // Max cap
	if (streak >= 3) return 1.1;
	return 1.0;
}

/**
 * Get streak info including multiplier and display text
 */
function getDailyStreakInfo(streak: number): DailyStreakResult {
	const dayMultiplier = getDayMultiplier(streak);
	const displayText = dayMultiplier > 1.0 ? "🔥 Streak!" : null;
	return { newStreak: streak, dayMultiplier, displayText };
}

/**
 * Calculate daily streak based on session history
 * @param currentStreak - Current streak count
 * @param lastSessionDate - Last session date in YYYY-MM-DD format
 * @param todayDate - Today's date in YYYY-MM-DD format
 * @param hasSessionToday - Whether user completed a session today
 */
export function calculateDailyStreak(
	currentStreak: number,
	lastSessionDate: string | null,
	todayDate: string,
	hasSessionToday: boolean,
): DailyStreakResult {
	// No previous session - start fresh
	if (!lastSessionDate) {
		return hasSessionToday
			? { newStreak: 1, dayMultiplier: 1.0, displayText: null }
			: { newStreak: 0, dayMultiplier: 1.0, displayText: null };
	}

	const lastDate = new Date(lastSessionDate);
	const today = new Date(todayDate);

	// Reset time components for accurate day comparison
	lastDate.setHours(0, 0, 0, 0);
	today.setHours(0, 0, 0, 0);

	const diffMs = today.getTime() - lastDate.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	// Same day - return current streak info
	if (diffDays === 0) {
		return getDailyStreakInfo(currentStreak);
	}

	// Consecutive day - increment streak if session completed
	if (diffDays === 1 && hasSessionToday) {
		return getDailyStreakInfo(currentStreak + 1);
	}

	// Gap in days - reset streak
	return hasSessionToday
		? { newStreak: 1, dayMultiplier: 1.0, displayText: null }
		: { newStreak: 0, dayMultiplier: 1.0, displayText: null };
}
