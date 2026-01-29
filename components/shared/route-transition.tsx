"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Minimal loading indicator for route transitions
function RouteLoadingIndicator({ onComplete }: { onComplete: () => void }) {
	return (
		<motion.div
			className="fixed top-0 left-0 right-0 z-[100] h-1 bg-primary/20"
			initial={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
		>
			<motion.div
				className="h-full bg-primary"
				initial={{ width: "0%" }}
				animate={{ width: "100%" }}
				transition={{ duration: 0.3, ease: "easeOut" }}
				onAnimationComplete={onComplete}
			/>
		</motion.div>
	);
}

// Compact spinner for suspense fallbacks
export function RouteSpinner({ className }: { className?: string }) {
	return (
		<div className={cn("flex items-center justify-center p-8", className)}>
			<motion.div
				className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full"
				animate={{ rotate: 360 }}
				transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
			/>
		</div>
	);
}

// Full page loading for initial route loads
export function PageLoader() {
	return (
		<div className="h-full w-full flex flex-col items-center justify-center gap-4">
			<motion.div
				className="relative w-12 h-12"
				initial={{ opacity: 0, scale: 0.8 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.2 }}
			>
				<motion.div
					className="absolute inset-0 rounded-full border-2 border-primary/30"
					animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
					transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
				/>
				<motion.div
					className="absolute inset-2 rounded-full border-2 border-primary/50"
					animate={{ scale: [1, 1.1, 1] }}
					transition={{
						duration: 1.5,
						repeat: Infinity,
						ease: "easeInOut",
						delay: 0.1,
					}}
				/>
				<motion.div
					className="absolute inset-4 rounded-full bg-primary"
					animate={{ scale: [1, 0.9, 1] }}
					transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
				/>
			</motion.div>
			<motion.p
				className="text-sm text-muted-foreground"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.3 }}
			>
				Loading...
			</motion.p>
		</div>
	);
}

// Context for route transition state
const RouteTransitionContext = React.createContext<{
	isTransitioning: boolean;
	startTransition: () => void;
	endTransition: () => void;
}>({
	isTransitioning: false,
	startTransition: () => {},
	endTransition: () => {},
});

export function useRouteTransition() {
	return React.useContext(RouteTransitionContext);
}

// Provider component
export function RouteTransitionProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const [isTransitioning, setIsTransitioning] = React.useState(false);
	const [prevPathname, setPrevPathname] = React.useState(pathname);
	const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

	// Clear any existing timeout
	const clearTransitionTimeout = React.useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);

	// Detect route changes
	React.useEffect(() => {
		if (pathname !== prevPathname) {
			setIsTransitioning(true);
			setPrevPathname(pathname);
		}
	}, [pathname, prevPathname]);

	const startTransition = React.useCallback(() => {
		clearTransitionTimeout();
		setIsTransitioning(true);
		// Fallback timeout - auto-hide after 2 seconds if animation doesn't complete
		timeoutRef.current = setTimeout(() => {
			setIsTransitioning(false);
		}, 2000);
	}, [clearTransitionTimeout]);

	const endTransition = React.useCallback(() => {
		clearTransitionTimeout();
		setIsTransitioning(false);
	}, [clearTransitionTimeout]);

	// Cleanup on unmount
	React.useEffect(() => {
		return () => clearTransitionTimeout();
	}, [clearTransitionTimeout]);

	// Also add fallback when isTransitioning becomes true from route change detection
	React.useEffect(() => {
		if (isTransitioning && !timeoutRef.current) {
			timeoutRef.current = setTimeout(() => {
				setIsTransitioning(false);
			}, 2000);
		}
	}, [isTransitioning]);

	return (
		<RouteTransitionContext.Provider
			value={{ isTransitioning, startTransition, endTransition }}
		>
			<AnimatePresence>
				{isTransitioning && (
					<RouteLoadingIndicator onComplete={endTransition} />
				)}
			</AnimatePresence>
			{children}
		</RouteTransitionContext.Provider>
	);
}

// Page wrapper with fade transition
export function PageTransition({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<motion.div
			className={cn("h-full", className)}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.15, ease: "easeOut" }}
		>
			{children}
		</motion.div>
	);
}
