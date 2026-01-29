/**
 * Auth Store
 * Manages Puter authentication state
 */

import { createStore } from "@/lib/createStore";
import { AuthStore, PuterUser, SignInResult } from "@/lib/types/auth";
import { devLog } from "@/lib/utils/dev-logger";

const useAuthStore = createStore<AuthStore>(
	(set, get) => ({
		user: null,
		isSignedIn: false,
		isLoading: false,
		isInitialized: false,

		setUser: (user) =>
			set((state) => {
				state.user = user;
				state.isSignedIn = !!user;
			}),

		setLoading: (loading) =>
			set((state) => {
				state.isLoading = loading;
			}),

		initialize: async () => {
			if (get().isInitialized) return;

			set((state) => {
				state.isLoading = true;
			});

			try {
				await get().checkAuthStatus();
			} catch (error) {
				devLog("Auth initialization error:", error);
			} finally {
				set((state) => {
					state.isLoading = false;
					state.isInitialized = true;
				});
			}
		},

		checkAuthStatus: async () => {
			if (typeof window === "undefined" || !window.puter?.auth) {
				devLog("Puter not available");
				return;
			}

			try {
				const isSignedIn = window.puter.auth.isSignedIn();
				devLog("Auth status check:", isSignedIn);

				if (isSignedIn) {
					const user = await window.puter.auth.getUser();
					set((state) => {
						state.user = user;
						state.isSignedIn = true;
					});
				} else {
					set((state) => {
						state.user = null;
						state.isSignedIn = false;
					});
				}
			} catch (error) {
				devLog("Check auth status error:", error);
				set((state) => {
					state.user = null;
					state.isSignedIn = false;
				});
			}
		},

		signIn: async (options) => {
			if (typeof window === "undefined" || !window.puter?.auth) {
				devLog("Puter not available for sign in");
				return null;
			}

			set((state) => {
				state.isLoading = true;
			});

			try {
				const result = await window.puter.auth.signIn(options);
				devLog("Sign in result:", result);

				if (result?.user) {
					set((state) => {
						state.user = result.user;
						state.isSignedIn = true;
					});
				}

				return result;
			} catch (error) {
				devLog("Sign in error:", error);
				return null;
			} finally {
				set((state) => {
					state.isLoading = false;
				});
			}
		},

		signOut: async () => {
			if (typeof window === "undefined" || !window.puter?.auth) {
				devLog("Puter not available for sign out");
				return;
			}

			set((state) => {
				state.isLoading = true;
			});

			try {
				await window.puter.auth.signOut();
				set((state) => {
					state.user = null;
					state.isSignedIn = false;
				});
				devLog("Signed out successfully");
			} catch (error) {
				devLog("Sign out error:", error);
			} finally {
				set((state) => {
					state.isLoading = false;
				});
			}
		},

		getUser: async () => {
			if (typeof window === "undefined" || !window.puter?.auth) {
				return null;
			}

			try {
				const user = await window.puter.auth.getUser();
				set((state) => {
					state.user = user;
				});
				return user;
			} catch (error) {
				devLog("Get user error:", error);
				return null;
			}
		},
	}),
	{
		name: "puter-auth",
		skipPersist: true, // Auth state should not be persisted
	},
);

export { useAuthStore };
