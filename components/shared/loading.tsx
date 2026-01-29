/**
 * Unified Loading Component
 * Single branded loading screen for the entire app
 *
 * Usage:
 * - AppLoader: Full branded loading (initial app load shows "Powered by MaMa")
 * - AppLoader with message: Route transitions show custom message instead
 */

"use client";

import { motion } from "framer-motion";

// ============================================
// Spinner Component
// ============================================

function Spinner() {
	return (
		<div className="relative" style={{ width: 64, height: 64 }}>
			{/* Outer pulsing rings */}
			<motion.div
				className="absolute inset-0 rounded-full border-2 border-primary/20"
				animate={{
					scale: [1, 1.4, 1],
					opacity: [0.4, 0, 0.4],
				}}
				transition={{
					duration: 2,
					repeat: Infinity,
					ease: "easeInOut",
				}}
				style={{ width: 64, height: 64 }}
			/>
			<motion.div
				className="absolute rounded-full border-2 border-primary/30"
				animate={{
					scale: [1, 1.25, 1],
					opacity: [0.6, 0.1, 0.6],
				}}
				transition={{
					duration: 2,
					repeat: Infinity,
					ease: "easeInOut",
					delay: 0.2,
				}}
				style={{ width: 64, height: 64 }}
			/>

			{/* Spinning gradient ring */}
			<motion.div
				className="w-16 h-16 rounded-full"
				style={{
					background: `conic-gradient(from 0deg, transparent, hsl(var(--primary)), transparent)`,
					WebkitMask:
						"radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px))",
					mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 4px))",
				}}
				animate={{ rotate: 360 }}
				transition={{
					duration: 1.2,
					repeat: Infinity,
					ease: "linear",
				}}
			/>

			{/* Center glow */}
			<motion.div
				className="absolute top-1/2 left-1/2 w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-primary"
				animate={{
					scale: [1, 1.3, 1],
					opacity: [1, 0.6, 1],
				}}
				transition={{
					duration: 1.2,
					repeat: Infinity,
					ease: "easeInOut",
				}}
			/>
		</div>
	);
}

// ============================================
// AppLoader - Single branded loading screen
// ============================================

interface AppLoaderProps {
	/** Custom message to show instead of "Powered by MaMa" */
	message?: string;
}

/**
 * Branded loading screen
 * - Without message: Shows "Powered by MaMa" (initial app load)
 * - With message: Shows the message (route transitions)
 */
export function AppLoader({ message }: AppLoaderProps) {
	return (
		<div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
			<motion.div
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.4, ease: "easeOut" }}
				className="flex flex-col items-center gap-8"
			>
				<Spinner />

				{/* Brand */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2, duration: 0.4 }}
					className="text-center"
				>
					<h1 className="text-xl font-bold tracking-wider text-foreground">
						@codewiththiha
					</h1>
					<motion.div
						initial={{ scaleX: 0 }}
						animate={{ scaleX: 1 }}
						transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
						className="h-0.5 bg-linear-to-r from-transparent via-primary to-transparent mt-2 origin-center"
					/>
				</motion.div>

				{/* Message or Powered by */}
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.6, duration: 0.4 }}
					className="text-xs text-muted-foreground tracking-widest uppercase"
				>
					{message ? (
						message
					) : (
						<>
							Powered by{" "}
							<span className="font-semibold text-foreground">MaMa</span>
						</>
					)}
				</motion.p>
			</motion.div>
		</div>
	);
}

// ============================================
// Legacy exports for backward compatibility
// ============================================

/** @deprecated Use AppLoader instead */
export const LoadingScreen = AppLoader;

/** @deprecated Use AppLoader with message prop instead */
export function PageLoader({
	message,
	feature,
}: {
	variant?: "fullscreen" | "inline";
	message?: string;
	feature?: string;
	className?: string;
}) {
	const featureMessages: Record<string, string> = {
		chat: "Loading Chat...",
		tts: "Loading TTS...",
		cards: "Loading Cards...",
		planner: "Loading Planner...",
	};
	const displayMessage =
		message ?? (feature ? featureMessages[feature] : undefined);
	return <AppLoader message={displayMessage} />;
}

/** @deprecated Use AppLoader with message prop instead */
export function RouteLoading({
	message,
	feature,
}: {
	variant?: "fullscreen" | "inline";
	message?: string;
	feature?: string;
}) {
	const featureMessages: Record<string, string> = {
		chat: "Loading Chat...",
		tts: "Loading TTS...",
		cards: "Loading Cards...",
		planner: "Loading Planner...",
	};
	const displayMessage =
		message ?? (feature ? featureMessages[feature] : undefined);
	return <AppLoader message={displayMessage} />;
}

/** @deprecated Use AppLoader instead */
export function SuspenseLoader() {
	return <AppLoader />;
}

/** @deprecated Use AppLoader instead */
export function MiniLoader() {
	return <AppLoader />;
}
