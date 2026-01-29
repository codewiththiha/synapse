/**
 * Notification Service
 * Reusable system-level notification service
 *
 * Features:
 * - Browser notifications (only when tab is not focused)
 * - Audio alerts with customizable sounds
 * - Continuous alarm that loops until stopped
 * - Permission management
 */

type NotificationOptions = {
	title: string;
	body?: string;
	icon?: string;
	tag?: string; // Prevents duplicate notifications
	sound?: "beep" | "chime" | "none";
	requireInteraction?: boolean;
};

class NotificationService {
	private audioContext: AudioContext | null = null;
	private alarmInterval: NodeJS.Timeout | null = null;
	private isAlarmPlaying = false;
	private audioUnlocked = false;

	/**
	 * Request notification permission
	 */
	async requestPermission(): Promise<boolean> {
		if (typeof window === "undefined" || !("Notification" in window)) {
			return false;
		}

		if (Notification.permission === "granted") {
			return true;
		}

		if (Notification.permission === "denied") {
			return false;
		}

		try {
			const permission = await Notification.requestPermission();
			return permission === "granted";
		} catch {
			return false;
		}
	}

	/**
	 * Check if permission is granted (checks live, not cached)
	 */
	private hasPermission(): boolean {
		if (typeof window === "undefined" || !("Notification" in window)) {
			return false;
		}
		return Notification.permission === "granted";
	}

	/**
	 * Check if tab is currently focused
	 */
	private isTabFocused(): boolean {
		if (typeof document === "undefined") return true;
		return document.visibilityState === "visible" && document.hasFocus();
	}

	/**
	 * Get or create audio context
	 */
	private getAudioContext(): AudioContext | null {
		if (typeof window === "undefined") return null;

		try {
			if (!this.audioContext) {
				const AudioContextClass =
					window.AudioContext ||
					(window as unknown as { webkitAudioContext: typeof AudioContext })
						.webkitAudioContext;
				if (!AudioContextClass) return null;
				this.audioContext = new AudioContextClass();
			}

			// Resume context if suspended (required for user gesture policy)
			if (this.audioContext.state === "suspended") {
				this.audioContext.resume().catch(() => {
					// Silently fail - will retry on next user interaction
				});
			}

			return this.audioContext;
		} catch {
			return null;
		}
	}

	/**
	 * Unlock audio context (call from user gesture like button click)
	 * This is required by browsers before audio can play
	 */
	async unlockAudio(): Promise<boolean> {
		if (this.audioUnlocked) return true;

		const ctx = this.getAudioContext();
		if (!ctx) return false;

		try {
			// Create and play a silent buffer to unlock audio
			if (ctx.state === "suspended") {
				await ctx.resume();
			}

			// Play a silent sound to fully unlock
			const buffer = ctx.createBuffer(1, 1, 22050);
			const source = ctx.createBufferSource();
			source.buffer = buffer;
			source.connect(ctx.destination);
			source.start(0);

			this.audioUnlocked = true;
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Play a single alarm beep
	 */
	private playAlarmBeep(): void {
		const ctx = this.getAudioContext();
		if (!ctx || ctx.state !== "running") return;

		try {
			const oscillator = ctx.createOscillator();
			const gainNode = ctx.createGain();

			oscillator.connect(gainNode);
			gainNode.connect(ctx.destination);

			// Alarm sound - higher pitch, more urgent
			oscillator.frequency.value = 880; // A5
			oscillator.type = "square";
			gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
			gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
			oscillator.start(ctx.currentTime);
			oscillator.stop(ctx.currentTime + 0.15);
		} catch {
			// Silently fail - audio might not be unlocked yet
		}
	}

	/**
	 * Play a beep sound using Web Audio API
	 */
	private playBeep(type: "beep" | "chime" = "beep"): void {
		const ctx = this.getAudioContext();
		if (!ctx || ctx.state !== "running") return;

		try {
			const oscillator = ctx.createOscillator();
			const gainNode = ctx.createGain();

			oscillator.connect(gainNode);
			gainNode.connect(ctx.destination);

			if (type === "beep") {
				// Simple beep
				oscillator.frequency.value = 800;
				oscillator.type = "sine";
				gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
				oscillator.start(ctx.currentTime);
				oscillator.stop(ctx.currentTime + 0.5);
			} else {
				// Chime - two tones
				oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
				oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
				oscillator.type = "sine";
				gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
				oscillator.start(ctx.currentTime);
				oscillator.stop(ctx.currentTime + 0.4);
			}
		} catch {
			// Silently fail - audio might not be unlocked yet
		}
	}

	/**
	 * Start continuous alarm sound that loops until stopped
	 */
	startAlarm(): void {
		if (this.isAlarmPlaying) return;

		this.isAlarmPlaying = true;

		// Try to unlock and resume audio context first
		const ctx = this.getAudioContext();
		if (ctx && ctx.state === "suspended") {
			ctx
				.resume()
				.then(() => {
					this.playAlarmBeep();
				})
				.catch(() => {
					// Audio context couldn't be resumed - needs user interaction
				});
		} else {
			// Play immediately
			this.playAlarmBeep();
		}

		// Then loop every 500ms (beep-beep pattern)
		this.alarmInterval = setInterval(() => {
			if (this.isAlarmPlaying) {
				this.playAlarmBeep();
			}
		}, 500);
	}

	/**
	 * Stop the continuous alarm
	 */
	stopAlarm(): void {
		this.isAlarmPlaying = false;

		if (this.alarmInterval) {
			clearInterval(this.alarmInterval);
			this.alarmInterval = null;
		}
	}

	/**
	 * Check if alarm is currently playing
	 */
	isAlarmActive(): boolean {
		return this.isAlarmPlaying;
	}

	/**
	 * Show a notification
	 * Only shows browser notification if tab is not focused
	 * Always plays sound if specified
	 */
	async notify(options: NotificationOptions): Promise<void> {
		const {
			title,
			body,
			icon,
			tag,
			sound = "beep",
			requireInteraction = false,
		} = options;

		// Play sound regardless of focus state
		if (sound !== "none") {
			this.playBeep(sound);
		}

		// Only show browser notification if tab is not focused AND permission granted
		if (!this.isTabFocused() && this.hasPermission()) {
			try {
				new Notification(title, {
					body,
					icon: icon || "/favicon.ico",
					tag,
					requireInteraction,
				});
			} catch {
				// Notification failed - silently ignore
			}
		}
	}

	/**
	 * Check if notifications are supported
	 */
	isSupported(): boolean {
		return typeof window !== "undefined" && "Notification" in window;
	}

	/**
	 * Get current permission status
	 */
	getPermissionStatus(): NotificationPermission | "unsupported" {
		if (!this.isSupported()) return "unsupported";
		return Notification.permission;
	}

	/**
	 * Check if audio is unlocked and ready to play
	 */
	isAudioReady(): boolean {
		const ctx = this.getAudioContext();
		return ctx !== null && ctx.state === "running";
	}
}

export const notificationService = new NotificationService();
