/**
 * Achievement Notification Utility
 * Toast notifications for achievement unlocks
 *
 * Requirements: 10.4
 */

import { toast } from "sonner";
import { getAchievementById } from "@/lib/config/achievements";
import { triggerAchievementCelebration } from "@/lib/utils/confetti";

/**
 * Show achievement unlock notification
 * Displays a toast with the achievement icon and title
 */
export function showAchievementNotification(achievementId: string): void {
	const achievement = getAchievementById(achievementId);

	if (!achievement) {
		return;
	}

	// Trigger confetti celebration
	triggerAchievementCelebration();

	// Show toast notification
	toast.success(`${achievement.icon} Achievement Unlocked!`, {
		description: `${achievement.title}: ${achievement.description}`,
		duration: 5000,
	});
}

/**
 * Show multiple achievement notifications with staggered timing
 */
export function showMultipleAchievementNotifications(
	achievementIds: string[],
): void {
	achievementIds.forEach((id, index) => {
		// Stagger notifications by 500ms each
		setTimeout(() => {
			showAchievementNotification(id);
		}, index * 500);
	});
}

/**
 * Show level up notification
 */
export function showLevelUpNotification(newLevel: number): void {
	toast.success("🎉 Level Up!", {
		description: `You've reached Level ${newLevel}!`,
		duration: 5000,
	});
}

/**
 * Show combo milestone notification
 */
export function showComboMilestoneNotification(combo: number): void {
	toast.success(`🔥 ${combo}x Combo!`, {
		description: "Keep the momentum going!",
		duration: 3000,
	});
}
