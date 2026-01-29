/**
 * Auth Types
 * Type definitions for Puter authentication
 */

/** Puter User object returned from auth */
export interface PuterUser {
	uuid: string;
	username: string;
	email?: string;
	email_confirmed?: boolean;
	is_temp?: boolean;
	taskbar_items?: unknown[];
	referral_code?: string;
	feature_flags?: Record<string, boolean>;
}

/** Sign In Result from puter.auth.signIn() */
export interface SignInResult {
	user: PuterUser;
	token?: string;
}

/** Auth State */
export interface AuthState {
	user: PuterUser | null;
	isSignedIn: boolean;
	isLoading: boolean;
	isInitialized: boolean;
}

/** Auth Actions */
export interface AuthActions {
	signIn: (options?: {
		attempt_temp_user_creation?: boolean;
	}) => Promise<SignInResult | null>;
	signOut: () => Promise<void>;
	checkAuthStatus: () => Promise<void>;
	getUser: () => Promise<PuterUser | null>;
	initialize: () => Promise<void>;
	setUser: (user: PuterUser | null) => void;
	setLoading: (loading: boolean) => void;
}

export type AuthStore = AuthState & AuthActions;
