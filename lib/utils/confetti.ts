/**
 * Confetti Utility
 * Celebration effects for session completion and achievement unlocks
 *
 * Requirements: 7.1, 7.4
 */

import confetti from "canvas-confetti";

/**
 * Trigger celebration confetti animation
 * Called on session complete and achievement unlock
 */
export function triggerCelebration(): void {
	// Main burst
	confetti({
		particleCount: 100,
		spread: 70,
		origin: { y: 0.6 },
	});
}

/**
 * Trigger a more subtle confetti for achievements
 */
export function triggerAchievementCelebration(): void {
	// Left side burst
	confetti({
		particleCount: 50,
		angle: 60,
		spread: 55,
		origin: { x: 0, y: 0.6 },
		colors: ["#FFD700", "#FFA500", "#FF6347"],
	});

	// Right side burst
	confetti({
		particleCount: 50,
		angle: 120,
		spread: 55,
		origin: { x: 1, y: 0.6 },
		colors: ["#FFD700", "#FFA500", "#FF6347"],
	});
}

/**
 * Trigger a level up celebration with more particles
 */
export function triggerLevelUpCelebration(): void {
	const duration = 2000;
	const animationEnd = Date.now() + duration;
	const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

	function randomInRange(min: number, max: number): number {
		return Math.random() * (max - min) + min;
	}

	const interval = setInterval(() => {
		const timeLeft = animationEnd - Date.now();

		if (timeLeft <= 0) {
			clearInterval(interval);
			return;
		}

		const particleCount = 50 * (timeLeft / duration);

		// Random bursts from different positions
		confetti({
			...defaults,
			particleCount,
			origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
		});
		confetti({
			...defaults,
			particleCount,
			origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
		});
	}, 250);
}

/**
 * Trigger critical success celebration (golden confetti)
 */
export function triggerCriticalSuccessCelebration(): void {
	confetti({
		particleCount: 150,
		spread: 100,
		origin: { y: 0.5 },
		colors: ["#FFD700", "#FFC107", "#FFEB3B", "#FFF176"],
		shapes: ["star"],
		scalar: 1.2,
	});
}
