/**
 * Pricing Calculator Utility
 * Pure functions for calculating reward costs with bulk discounts
 *
 * Requirements: 3.3, 3.4, 4.1, 4.2, 4.5, 4.6
 */

import { PRICING_CONFIG, MAX_REWARD_DURATION } from "@/lib/config/rewards";
import type { PricingConfig } from "@/lib/types/gamification";

/**
 * Calculate the cost for a reward purchase with bulk discount
 *
 * Uses a logarithmic scaling formula:
 * cost = baseRate * duration * (1 - bulkDiscountFactor * log10(duration + 1) / log10(maxDuration + 1))
 *
 * This ensures:
 * - Single minute purchases pay close to full price
 * - Larger purchases get progressively better rates
 * - The discount curve is smooth and predictable
 * - Purchasing 1 minute N times costs more than purchasing N minutes at once
 *
 * @param baseRate - Base cost per minute for the reward
 * @param durationMinutes - Duration in minutes to purchase
 * @param config - Pricing configuration (defaults to PRICING_CONFIG)
 * @returns Calculated cost rounded to nearest integer
 *
 * Requirements: 3.3, 4.1, 4.2, 4.5, 4.6
 */
export function calculateRewardCost(
	baseRate: number,
	durationMinutes: number,
	config: PricingConfig = PRICING_CONFIG,
): number {
	// Handle edge cases
	if (durationMinutes <= 0 || baseRate <= 0) {
		return 0;
	}

	// Calculate the discount factor based on duration
	// Uses logarithmic scaling for smooth bulk discounts
	const maxDuration = MAX_REWARD_DURATION;
	const discountMultiplier =
		1 -
		config.bulkDiscountFactor *
			(Math.log10(durationMinutes + 1) / Math.log10(maxDuration + 1));

	// Calculate raw cost with discount applied
	const rawCost = baseRate * durationMinutes * discountMultiplier;

	// Round to integer and ensure minimum cost
	const roundedCost = Math.round(rawCost);

	return Math.max(roundedCost, config.minimumCost);
}

/**
 * Get the maximum affordable duration for a given score and base rate
 *
 * Uses binary search to find the largest duration where cost <= availableScore
 *
 * @param baseRate - Base cost per minute for the reward
 * @param availableScore - User's available score balance
 * @param config - Pricing configuration (defaults to PRICING_CONFIG)
 * @returns Maximum affordable duration in minutes
 *
 * Requirements: 3.2
 */
export function getMaxAffordableDuration(
	baseRate: number,
	availableScore: number,
	config: PricingConfig = PRICING_CONFIG,
): number {
	// Handle edge cases
	if (availableScore <= 0 || baseRate <= 0) {
		return 0;
	}

	// If user can't afford even 1 minute, return 0
	if (calculateRewardCost(baseRate, 1, config) > availableScore) {
		return 0;
	}

	// Binary search for max affordable duration
	let low = 1;
	let high = MAX_REWARD_DURATION;
	let result = 1;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const cost = calculateRewardCost(baseRate, mid, config);

		if (cost <= availableScore) {
			result = mid;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}

	return result;
}

/**
 * Format duration in minutes to human-readable string
 *
 * - Duration >= 60: "X hr Y min" (or "X hr" if Y is 0)
 * - Duration < 60: "X min"
 *
 * @param durationMinutes - Duration in minutes
 * @returns Formatted duration string
 *
 * Requirements: 3.4
 */
export function formatDuration(durationMinutes: number): string {
	// Handle edge cases
	if (durationMinutes <= 0) {
		return "0 min";
	}

	const hours = Math.floor(durationMinutes / 60);
	const minutes = durationMinutes % 60;

	if (hours === 0) {
		return `${minutes} min`;
	}

	if (minutes === 0) {
		return `${hours} hr`;
	}

	return `${hours} hr ${minutes} min`;
}

/**
 * Calculate cost per minute for a given duration (useful for displaying savings)
 *
 * @param baseRate - Base cost per minute for the reward
 * @param durationMinutes - Duration in minutes
 * @param config - Pricing configuration (defaults to PRICING_CONFIG)
 * @returns Cost per minute (not rounded)
 */
export function getCostPerMinute(
	baseRate: number,
	durationMinutes: number,
	config: PricingConfig = PRICING_CONFIG,
): number {
	if (durationMinutes <= 0) {
		return baseRate;
	}

	const totalCost = calculateRewardCost(baseRate, durationMinutes, config);
	return totalCost / durationMinutes;
}

/**
 * Calculate the savings percentage compared to buying 1 minute at a time
 *
 * @param baseRate - Base cost per minute for the reward
 * @param durationMinutes - Duration in minutes
 * @param config - Pricing configuration (defaults to PRICING_CONFIG)
 * @returns Savings percentage (0-100)
 */
export function getBulkSavingsPercent(
	baseRate: number,
	durationMinutes: number,
	config: PricingConfig = PRICING_CONFIG,
): number {
	if (durationMinutes <= 1) {
		return 0;
	}

	const singleMinuteCost = calculateRewardCost(baseRate, 1, config);
	const bulkCost = calculateRewardCost(baseRate, durationMinutes, config);
	const noPurchaseCost = singleMinuteCost * durationMinutes;

	if (noPurchaseCost === 0) {
		return 0;
	}

	const savings = ((noPurchaseCost - bulkCost) / noPurchaseCost) * 100;
	return Math.round(savings * 10) / 10; // Round to 1 decimal place
}
