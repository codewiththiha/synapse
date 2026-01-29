"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouteTransition } from "./route-transition";
import { cn } from "@/lib/utils";

interface TransitionLinkProps extends React.ComponentProps<typeof Link> {
	children: React.ReactNode;
	className?: string;
}

/**
 * Link component that triggers route transition loading indicator
 * Use this for navigation links to provide visual feedback
 */
export function TransitionLink({
	href,
	children,
	className,
	onClick,
	...props
}: TransitionLinkProps) {
	const pathname = usePathname();
	const { startTransition } = useRouteTransition();
	const hrefString = typeof href === "string" ? href : href.pathname || "";

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		// Don't trigger transition for same page or external links
		if (hrefString !== pathname && !hrefString.startsWith("http")) {
			startTransition();
		}
		onClick?.(e);
	};

	return (
		<Link
			href={href}
			className={cn(className)}
			onClick={handleClick}
			{...props}
		>
			{children}
		</Link>
	);
}
