/**
 * Gamification Types
 * Types for the Pomodoro gamification feature including focus tracking, dual currency, levels, and rewards
 */

/**
 * Category types for reward items
 */
export type RewardCategory = "leisure" | "rest" | "entertainment" | "social";

/**
 * Reward item definition
 */
export interface RewardItem {
	id: string;
	title: string;
	emoji: string;
	category: RewardCategory;
	minutesPerCoin: number; // How many minutes you get per coin (higher = cheaper)
	requiredLevel: number; // Level needed to unlock (0 = always available)
	description?: string;
}

/**
 * Purchase record for tracking reward purchases
 */
export interface PurchaseRecord {
	id: string;
	rewardId: string;
	rewardTitle: string;
	quantity: number;
	cost: number;
	timestamp: number;
}

/**
 * Trade response from AI trading bot
 */
export interface TradeResponse {
	errorMessage: string | null;
	costCoins: number;
	responseMessage: string;
}

/**
 * Session reward breakdown after completing a Pomodoro session
 */
export interface SessionReward {
	minutesFocused: number;
	xpGained: number;
	baseCoins: number;
	dayMultiplier: number; // From daily streak (1.0, 1.1, 1.2)
	dayMultiplierBonus: number; // Additional coins from day multiplier
	comboBonus: number; // Additional coins from flow combo
	criticalSuccess: boolean; // 5% chance triggered
	criticalBonus: number;
	timeBonus: "earlyBird" | "nightOwl" | null;
	timeBonusCoins: number;
	totalCoins: number;
	// Achievement tracking - Requirements 10.1, 10.4
	newlyUnlockedAchievements?: string[]; // Achievement IDs unlocked this session
	leveledUp?: boolean; // Whether user leveled up this session
	newLevel?: number; // New level if leveled up
}

/**
 * Gamification state for the store
 */
export interface GamificationState {
	// Dual Currency
	totalXP: number; // Lifetime XP, never spent
	currentCoins: number; // Spendable coins
	lifetimeCoinsEarned: number; // Total coins ever earned

	// Daily Streak System (Consistency)
	dailyStreak: number; // Consecutive days with at least 1 session
	lastSessionDate: string | null; // YYYY-MM-DD format

	// Flow Combo System (Momentum)
	flowCombo: number; // Current combo count
	lastBreakEndTime: number | null; // Timestamp when last break ended

	// Session Stats
	totalFocusedMinutes: number;
	dailyFocusStats: Record<string, number>; // { "2026-01-09": 45, ... }
	totalSessionsCompleted: number;

	// Achievements
	unlockedAchievements: string[]; // Achievement IDs

	// Purchase history
	purchaseHistory: PurchaseRecord[];

	// UI state
	activeTab: "timer" | "shop" | "profile";
	showLootModal: boolean;
	lastSessionReward: SessionReward | null;
	pendingTrade: TradeResponse | null;
	isTradingBotLoading: boolean;
}

/**
 * Cloud data structure for Puter sync
 */
export interface GamificationCloudData {
	// Dual currency
	totalXP: number;
	currentCoins: number;
	lifetimeCoinsEarned: number;

	// Streak
	dailyStreak: number;
	lastSessionDate: string | null;

	// Stats
	totalFocusedMinutes: number;
	dailyFocusStats: Record<string, number>;
	totalSessionsCompleted: number;

	// Achievements
	unlockedAchievements: string[];

	// History
	purchaseHistory: PurchaseRecord[];

	lastUpdated: number;
}

/**
 * Pricing configuration for reward calculations
 */
export interface PricingConfig {
	baseRates: Record<RewardCategory, number>; // base cost per minute by category
	bulkDiscountFactor: number; // e.g., 0.15 means 15% max discount at high volumes
	minimumCost: number; // minimum cost for any purchase
	sliderPremium: number; // multiplier for slider convenience (e.g., 1.1 = 10% more)
}
