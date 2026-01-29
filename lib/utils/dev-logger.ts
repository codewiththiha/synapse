/**
 * Development Logger Utility
 * Provides conditional console logging based on a persistent dev mode state
 */

const DEV_MODE_KEY = "puter_dev_mode";

/**
 * Get the current dev mode state from localStorage
 */
function getDevMode(): boolean {
	if (typeof window === "undefined") return false;
	try {
		return localStorage.getItem(DEV_MODE_KEY) === "true";
	} catch {
		return false;
	}
}

/**
 * Set the dev mode state in localStorage
 */
function setDevMode(enabled: boolean): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(DEV_MODE_KEY, enabled ? "true" : "false");
		console.log(`🔧 Dev mode ${enabled ? "enabled" : "disabled"}`);
	} catch {
		// Ignore storage errors
	}
}

/**
 * Toggle dev mode on/off
 */
function toggleDevMode(): boolean {
	const newState = !getDevMode();
	setDevMode(newState);
	return newState;
}

/**
 * Conditional console.log - only logs when dev mode is enabled
 */
function devLog(...args: unknown[]): void {
	if (getDevMode()) {
		console.log(...args);
	}
}

/**
 * Conditional console.warn - only logs when dev mode is enabled
 */
function devWarn(...args: unknown[]): void {
	if (getDevMode()) {
		console.warn(...args);
	}
}

/**
 * Conditional console.error - only logs when dev mode is enabled
 * Note: You may want errors to always show, in which case use console.error directly
 */
function devError(...args: unknown[]): void {
	if (getDevMode()) {
		console.error(...args);
	}
}

/**
 * Conditional console.info - only logs when dev mode is enabled
 */
function devInfo(...args: unknown[]): void {
	if (getDevMode()) {
		console.info(...args);
	}
}

/**
 * Conditional console.table - only logs when dev mode is enabled
 */
function devTable(data: unknown, columns?: string[]): void {
	if (getDevMode()) {
		console.table(data, columns);
	}
}

/**
 * Conditional console.group - only logs when dev mode is enabled
 */
function devGroup(label: string): void {
	if (getDevMode()) {
		console.group(label);
	}
}

/**
 * Conditional console.groupEnd - only logs when dev mode is enabled
 */
function devGroupEnd(): void {
	if (getDevMode()) {
		console.groupEnd();
	}
}

// Export all functions
export {
	getDevMode,
	setDevMode,
	toggleDevMode,
	devLog,
	devWarn,
	devError,
	devInfo,
	devTable,
	devGroup,
	devGroupEnd,
};

// Also expose to window for easy console access
if (typeof window !== "undefined") {
	(window as unknown as Record<string, unknown>).devMode = {
		enable: () => setDevMode(true),
		disable: () => setDevMode(false),
		toggle: toggleDevMode,
		status: getDevMode,
	};
}
