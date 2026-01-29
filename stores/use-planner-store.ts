/**
 * Planner Store
 * Manages time blocks, pomodoro state, and Google Calendar connection
 *
 * Follows existing Zustand + Immer pattern from use-flashcard-store.ts
 */

import { createStore } from "@/lib/createStore";
import {
	TimeBlock,
	PomodoroState,
	DEFAULT_POMODORO,
} from "@/lib/types/planner";
import { useGamificationStore } from "@/stores/use-gamification-store";

type State = {
	// Time blocks
	blocks: TimeBlock[];
	selectedDate: string; // ISO string for persistence
	calendarView: "day" | "week" | "month";

	// Google Calendar (optional)
	isGoogleConnected: boolean;

	// Pomodoro
	pomodoro: PomodoroState;
	isPomodoroVisible: boolean;

	// Loading states
	isGenerating: boolean;
	isExporting: boolean;
	isInitialized: boolean;
};

type Actions = {
	// Initialization
	initializePlanner: () => void;

	// Block actions
	addBlock: (block: TimeBlock) => void;
	addBlocks: (blocks: TimeBlock[]) => void;
	updateBlock: (id: string, updates: Partial<TimeBlock>) => void;
	deleteBlock: (id: string) => void;
	clearBlocks: () => void;

	// Date navigation
	setSelectedDate: (date: Date) => void;
	getSelectedDate: () => Date;
	setCalendarView: (view: "day" | "week" | "month") => void;

	// Google Calendar
	setGoogleConnected: (connected: boolean) => void;
	markBlocksAsExported: (blockIds: string[]) => void;

	// Pomodoro
	togglePomodoroVisibility: () => void;
	updatePomodoroSettings: (settings: Partial<PomodoroState>) => void;
	resetPomodoro: () => void;

	// Pomodoro Timer Controls
	startTimer: () => void;
	pauseTimer: () => void;
	resumeTimer: () => void;
	resetTimer: (newDurationMinutes?: number) => void;
	completeSession: () => void;
	getTimeLeft: () => number; // Returns seconds remaining

	// Partial progress tracking
	trackPartialProgress: () => void; // Track elapsed minutes for XP
	getElapsedMinutes: () => number; // Get minutes elapsed in current session

	// Loading
	setGenerating: (val: boolean) => void;
	setExporting: (val: boolean) => void;
};

type Store = State & Actions;

const usePlannerStore = createStore<Store>(
	(set, get) => ({
		// Initial state
		blocks: [],
		selectedDate: new Date().toISOString(),
		calendarView: "week",
		isGoogleConnected: false,
		pomodoro: DEFAULT_POMODORO,
		isPomodoroVisible: false,
		isGenerating: false,
		isExporting: false,
		isInitialized: false,

		// Initialization
		initializePlanner: () => {
			set((state) => {
				state.isInitialized = true;
			});
		},

		// Block actions
		addBlock: (block) =>
			set((state) => {
				state.blocks.push(block);
			}),

		addBlocks: (blocks) =>
			set((state) => {
				state.blocks.push(...blocks);
			}),

		updateBlock: (id, updates) =>
			set((state) => {
				const index = state.blocks.findIndex((b) => b.id === id);
				if (index !== -1) {
					Object.assign(state.blocks[index], updates);
				}
			}),

		deleteBlock: (id) =>
			set((state) => {
				state.blocks = state.blocks.filter((b) => b.id !== id);
			}),

		clearBlocks: () =>
			set((state) => {
				state.blocks = [];
			}),

		// Date navigation
		setSelectedDate: (date) =>
			set((state) => {
				state.selectedDate = date.toISOString();
			}),

		getSelectedDate: () => {
			return new Date(get().selectedDate);
		},

		setCalendarView: (view) =>
			set((state) => {
				state.calendarView = view;
			}),

		// Google Calendar
		setGoogleConnected: (connected) =>
			set((state) => {
				state.isGoogleConnected = connected;
			}),

		markBlocksAsExported: (blockIds) =>
			set((state) => {
				state.blocks.forEach((block) => {
					if (blockIds.includes(block.id)) {
						block.isExported = true;
					}
				});
			}),

		// Pomodoro
		togglePomodoroVisibility: () =>
			set((state) => {
				state.isPomodoroVisible = !state.isPomodoroVisible;
			}),

		updatePomodoroSettings: (settings) =>
			set((state) => {
				Object.assign(state.pomodoro, settings);
			}),

		resetPomodoro: () =>
			set((state) => {
				state.pomodoro = {
					...DEFAULT_POMODORO,
					duration: state.pomodoro.duration,
					breakDuration: state.pomodoro.breakDuration,
				};
			}),

		// Pomodoro Timer Controls
		startTimer: () =>
			set((state) => {
				const durationMinutes =
					state.pomodoro.currentSession === "work"
						? state.pomodoro.duration
						: state.pomodoro.breakDuration;
				state.pomodoro.timerEndTime = Date.now() + durationMinutes * 60 * 1000;
				state.pomodoro.timerPausedAt = null;
				// Track session start time for gamification (time bonus calculation)
				// Only set if not already set (handles resume case)
				if (state.pomodoro.sessionStartTime === null) {
					state.pomodoro.sessionStartTime = Date.now();
				}
			}),

		pauseTimer: () =>
			set((state) => {
				if (state.pomodoro.timerEndTime) {
					const remaining = Math.max(
						0,
						Math.ceil((state.pomodoro.timerEndTime - Date.now()) / 1000),
					);
					state.pomodoro.timerPausedAt = remaining;
					state.pomodoro.timerEndTime = null;
				}
			}),

		resumeTimer: () =>
			set((state) => {
				if (state.pomodoro.timerPausedAt !== null) {
					state.pomodoro.timerEndTime =
						Date.now() + state.pomodoro.timerPausedAt * 1000;
					state.pomodoro.timerPausedAt = null;
				}
			}),

		resetTimer: (newDurationMinutes) =>
			set((state) => {
				state.pomodoro.timerEndTime = null;
				state.pomodoro.timerPausedAt = null;
				state.pomodoro.sessionStartTime = null; // Reset session start time
				state.pomodoro.partialMinutesTracked = 0; // Reset partial tracking
				state.pomodoro.lastPartialTrackTime = null;
				if (newDurationMinutes !== undefined) {
					if (state.pomodoro.currentSession === "work") {
						state.pomodoro.duration = newDurationMinutes;
					} else {
						state.pomodoro.breakDuration = newDurationMinutes;
					}
				}
			}),

		completeSession: () => {
			// Get session info before state change
			const { pomodoro } = get();
			const wasWork = pomodoro.currentSession === "work";
			const sessionDuration = wasWork
				? pomodoro.duration
				: pomodoro.breakDuration;

			// Use actual session start time if available, otherwise calculate from duration
			// This ensures accurate time bonus calculation (early bird/night owl)
			const sessionStartTime = pomodoro.sessionStartTime
				? new Date(pomodoro.sessionStartTime)
				: new Date(Date.now() - sessionDuration * 60 * 1000);

			// Get partial minutes already tracked (for avoiding double-counting XP)
			const partialMinutesAlreadyTracked = pomodoro.partialMinutesTracked;

			set((state) => {
				state.pomodoro.currentSession = wasWork ? "break" : "work";
				if (wasWork) {
					state.pomodoro.sessionsCompleted += 1;
				}
				state.pomodoro.timerEndTime = null;
				state.pomodoro.timerPausedAt = null;
				state.pomodoro.sessionStartTime = null; // Reset for next session
				state.pomodoro.partialMinutesTracked = 0; // Reset partial tracking
				state.pomodoro.lastPartialTrackTime = null;
			});

			// Award gamification XP and coins for completed work sessions only
			// Requirements: 1.1, 1.2, 1.3, 2.1
			if (wasWork) {
				const gamificationStore = useGamificationStore.getState();
				// Pass remaining minutes (not already tracked) and full duration for coin calculation
				// The completeSession will award coins based on full duration but only remaining XP
				gamificationStore.completeSession(
					sessionDuration,
					sessionStartTime,
					undefined,
					partialMinutesAlreadyTracked, // Pass already tracked minutes
				);
			} else {
				// Break ended - update lastBreakEndTime for flow combo tracking
				// Requirement 15.2
				const gamificationStore = useGamificationStore.getState();
				gamificationStore.setLastBreakEndTime(Date.now());
			}
		},

		getTimeLeft: () => {
			const { pomodoro } = get();
			if (pomodoro.timerPausedAt !== null) {
				return pomodoro.timerPausedAt;
			}
			if (pomodoro.timerEndTime) {
				return Math.max(
					0,
					Math.ceil((pomodoro.timerEndTime - Date.now()) / 1000),
				);
			}
			// Not started - return full duration
			const durationMinutes =
				pomodoro.currentSession === "work"
					? pomodoro.duration
					: pomodoro.breakDuration;
			return durationMinutes * 60;
		},

		/**
		 * Get elapsed minutes in current session
		 * Used for partial progress tracking
		 */
		getElapsedMinutes: () => {
			const { pomodoro } = get();
			if (!pomodoro.sessionStartTime) return 0;

			const durationMinutes =
				pomodoro.currentSession === "work"
					? pomodoro.duration
					: pomodoro.breakDuration;
			const totalSeconds = durationMinutes * 60;
			const timeLeftSeconds = get().getTimeLeft();
			const elapsedSeconds = totalSeconds - timeLeftSeconds;

			return Math.floor(elapsedSeconds / 60);
		},

		/**
		 * Track partial progress for the current session
		 * Awards XP for minutes elapsed since last track
		 * Only tracks work sessions, not breaks
		 * Performance: debounced to run at most once per minute
		 */
		trackPartialProgress: () => {
			const { pomodoro } = get();

			// Only track work sessions
			if (pomodoro.currentSession !== "work") return;

			// Only track if timer is running
			if (!pomodoro.timerEndTime && pomodoro.timerPausedAt === null) return;

			// Calculate elapsed minutes
			const elapsedMinutes = get().getElapsedMinutes();
			const newMinutesToTrack = elapsedMinutes - pomodoro.partialMinutesTracked;

			// Only track if at least 1 new minute has passed
			if (newMinutesToTrack < 1) return;

			// Debounce: don't track more than once per 30 seconds
			const now = Date.now();
			if (
				pomodoro.lastPartialTrackTime &&
				now - pomodoro.lastPartialTrackTime < 30000
			) {
				return;
			}

			// Update partial tracking state
			set((state) => {
				state.pomodoro.partialMinutesTracked = elapsedMinutes;
				state.pomodoro.lastPartialTrackTime = now;
			});

			// Award XP to gamification store
			const gamificationStore = useGamificationStore.getState();
			gamificationStore.trackPartialProgress(newMinutesToTrack);
		},

		// Loading
		setGenerating: (val) =>
			set((state) => {
				state.isGenerating = val;
			}),

		setExporting: (val) =>
			set((state) => {
				state.isExporting = val;
			}),
	}),
	{
		name: "puter-planner",
		excludeFromPersist: ["isGenerating", "isExporting", "isInitialized"],
	},
);

export { usePlannerStore };
