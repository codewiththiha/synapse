"use client";

/**
 * AuthInitializer
 *
 * Automatically creates a temporary Puter account when user opens the site
 * without being signed in. This ensures AI features work immediately.
 *
 * Features:
 * - Waits for Puter SDK to be fully loaded
 * - Auto-creates temp account on first visit
 * - Retries on failure (every 2 seconds, up to 10 attempts)
 * - Only runs when user is not signed in
 */

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/use-auth-store";
import { devLog } from "@/lib/utils/dev-logger";
import { toast } from "@/stores/use-global-store";

const MAX_RETRY_ATTEMPTS = 10;
const RETRY_DELAY_MS = 2000;
const PUTER_CHECK_INTERVAL_MS = 500;

export function AuthInitializer() {
	const hasStartedRef = useRef(false);
	const attemptCountRef = useRef(0);
	const isAttemptingRef = useRef(false);

	useEffect(() => {
		// Only run once
		if (hasStartedRef.current) return;
		hasStartedRef.current = true;

		const waitForPuter = (): Promise<void> => {
			return new Promise((resolve) => {
				const check = () => {
					if (typeof window !== "undefined" && window.puter?.auth) {
						devLog("Puter SDK is ready");
						resolve();
					} else {
						devLog("Waiting for Puter SDK...");
						setTimeout(check, PUTER_CHECK_INTERVAL_MS);
					}
				};
				check();
			});
		};

		const createTempAccount = async () => {
			if (isAttemptingRef.current) return;
			if (attemptCountRef.current >= MAX_RETRY_ATTEMPTS) {
				devLog("Max retry attempts reached for temp account creation");
				return;
			}

			isAttemptingRef.current = true;
			attemptCountRef.current += 1;

			devLog(
				`Attempting temp account creation (attempt ${attemptCountRef.current}/${MAX_RETRY_ATTEMPTS})`,
			);

			try {
				// Check if already signed in first
				const isAlreadySignedIn = window.puter.auth.isSignedIn();
				devLog("Current sign-in status:", isAlreadySignedIn);

				if (isAlreadySignedIn) {
					// Already signed in, just update the store
					const user = await window.puter.auth.getUser();
					useAuthStore.getState().setUser(user);
					devLog("User already signed in:", user?.username);
					isAttemptingRef.current = false;
					return;
				}

				// Not signed in, create temp account
				const result = await window.puter.auth.signIn({
					attempt_temp_user_creation: true,
				});

				devLog("Sign in result:", result);

				if (result?.user) {
					useAuthStore.getState().setUser(result.user);
					devLog("Temp account created successfully:", result.user.username);

					if (result.user.is_temp) {
						toast({
							title: "Ready to Go!",
							description:
								"A temporary account has been created. Sign up to save your data permanently.",
							duration: 5000,
						});
					} else {
						toast({
							description: `Welcome back, ${result.user.username}!`,
						});
					}

					attemptCountRef.current = 0;
				} else {
					devLog("Sign in returned no user, will retry...");
					scheduleRetry();
				}
			} catch (error) {
				devLog("Temp account creation failed:", error);
				scheduleRetry();
			} finally {
				isAttemptingRef.current = false;
			}
		};

		const scheduleRetry = () => {
			if (attemptCountRef.current < MAX_RETRY_ATTEMPTS) {
				setTimeout(() => {
					createTempAccount();
				}, RETRY_DELAY_MS);
			}
		};

		// Start the process
		const init = async () => {
			await waitForPuter();

			// Mark auth store as initialized
			useAuthStore.setState({ isInitialized: true });

			// Now try to create temp account
			await createTempAccount();
		};

		init();
	}, []);

	// This component doesn't render anything
	return null;
}
