"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Hook to detect if the current viewport is mobile-sized.
 * Uses window.innerWidth < 768px as the breakpoint.
 *
 * @returns boolean indicating if viewport is mobile-sized
 */
export function useMobile(): boolean {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () =>
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

		// Initial check
		checkMobile();

		// Listen for resize
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	return isMobile;
}

/**
 * Check if viewport is mobile-sized (for non-hook contexts).
 * Use this for initial state or one-time checks.
 */
export function checkIsMobile(): boolean {
	if (typeof window === "undefined") return false;
	return window.innerWidth < MOBILE_BREAKPOINT;
}

export { MOBILE_BREAKPOINT };
