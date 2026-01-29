/**
 * Rewards Configuration
 * Defines default reward items and pricing with logarithmic scaling
 */

import type { RewardItem, PricingConfig } from "@/lib/types/gamification";

/**
 * Default reward items available in the shop
 * minutesPerCoin: base rate (higher = cheaper)
 * - Walk: 10 min/coin (cheapest)
 * - Gaming: 2 min/coin (most expensive)
 */
export const DEFAULT_REWARDS: RewardItem[] = [
	{
		id: "walk",
		title: "Walk Outside",
		emoji: "🚶",
		category: "rest",
		minutesPerCoin: 10,
		requiredLevel: 0,
		description: "Get some fresh air",
	},
	{
		id: "music",
		title: "Listen to Music",
		emoji: "🎵",
		category: "leisure",
		minutesPerCoin: 8,
		requiredLevel: 0,
		description: "Enjoy your tunes",
	},
	{
		id: "snack",
		title: "Snack Break",
		emoji: "🍿",
		category: "leisure",
		minutesPerCoin: 6,
		requiredLevel: 0,
		description: "Grab a treat",
	},
	{
		id: "sleep",
		title: "Sleep",
		emoji: "😴",
		category: "rest",
		minutesPerCoin: 5,
		requiredLevel: 0,
		description: "Take a nap",
	},
	{
		id: "chat",
		title: "Chat with Friends",
		emoji: "💬",
		category: "social",
		minutesPerCoin: 4,
		requiredLevel: 2,
		description: "Catch up",
	},
	{
		id: "social-media",
		title: "Social Media",
		emoji: "📱",
		category: "leisure",
		minutesPerCoin: 3,
		requiredLevel: 3,
		description: "Scroll feeds",
	},
	{
		id: "youtube",
		title: "YouTube",
		emoji: "📺",
		category: "entertainment",
		minutesPerCoin: 2.5,
		requiredLevel: 3,
		description: "Watch videos",
	},
	{
		id: "gaming",
		title: "Gaming",
		emoji: "🎮",
		category: "entertainment",
		minutesPerCoin: 2,
		requiredLevel: 5,
		description: "Play games",
	},
];

export const PRICING_CONFIG: PricingConfig = {
	baseRates: { rest: 2, leisure: 3, entertainment: 5, social: 3 },
	bulkDiscountFactor: 0.15,
	minimumCost: 1,
	sliderPremium: 1.0, // No premium anymore
};

export const MIN_REWARD_DURATION = 10;
export const MAX_REWARD_DURATION = 480;

/**
 * Calculate cost with logarithmic scaling
 * 10 min = 1 coin, 100 min ≈ 8 coins (for base rate of 10 min/coin)
 * Formula: cost = (minutes / minutesPerCoin) * (1 - discount)
 * where discount = 0.15 * log10(minutes / 10)
 */
export function calculateCost(minutesPerCoin: number, minutes: number): number {
	if (minutesPerCoin <= 0 || minutes <= 0) return 999999;

	const baseCost = minutes / minutesPerCoin;

	// Logarithmic discount: more minutes = better rate
	// At 10 min: no discount, at 100 min: ~15% discount, at 1000 min: ~30% discount
	const discountFactor =
		minutes > MIN_REWARD_DURATION
			? Math.min(0.3, 0.15 * Math.log10(minutes / MIN_REWARD_DURATION))
			: 0;

	const finalCost = baseCost * (1 - discountFactor);
	return Math.max(PRICING_CONFIG.minimumCost, Math.ceil(finalCost));
}

/**
 * Calculate max affordable duration
 */
export function calculateMaxAffordableDuration(
	minutesPerCoin: number,
	availableCoins: number,
): number {
	if (minutesPerCoin <= 0 || availableCoins <= 0) return MIN_REWARD_DURATION;

	// Binary search for max affordable minutes
	let low = MIN_REWARD_DURATION;
	let high = MAX_REWARD_DURATION;
	let result = MIN_REWARD_DURATION;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const cost = calculateCost(minutesPerCoin, mid);

		if (cost <= availableCoins) {
			result = mid;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}

	return result;
}

// Keep these for backward compatibility but they just call calculateCost
export function calculateSliderCost(
	minutesPerCoin: number,
	minutes: number,
): number {
	return calculateCost(minutesPerCoin, minutes);
}

export function calculateBulkCost(
	minutesPerCoin: number,
	minutes: number,
): number {
	return calculateCost(minutesPerCoin, minutes);
}

export function calculateSavingsPercent(): number {
	return 0; // No more bulk savings
}
