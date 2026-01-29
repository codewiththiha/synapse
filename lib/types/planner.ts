/**
 * Planner Types
 * Types for the AI Planner feature including time blocks and pomodoro state
 */

/**
 * Time block representing a scheduled event
 */
export interface TimeBlock {
	id: string;
	title: string;
	start: string; // ISO String
	end: string; // ISO String
	color?: string;
	description?: string;
	isExported?: boolean; // Track if exported to Google Calendar
	isNew?: boolean; // Track if newly created for animation
}

/**
 * Pomodoro timer state
 */
export interface PomodoroState {
	duration: number; // in minutes (work session)
	breakDuration: number; // in minutes
	currentSession: "work" | "break";
	sessionsCompleted: number;
	// Timer state for persistence across refreshes
	timerEndTime: number | null; // Unix timestamp when timer ends (null = not running)
	timerPausedAt: number | null; // Remaining seconds when paused (null = not paused)
	// Session start time for gamification (time bonus calculation)
	sessionStartTime: number | null; // Unix timestamp when current session started
	// Partial progress tracking - minutes already credited to gamification
	partialMinutesTracked: number; // Minutes already awarded as XP during this session
	lastPartialTrackTime: number | null; // Timestamp of last partial track (for debouncing)
}

/**
 * Calendar event for react-big-calendar
 */
export interface CalendarEvent {
	id: string;
	title: string;
	start: Date;
	end: Date;
	color?: string;
	description?: string;
	isNew?: boolean;
}

/**
 * Planner command AI response
 */
export interface PlannerCommandAIResponse {
	message: string;
	function: "schedule" | "error";
	blocks: Array<{
		title: string;
		start: string; // ISO string
		end: string; // ISO string
		color?: string;
		description?: string;
	}>;
	error: boolean;
}

/**
 * Planner command result
 */
export interface PlannerCommandResult {
	success: boolean;
	message: string;
	blocksCreated?: number;
}

/**
 * Default colors for different event types
 */
export const EVENT_COLORS = {
	work: "#3b82f6", // blue
	meeting: "#8b5cf6", // purple
	personal: "#10b981", // green
	exercise: "#f59e0b", // amber
	break: "#6b7280", // gray
	default: "#3b82f6",
} as const;

/**
 * Default pomodoro settings
 */
export const DEFAULT_POMODORO: PomodoroState = {
	duration: 25,
	breakDuration: 5,
	currentSession: "work",
	sessionsCompleted: 0,
	timerEndTime: null,
	timerPausedAt: null,
	sessionStartTime: null,
	partialMinutesTracked: 0,
	lastPartialTrackTime: null,
};
