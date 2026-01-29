/**
 * Level Calculator
 * Calculates user level from XP using geometric progression.
 * Formula: Level = floor(0.1 * sqrt(Total_XP))
 */

/**
 * Calculate level from total XP
 * Level = floor(0.1 * sqrt(Total_XP))
 */
export function calculateLevel(totalXP: number): number {
	if (totalXP < 0) return 0;
	return Math.floor(0.1 * Math.sqrt(totalXP));
}

/**
 * Calculate XP needed to reach a specific level
 * Inverse of level formula: XP = (level / 0.1)^2 = (level * 10)^2
 */
export function xpForLevel(level: number): number {
	if (level <= 0) return 0;
	return Math.pow(level / 0.1, 2);
}

/**
 * Calculate XP needed for the next level
 */
export function xpForNextLevel(currentXP: number): number {
	const currentLevel = calculateLevel(currentXP);
	return xpForLevel(currentLevel + 1);
}

/**
 * Calculate progress percentage to next level (0-100)
 */
export function levelProgress(currentXP: number): number {
	if (currentXP < 0) return 0;

	const currentLevel = calculateLevel(currentXP);
	const currentLevelXP = xpForLevel(currentLevel);
	const nextLevelXP = xpForLevel(currentLevel + 1);

	// Avoid division by zero
	if (nextLevelXP === currentLevelXP) return 0;

	const progress =
		((currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
	return Math.min(100, Math.max(0, progress));
}
