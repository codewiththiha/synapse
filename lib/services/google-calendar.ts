/**
 * Google Calendar Service
 * Handles OAuth and event export to Google Calendar
 *
 * Only active when BETA_MODE is enabled
 */

import { TimeBlock } from "@/lib/types/planner";
import {
	GOOGLE_CALENDAR_CONFIG,
	isGoogleCalendarConfigured,
} from "@/lib/config/features";

declare global {
	interface Window {
		gapi: {
			load: (api: string, callback: () => void) => void;
			client: {
				init: (config: {
					apiKey: string;
					discoveryDocs: string[];
				}) => Promise<void>;
				getToken: () => { access_token: string } | null;
				calendar: {
					events: {
						insert: (params: {
							calendarId: string;
							resource: GoogleCalendarEvent;
						}) => Promise<void>;
					};
				};
			};
		};
		google: {
			accounts: {
				oauth2: {
					initTokenClient: (config: {
						client_id: string;
						scope: string;
						callback: (response: TokenResponse) => void;
					}) => TokenClient;
				};
			};
		};
	}
}

interface TokenResponse {
	error?: string;
	access_token?: string;
}

interface TokenClient {
	callback: (response: TokenResponse) => void;
	requestAccessToken: (options: { prompt: string }) => void;
}

interface GoogleCalendarEvent {
	summary: string;
	description?: string;
	start: {
		dateTime: string;
		timeZone: string;
	};
	end: {
		dateTime: string;
		timeZone: string;
	};
}

class GoogleCalendarService {
	private tokenClient: TokenClient | null = null;
	private isGapiLoaded = false;
	private isGisLoaded = false;
	private initPromise: Promise<void> | null = null;

	/**
	 * Check if the service is available
	 */
	isAvailable(): boolean {
		return isGoogleCalendarConfigured();
	}

	/**
	 * Initialize the Google API Client
	 */
	async initialize(): Promise<void> {
		if (!this.isAvailable()) {
			console.error(
				"Google Calendar is not configured. Check BETA_MODE and credentials.",
			);
			throw new Error("Google Calendar is not configured");
		}

		if (this.isGapiLoaded && this.isGisLoaded) return;

		// Prevent multiple simultaneous initializations
		if (this.initPromise) return this.initPromise;

		this.initPromise = new Promise((resolve, reject) => {
			console.log("Initializing Google Calendar API...");
			console.log(
				"Client ID:",
				GOOGLE_CALENDAR_CONFIG.clientId ? "Set" : "Missing",
			);
			console.log(
				"API Key:",
				GOOGLE_CALENDAR_CONFIG.apiKey ? "Set" : "Missing",
			);

			const checkScripts = setInterval(() => {
				const gapiAvailable = typeof window.gapi !== "undefined";
				const googleAvailable = typeof window.google !== "undefined";

				console.log(
					"Checking scripts - gapi:",
					gapiAvailable,
					"google:",
					googleAvailable,
				);

				if (gapiAvailable && googleAvailable) {
					clearInterval(checkScripts);

					// Load GAPI Client
					window.gapi.load("client", async () => {
						try {
							console.log("Loading GAPI client...");
							await window.gapi.client.init({
								apiKey: GOOGLE_CALENDAR_CONFIG.apiKey,
								discoveryDocs: [GOOGLE_CALENDAR_CONFIG.discoveryDoc],
							});
							this.isGapiLoaded = true;
							console.log("GAPI client loaded successfully");

							// Init GIS Token Client
							console.log("Initializing GIS Token Client...");
							this.tokenClient = window.google.accounts.oauth2.initTokenClient({
								client_id: GOOGLE_CALENDAR_CONFIG.clientId,
								scope: GOOGLE_CALENDAR_CONFIG.scopes,
								callback: () => {}, // Callback defined dynamically later
							});
							this.isGisLoaded = true;
							console.log("GIS Token Client initialized successfully");

							resolve();
						} catch (err) {
							console.error("Error initializing Google Calendar API:", err);
							reject(err);
						}
					});
				}
			}, 100);

			// Timeout after 10 seconds
			setTimeout(() => {
				clearInterval(checkScripts);
				console.error("Google scripts failed to load within 10 seconds");
				reject(
					new Error(
						"Google scripts failed to load. Check internet connection.",
					),
				);
			}, 10000);
		});

		return this.initPromise;
	}

	/**
	 * Request Access Token if not valid
	 */
	private async ensureAuth(): Promise<void> {
		if (!this.tokenClient) {
			console.error("Token client not initialized");
			throw new Error("Token client not initialized");
		}

		return new Promise((resolve, reject) => {
			this.tokenClient!.callback = (resp: TokenResponse) => {
				console.log(
					"OAuth callback received:",
					resp.error ? "Error" : "Success",
				);
				if (resp.error) {
					console.error("OAuth error:", resp.error);
					reject(new Error(resp.error));
				} else {
					console.log("OAuth successful, access token received");
					resolve();
				}
			};

			const hasToken = window.gapi.client.getToken() !== null;
			console.log("Requesting access token, existing token:", hasToken);

			if (!hasToken) {
				// Prompt the user to select an account
				console.log("Requesting new token with consent prompt...");
				this.tokenClient!.requestAccessToken({ prompt: "consent" });
			} else {
				// Skip display of account chooser for existing session
				console.log("Refreshing existing token...");
				this.tokenClient!.requestAccessToken({ prompt: "" });
			}
		});
	}

	/**
	 * Connect to Google Calendar (request permission)
	 */
	async connect(): Promise<boolean> {
		try {
			console.log("Starting Google Calendar connection...");
			await this.initialize();
			console.log("Initialization complete, requesting auth...");
			await this.ensureAuth();
			console.log("Auth complete, connection successful");
			return true;
		} catch (error) {
			console.error("Failed to connect to Google Calendar:", error);
			return false;
		}
	}

	/**
	 * Check if currently connected
	 */
	isConnected(): boolean {
		return (
			this.isGapiLoaded &&
			this.isGisLoaded &&
			window.gapi?.client?.getToken() !== null
		);
	}

	/**
	 * Export blocks to Google Calendar
	 */
	async exportBlocks(blocks: TimeBlock[]): Promise<number> {
		if (!this.isAvailable()) {
			throw new Error("Google Calendar is not configured");
		}

		if (blocks.length === 0) return 0;

		await this.initialize();
		await this.ensureAuth();

		// Get user's timezone
		const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

		let successCount = 0;

		for (const block of blocks) {
			const event: GoogleCalendarEvent = {
				summary: block.title,
				description: block.description || "Created via Synapse Planner",
				start: {
					dateTime: block.start,
					timeZone,
				},
				end: {
					dateTime: block.end,
					timeZone,
				},
			};

			try {
				await window.gapi.client.calendar.events.insert({
					calendarId: "primary",
					resource: event,
				});
				successCount++;
			} catch (err) {
				console.error("Failed to insert event:", block.title, err);
			}
		}

		return successCount;
	}
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();
