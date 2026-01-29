"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";

/**
 * Custom navigation hook that provides loading state during route transitions
 * Use this instead of router.push() for better UX feedback
 */
export function useNavigation() {
	const router = useRouter();
	const pathname = usePathname();
	const [isPending, startTransition] = useTransition();

	const navigate = useCallback(
		(href: string) => {
			if (href === pathname) return;

			startTransition(() => {
				router.push(href);
			});
		},
		[router, pathname],
	);

	const replace = useCallback(
		(href: string) => {
			startTransition(() => {
				router.replace(href);
			});
		},
		[router],
	);

	return {
		navigate,
		replace,
		isNavigating: isPending,
		pathname,
	};
}
