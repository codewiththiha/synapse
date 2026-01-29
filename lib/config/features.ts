/**
 * Feature Flags
 * Controls beta and experimental features
 */

/**
 * Beta mode flag - controls visibility of beta features
 * Set via NEXT_PUBLIC_BETA_MODE environment variable
 */
export const BETA_MODE = process.env.NEXT_PUBLIC_BETA_MODE === "true" || false;

/**
 * Google Calendar configuration
 * Only used when BETA_MODE is true
 */
export const GOOGLE_CALENDAR_CONFIG = {
	clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
	apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "",
	discoveryDoc: "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
	scopes: "https://www.googleapis.com/auth/calendar.events",
};

/**
 * Check if Google Calendar is properly configured
 */
export const isGoogleCalendarConfigured = (): boolean => {
	return !!(
		BETA_MODE &&
		GOOGLE_CALENDAR_CONFIG.clientId &&
		GOOGLE_CALENDAR_CONFIG.apiKey
	);
};
