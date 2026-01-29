/**
 * Flow Combo Calculator
 * Rewards proper focus-break-focus cycles with bonus coins.
 */

export interface FlowComboResult {
	newCombo: number;
	comboBonus: number; // Extra coins from combo
	isMilestone: boolean; // 5, 10, 15, 20 milestones
}

// Grace period: 10 minutes after break ends
export const GRACE_PERIOD_MS = 10 * 60 * 1000;

// Combo timeout: 30 minutes = combo reset
export const COMBO_TIMEOUT_MS = 30 * 60 * 1000;

// Milestone values for celebration notifications
export const COMBO_MILESTONES = [5, 10, 15, 20];

/**
 * Calculate flow combo based on timing between break end and session start
 * @param currentCombo - Current combo count
 * @param lastBreakEndTime - Timestamp when last break ended (ms)
 * @param sessionStartTime - Timestamp when new session started (ms)
 */
export function calculateFlowCombo(
	currentCombo: number,
	lastBreakEndTime: number | null,
	sessionStartTime: number,
): FlowComboResult {
	// No previous break - start combo at 1
	if (!lastBreakEndTime) {
		return { newCombo: 1, comboBonus: 2, isMilestone: false };
	}

	const timeSinceBreak = sessionStartTime - lastBreakEndTime;

	// Started within grace period - increment combo!
	if (timeSinceBreak <= GRACE_PERIOD_MS) {
		const newCombo = currentCombo + 1;
		const comboBonus = newCombo * 2;
		const isMilestone = COMBO_MILESTONES.includes(newCombo);
		return { newCombo, comboBonus, isMilestone };
	}

	// Waited too long (> 30 min) - reset combo
	if (timeSinceBreak > COMBO_TIMEOUT_MS) {
		return { newCombo: 1, comboBonus: 2, isMilestone: false };
	}

	// Between grace and timeout - keep combo but no increment
	const comboBonus = currentCombo * 2;
	return { newCombo: currentCombo, comboBonus, isMilestone: false };
}

/**
 * Calculate combo bonus coins for a given combo count
 * Bonus = combo * 2 coins
 */
export function getComboBonus(combo: number): number {
	return combo * 2;
}
