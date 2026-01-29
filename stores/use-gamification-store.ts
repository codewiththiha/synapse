/**
 * Gamification Store
 * Manages dual-currency system (XP + Coins), streaks, combos, levels, and rewards
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 6.3, 13.1, 13.3, 15.1, 15.2, 15.3, 15.4
 */

import { createStore } from "@/lib/createStore";
import {
	GamificationState,
	GamificationCloudData,
	PurchaseRecord,
	TradeResponse,
	SessionReward,
} from "@/lib/types/gamification";
import { DEFAULT_REWARDS, calculateBulkCost } from "@/lib/config/rewards";
import {
	calculateLevel,
	levelProgress,
	xpForNextLevel,
} from "@/lib/utils/level";
import { calculateDailyStreak, getDayMultiplier } from "@/lib/utils/streak";
import { calculateFlowCombo } from "@/lib/utils/combo";
import { calculateSessionCoins } from "@/lib/utils/coins";
import { checkNewAchievements } from "@/lib/config/achievements";

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDateKey(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Generate a unique ID for purchase records
 */
function generatePurchaseId(): string {
	return `purchase-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

type Actions = {
	// Session completion - main entry point for earning rewards
	completeSession: (
		minutes: number,
		startTime: Date,
		randomSeed?: number,
		partialMinutesAlreadyTracked?: number, // Minutes already awarded via partial tracking
	) => SessionReward;

	// Partial progress tracking - awards XP only (no coins/bonuses)
	trackPartialProgress: (minutes: number) => void;

	// Focus tracking
	getTodayFocusedMinutes: () => number;

	// Currency management
	deductCoins: (amount: number) => boolean;

	// Level helpers
	getLevel: () => number;
	getLevelProgress: () => number;
	getXPForNextLevel: () => number;

	// Streak helpers
	getStreakMultiplier: () => number;

	// Achievements
	checkAndUnlockAchievements: () => string[];

	// Shop
	toggleShop: () => void;
	openShop: () => void;
	closeShop: () => void;
	purchaseReward: (rewardId: string, minutes: number, cost: number) => boolean;
	canAffordReward: (rewardId: string, minutes: number) => boolean;
	isRewardUnlocked: (rewardId: string) => boolean;

	// UI state
	setActiveTab: (tab: "timer" | "shop" | "profile") => void;
	setShowLootModal: (show: boolean) => void;
	hideLootModal: () => void;

	// Flow combo - called when break ends
	setLastBreakEndTime: (timestamp: number) => void;

	// Trading bot
	setPendingTrade: (trade: TradeResponse | null) => void;
	confirmTrade: () => boolean;
	setTradingBotLoading: (loading: boolean) => void;

	// Sync
	loadFromCloud: (data: GamificationCloudData) => void;
	getCloudData: () => GamificationCloudData;

	// Utility
	clearAllData: () => void;
};

type Store = GamificationState & Actions;

const initialState: GamificationState = {
	// Dual Currency
	totalXP: 0,
	currentCoins: 0,
	lifetimeCoinsEarned: 0,

	// Daily Streak System
	dailyStreak: 0,
	lastSessionDate: null,

	// Flow Combo System
	flowCombo: 0,
	lastBreakEndTime: null,

	// Session Stats
	totalFocusedMinutes: 0,
	dailyFocusStats: {},
	totalSessionsCompleted: 0,

	// Achievements
	unlockedAchievements: [],

	// Purchase history
	purchaseHistory: [],

	// UI state
	activeTab: "timer",
	showLootModal: false,
	lastSessionReward: null,
	pendingTrade: null,
	isTradingBotLoading: false,
};

const useGamificationStore = createStore<Store>(
	(set, get) => ({
		...initialState,

		/**
		 * Complete a Pomodoro session and calculate all rewards
		 * This is the main entry point for earning XP and Coins
		 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 4.1, 4.2, 10.1, 10.4, 15.1, 15.3, 15.4
		 */
		completeSession: (
			minutes: number,
			startTime: Date,
			randomSeed?: number,
			partialMinutesAlreadyTracked: number = 0,
		): SessionReward => {
			if (minutes <= 0) {
				return {
					minutesFocused: 0,
					xpGained: 0,
					baseCoins: 0,
					dayMultiplier: 1.0,
					dayMultiplierBonus: 0,
					comboBonus: 0,
					criticalSuccess: false,
					criticalBonus: 0,
					timeBonus: null,
					timeBonusCoins: 0,
					totalCoins: 0,
					newlyUnlockedAchievements: [],
				};
			}

			const state = get();
			const dateKey = getTodayDateKey();
			const sessionStartTime = startTime.getTime();
			const previousLevel = calculateLevel(state.totalXP);

			// Calculate remaining minutes not yet tracked as XP
			// Partial tracking already awarded XP for some minutes
			const remainingMinutesForXP = Math.max(
				0,
				minutes - partialMinutesAlreadyTracked,
			);

			// Calculate daily streak
			const streakResult = calculateDailyStreak(
				state.dailyStreak,
				state.lastSessionDate,
				dateKey,
				true, // This session counts as today's session
			);

			// Calculate flow combo
			const comboResult = calculateFlowCombo(
				state.flowCombo,
				state.lastBreakEndTime,
				sessionStartTime,
			);

			// Calculate coins with all bonuses (based on FULL session duration)
			const coinResult = calculateSessionCoins(
				minutes,
				streakResult.dayMultiplier,
				comboResult.comboBonus,
				startTime,
				randomSeed,
			);

			// Calculate remaining coins to award (subtract base coins already tracked)
			// Partial tracking already awarded base coins (1 per minute)
			const baseCoinsAlreadyTracked = Math.floor(partialMinutesAlreadyTracked);
			const remainingCoinsToAward = Math.max(
				0,
				coinResult.totalCoins - baseCoinsAlreadyTracked,
			);

			// XP gained = only remaining minutes not yet tracked
			const xpGained = Math.floor(remainingMinutesForXP);

			// Check for time-based achievements (early bird / night owl)
			// These are checked before state update since they depend on session start time
			const hour = startTime.getHours();
			const timeBasedAchievements: string[] = [];
			if (hour < 7 && !state.unlockedAchievements.includes("early-bird")) {
				timeBasedAchievements.push("early-bird");
			}
			if (hour >= 21 && !state.unlockedAchievements.includes("night-owl")) {
				timeBasedAchievements.push("night-owl");
			}

			// Update state
			set((s) => {
				// Update XP (only remaining, partial already tracked) - Requirements 1.1, 1.2
				s.totalXP += xpGained;

				// Update coins (only remaining, base coins already tracked) - Requirement 1.3
				s.currentCoins += remainingCoinsToAward;
				s.lifetimeCoinsEarned += remainingCoinsToAward;

				// Update daily streak - Requirements 2.1, 2.2
				s.dailyStreak = streakResult.newStreak;
				s.lastSessionDate = dateKey;

				// Update flow combo - Requirements 15.1, 15.3, 15.4
				s.flowCombo = comboResult.newCombo;

				// Update session stats (only remaining minutes, partial already tracked)
				s.totalFocusedMinutes += remainingMinutesForXP;
				s.dailyFocusStats[dateKey] =
					(s.dailyFocusStats[dateKey] || 0) + remainingMinutesForXP;
				s.totalSessionsCompleted += 1;

				// Unlock time-based achievements - Requirement 10.1
				for (const achievementId of timeBasedAchievements) {
					if (!s.unlockedAchievements.includes(achievementId)) {
						s.unlockedAchievements.push(achievementId);
					}
				}
			});

			// Check for other achievements after state update - Requirement 10.1
			const updatedState = get();
			const additionalAchievements = checkNewAchievements(updatedState);

			// Collect all newly unlocked achievements
			const allNewAchievements = [...timeBasedAchievements];

			if (additionalAchievements.length > 0) {
				set((s) => {
					for (const achievementId of additionalAchievements) {
						if (!s.unlockedAchievements.includes(achievementId)) {
							s.unlockedAchievements.push(achievementId);
							allNewAchievements.push(achievementId);
						}
					}
				});
			}

			// Check for level up
			const newLevel = calculateLevel(get().totalXP);
			const leveledUp = newLevel > previousLevel;

			// Build session reward with newly unlocked achievements
			// Note: minutesFocused shows full session duration for display
			// xpGained shows only remaining XP (partial already tracked)
			const sessionReward: SessionReward = {
				minutesFocused: minutes, // Full session for display
				xpGained, // Only remaining (partial already tracked)
				baseCoins: coinResult.baseCoins,
				dayMultiplier: coinResult.dayMultiplier,
				dayMultiplierBonus: coinResult.dayMultiplierBonus,
				comboBonus: coinResult.comboBonus,
				criticalSuccess: coinResult.criticalSuccess,
				criticalBonus: coinResult.criticalBonus,
				timeBonus: coinResult.timeBonus,
				timeBonusCoins: coinResult.timeBonusCoins,
				totalCoins: coinResult.totalCoins,
				newlyUnlockedAchievements: allNewAchievements,
				leveledUp,
				newLevel: leveledUp ? newLevel : undefined,
			};

			// Store last session reward for loot modal
			set((s) => {
				s.lastSessionReward = sessionReward;
				s.showLootModal = true;
			});

			return sessionReward;
		},

		/**
		 * Get today's focused minutes
		 */
		getTodayFocusedMinutes: () => {
			const dateKey = getTodayDateKey();
			return get().dailyFocusStats[dateKey] || 0;
		},

		/**
		 * Track partial progress during an active session
		 * Awards XP and base coins (no bonuses like combo, critical, time bonus)
		 * This is called periodically (every minute) during active work sessions
		 * Performance optimized: minimal state updates, no complex calculations
		 */
		trackPartialProgress: (minutes: number) => {
			if (minutes <= 0) return;

			const dateKey = getTodayDateKey();
			const xpGained = Math.floor(minutes);
			const baseCoins = Math.floor(minutes); // 1 coin per minute base

			set((s) => {
				// Update XP
				s.totalXP += xpGained;
				// Update base coins (bonuses only at session completion)
				s.currentCoins += baseCoins;
				s.lifetimeCoinsEarned += baseCoins;
				// Update focus stats
				s.totalFocusedMinutes += minutes;
				s.dailyFocusStats[dateKey] =
					(s.dailyFocusStats[dateKey] || 0) + minutes;
			});
		},

		/**
		 * Deduct coins for a purchase
		 * Returns false if insufficient balance
		 * Requirements: 1.4, 1.5
		 */
		deductCoins: (amount: number): boolean => {
			const { currentCoins } = get();

			// Reject if insufficient balance - Requirement 1.5
			if (amount > currentCoins) {
				return false;
			}

			set((state) => {
				state.currentCoins -= amount;
			});

			return true;
		},

		/**
		 * Get current level from XP
		 * Requirement 5.1
		 */
		getLevel: (): number => {
			return calculateLevel(get().totalXP);
		},

		/**
		 * Get progress percentage to next level (0-100)
		 * Requirement 5.2
		 */
		getLevelProgress: (): number => {
			return levelProgress(get().totalXP);
		},

		/**
		 * Get XP needed for next level
		 * Requirement 5.2
		 */
		getXPForNextLevel: (): number => {
			return xpForNextLevel(get().totalXP);
		},

		/**
		 * Get current streak multiplier
		 * Requirements 2.3, 2.4, 2.5
		 */
		getStreakMultiplier: (): number => {
			return getDayMultiplier(get().dailyStreak);
		},

		/**
		 * Check and unlock achievements based on current state
		 * Returns array of newly unlocked achievement IDs
		 */
		checkAndUnlockAchievements: (): string[] => {
			const state = get();
			const newlyUnlocked = checkNewAchievements(state);

			if (newlyUnlocked.length > 0) {
				set((s) => {
					for (const achievementId of newlyUnlocked) {
						if (!s.unlockedAchievements.includes(achievementId)) {
							s.unlockedAchievements.push(achievementId);
						}
					}
				});
			}

			return newlyUnlocked;
		},

		/**
		 * Toggle shop visibility
		 */
		toggleShop: () => {
			set((state) => {
				state.activeTab = state.activeTab === "shop" ? "timer" : "shop";
			});
		},

		/**
		 * Open shop
		 */
		openShop: () => {
			set((state) => {
				state.activeTab = "shop";
			});
		},

		/**
		 * Close shop
		 */
		closeShop: () => {
			set((state) => {
				state.activeTab = "timer";
			});
		},

		/**
		 * Purchase a reward from the shop
		 * Returns false if insufficient balance, invalid reward, or level requirement not met
		 * Requirements: 1.4, 6.3
		 */
		purchaseReward: (
			rewardId: string,
			minutes: number,
			cost: number,
		): boolean => {
			if (minutes <= 0 || cost <= 0) return false;

			// Find the reward
			const reward = DEFAULT_REWARDS.find((r) => r.id === rewardId);
			if (!reward) return false;

			const state = get();
			const userLevel = calculateLevel(state.totalXP);

			// Check level requirement - Requirement 6.3
			if (userLevel < reward.requiredLevel) {
				return false;
			}

			// Check balance
			if (cost > state.currentCoins) {
				return false;
			}

			// Create purchase record
			const purchaseRecord: PurchaseRecord = {
				id: generatePurchaseId(),
				rewardId: reward.id,
				rewardTitle: reward.title,
				quantity: minutes, // Now represents minutes
				cost,
				timestamp: Date.now(),
			};

			set((s) => {
				// Deduct coins - Requirement 1.4
				s.currentCoins -= cost;

				// Add to purchase history
				s.purchaseHistory.push(purchaseRecord);
			});

			return true;
		},

		/**
		 * Check if user can afford a reward for given duration
		 */
		canAffordReward: (rewardId: string, minutes: number): boolean => {
			if (minutes <= 0) return false;

			const reward = DEFAULT_REWARDS.find((r) => r.id === rewardId);
			if (!reward) return false;

			const cost = calculateBulkCost(reward.minutesPerCoin, minutes);
			return get().currentCoins >= cost;
		},

		/**
		 * Check if a reward is unlocked based on user level
		 * Requirement 6.3
		 */
		isRewardUnlocked: (rewardId: string): boolean => {
			const reward = DEFAULT_REWARDS.find((r) => r.id === rewardId);
			if (!reward) return false;

			const userLevel = calculateLevel(get().totalXP);
			return userLevel >= reward.requiredLevel;
		},

		/**
		 * Set active tab
		 */
		setActiveTab: (tab: "timer" | "shop" | "profile") => {
			set((state) => {
				state.activeTab = tab;
			});
		},

		/**
		 * Set loot modal visibility
		 */
		setShowLootModal: (show: boolean) => {
			set((state) => {
				state.showLootModal = show;
			});
		},

		/**
		 * Hide loot modal
		 */
		hideLootModal: () => {
			set((state) => {
				state.showLootModal = false;
			});
		},

		/**
		 * Set last break end time for flow combo calculation
		 * Called when a break ends
		 * Requirement 15.2
		 */
		setLastBreakEndTime: (timestamp: number) => {
			set((state) => {
				state.lastBreakEndTime = timestamp;
			});
		},

		/**
		 * Set pending trade from trading bot
		 */
		setPendingTrade: (trade: TradeResponse | null) => {
			set((state) => {
				state.pendingTrade = trade;
			});
		},

		/**
		 * Confirm a pending trade (deduct coins)
		 * Returns false if no pending trade or insufficient balance
		 */
		confirmTrade: (): boolean => {
			const { pendingTrade, currentCoins } = get();

			// No pending trade
			if (!pendingTrade) return false;

			// Trade has error
			if (pendingTrade.errorMessage) return false;

			// Insufficient balance
			if (pendingTrade.costCoins > currentCoins) {
				return false;
			}

			// Create purchase record for custom trade
			const purchaseRecord: PurchaseRecord = {
				id: generatePurchaseId(),
				rewardId: "custom-trade",
				rewardTitle: pendingTrade.responseMessage.slice(0, 50),
				quantity: 1,
				cost: pendingTrade.costCoins,
				timestamp: Date.now(),
			};

			set((state) => {
				// Deduct coins
				state.currentCoins -= pendingTrade.costCoins;

				// Add to purchase history
				state.purchaseHistory.push(purchaseRecord);

				// Clear pending trade
				state.pendingTrade = null;
			});

			return true;
		},

		/**
		 * Set trading bot loading state
		 */
		setTradingBotLoading: (loading: boolean) => {
			set((state) => {
				state.isTradingBotLoading = loading;
			});
		},

		/**
		 * Load data from cloud (merge with local)
		 * Prefers higher XP and coin values
		 * Requirements: 13.1, 13.3
		 */
		loadFromCloud: (data: GamificationCloudData) => {
			set((state) => {
				// Prefer higher XP - Requirement 13.3
				state.totalXP = Math.max(state.totalXP, data.totalXP || 0);

				// Prefer higher coins - Requirement 13.3
				state.currentCoins = Math.max(
					state.currentCoins,
					data.currentCoins || 0,
				);
				state.lifetimeCoinsEarned = Math.max(
					state.lifetimeCoinsEarned,
					data.lifetimeCoinsEarned || 0,
				);

				// Prefer higher streak
				state.dailyStreak = Math.max(state.dailyStreak, data.dailyStreak || 0);

				// Use most recent session date
				if (data.lastSessionDate) {
					if (
						!state.lastSessionDate ||
						data.lastSessionDate > state.lastSessionDate
					) {
						state.lastSessionDate = data.lastSessionDate;
					}
				}

				// Prefer higher total focused minutes
				state.totalFocusedMinutes = Math.max(
					state.totalFocusedMinutes,
					data.totalFocusedMinutes || 0,
				);

				// Prefer higher total sessions
				state.totalSessionsCompleted = Math.max(
					state.totalSessionsCompleted,
					data.totalSessionsCompleted || 0,
				);

				// Merge daily stats (take max for each day)
				const cloudStats = data.dailyFocusStats || {};
				for (const [dateKey, minutes] of Object.entries(cloudStats)) {
					state.dailyFocusStats[dateKey] = Math.max(
						state.dailyFocusStats[dateKey] || 0,
						minutes,
					);
				}

				// Merge achievements (union)
				const cloudAchievements = data.unlockedAchievements || [];
				for (const achievementId of cloudAchievements) {
					if (!state.unlockedAchievements.includes(achievementId)) {
						state.unlockedAchievements.push(achievementId);
					}
				}

				// Merge purchase history (combine unique purchases by ID)
				const existingIds = new Set(state.purchaseHistory.map((p) => p.id));
				const cloudPurchases = data.purchaseHistory || [];
				for (const purchase of cloudPurchases) {
					if (!existingIds.has(purchase.id)) {
						state.purchaseHistory.push(purchase);
					}
				}

				// Sort purchase history by timestamp (newest first)
				state.purchaseHistory.sort((a, b) => b.timestamp - a.timestamp);
			});
		},

		/**
		 * Get data for cloud sync
		 * Requirement 13.1
		 */
		getCloudData: (): GamificationCloudData => {
			const state = get();
			return {
				totalXP: state.totalXP,
				currentCoins: state.currentCoins,
				lifetimeCoinsEarned: state.lifetimeCoinsEarned,
				dailyStreak: state.dailyStreak,
				lastSessionDate: state.lastSessionDate,
				totalFocusedMinutes: state.totalFocusedMinutes,
				dailyFocusStats: state.dailyFocusStats,
				totalSessionsCompleted: state.totalSessionsCompleted,
				unlockedAchievements: state.unlockedAchievements,
				purchaseHistory: state.purchaseHistory,
				lastUpdated: Date.now(),
			};
		},

		/**
		 * Clear all gamification data
		 */
		clearAllData: () => {
			set((state) => {
				state.totalXP = 0;
				state.currentCoins = 0;
				state.lifetimeCoinsEarned = 0;
				state.dailyStreak = 0;
				state.lastSessionDate = null;
				state.flowCombo = 0;
				state.lastBreakEndTime = null;
				state.totalFocusedMinutes = 0;
				state.dailyFocusStats = {};
				state.totalSessionsCompleted = 0;
				state.unlockedAchievements = [];
				state.purchaseHistory = [];
				state.activeTab = "timer";
				state.showLootModal = false;
				state.lastSessionReward = null;
				state.pendingTrade = null;
				state.isTradingBotLoading = false;
			});
		},
	}),
	{
		name: "puter-gamification",
		excludeFromPersist: [
			"showLootModal",
			"isTradingBotLoading",
			"pendingTrade",
			"lastSessionReward",
		],
	},
);

export { useGamificationStore };
