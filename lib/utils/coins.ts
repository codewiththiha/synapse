/**
 * Coin Calculator
 * Calculates session coin rewards with all bonuses.
 */

export interface CoinCalculation {
	baseCoins: number;
	dayMultiplier: number;
	dayMultiplierBonus: number;
	comboBonus: number;
	criticalSuccess: boolean;
	criticalBonus: number;
	timeBonus: "earlyBird" | "nightOwl" | null;
	timeBonusCoins: number;
	totalCoins: number;
}

// Critical success chance (5%)
export const CRITICAL_SUCCESS_CHANCE = 0.05;

// Time bonus amount
export const TIME_BONUS_COINS = 5;

// Early bird hour threshold (before 7 AM)
export const EARLY_BIRD_HOUR = 7;

// Night owl hour threshold (9 PM or later)
export const NIGHT_OWL_HOUR = 21;

/**
 * Calculate session coins with all bonuses
 * @param minutes - Session duration in minutes
 * @param dayMultiplier - Day multiplier from streak (1.0, 1.1, or 1.2)
 * @param comboBonus - Bonus coins from flow combo
 * @param startTime - Session start time for time bonus calculation
 * @param randomSeed - Optional random value (0-1) for testability
 */
export function calculateSessionCoins(
	minutes: number,
	dayMultiplier: number,
	comboBonus: number,
	startTime: Date,
	randomSeed?: number,
): CoinCalculation {
	// Base coins = minutes focused
	const baseCoins = Math.max(0, Math.floor(minutes));

	// Day multiplier bonus (additional coins from streak)
	const dayMultiplierBonus = Math.floor(baseCoins * (dayMultiplier - 1));
	const afterDayMultiplier = baseCoins + dayMultiplierBonus;

	// Add combo bonus
	const afterCombo = afterDayMultiplier + comboBonus;

	// Critical success (5% chance, doubles coins earned so far)
	const random = randomSeed ?? Math.random();
	const criticalSuccess = random < CRITICAL_SUCCESS_CHANCE;
	const criticalBonus = criticalSuccess ? afterCombo : 0;
	const afterCritical = afterCombo + criticalBonus;

	// Time bonus (+5 coins for early bird or night owl)
	const hour = startTime.getHours();
	let timeBonus: "earlyBird" | "nightOwl" | null = null;
	let timeBonusCoins = 0;

	if (hour < EARLY_BIRD_HOUR) {
		timeBonus = "earlyBird";
		timeBonusCoins = TIME_BONUS_COINS;
	} else if (hour >= NIGHT_OWL_HOUR) {
		timeBonus = "nightOwl";
		timeBonusCoins = TIME_BONUS_COINS;
	}

	const totalCoins = afterCritical + timeBonusCoins;

	return {
		baseCoins,
		dayMultiplier,
		dayMultiplierBonus,
		comboBonus,
		criticalSuccess,
		criticalBonus,
		timeBonus,
		timeBonusCoins,
		totalCoins,
	};
}
