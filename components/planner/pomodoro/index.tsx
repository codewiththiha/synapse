"use client";

/**
 * Pomodoro Timer Modal
 * Focus timer with work/break sessions and gamification
 * Displays as a centered modal with blur background when opened
 * Uses horizontal layout on desktop (sidebar tabs + content)
 *
 * Requirements: 7.1, 7.2, 7.3, 8.6, 10.4 - Tabbed interface with Timer, Shop, Profile tabs
 */

import { AnimatePresence, motion } from "framer-motion";
import { useGamificationStore } from "@/stores/use-gamification-store";
import { usePlannerStore } from "@/stores/use-planner-store";
import {
	TimerTab,
	ShopTab,
	ProfileTab,
	LootModal,
	type TabType,
} from "@/components/planner/gamification";
import {
	triggerCelebration,
	triggerCriticalSuccessCelebration,
	triggerLevelUpCelebration,
} from "@/lib/utils/confetti";
import {
	showMultipleAchievementNotifications,
	showLevelUpNotification,
} from "@/lib/utils/achievement-notification";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Clock, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export function PomodoroTimer() {
	const { isPomodoroVisible, togglePomodoroVisibility } = usePlannerStore();
	const {
		activeTab,
		setActiveTab,
		showLootModal,
		lastSessionReward,
		hideLootModal,
	} = useGamificationStore();
	const isMobile = useMobile();

	// Track if we've triggered confetti for the current modal
	const confettiTriggeredRef = useRef(false);

	// Trigger confetti and notifications when loot modal opens - Requirements 7.1, 10.4
	useEffect(() => {
		if (showLootModal && lastSessionReward && !confettiTriggeredRef.current) {
			confettiTriggeredRef.current = true;

			// Trigger appropriate confetti based on session result
			if (lastSessionReward.criticalSuccess) {
				triggerCriticalSuccessCelebration();
			} else {
				triggerCelebration();
			}

			// Show level up notification and celebration - Requirement 5.3
			if (lastSessionReward.leveledUp && lastSessionReward.newLevel) {
				// Delay level up notification slightly so it doesn't overlap with loot modal
				setTimeout(() => {
					triggerLevelUpCelebration();
					showLevelUpNotification(lastSessionReward.newLevel!);
				}, 500);
			}

			// Show achievement notifications - Requirement 10.4
			if (
				lastSessionReward.newlyUnlockedAchievements &&
				lastSessionReward.newlyUnlockedAchievements.length > 0
			) {
				// Delay achievement notifications to show after loot modal is visible
				// and after level up notification if applicable
				const achievementDelay = lastSessionReward.leveledUp ? 1500 : 800;
				setTimeout(() => {
					showMultipleAchievementNotifications(
						lastSessionReward.newlyUnlockedAchievements!,
					);
				}, achievementDelay);
			}
		}
		if (!showLootModal) {
			confettiTriggeredRef.current = false;
		}
	}, [showLootModal, lastSessionReward]);

	const handleTabChange = (tab: TabType) => {
		setActiveTab(tab);
	};

	const handleCollect = () => {
		hideLootModal();
	};

	const handleClose = () => {
		togglePomodoroVisibility();
	};

	// Tab configuration
	const tabs: { id: TabType; icon: typeof Clock; label: string }[] = [
		{ id: "timer", icon: Clock, label: "Timer" },
		{ id: "shop", icon: ShoppingBag, label: "Shop" },
		{ id: "profile", icon: User, label: "Profile" },
	];

	return (
		<>
			<AnimatePresence>
				{isPomodoroVisible && (
					<>
						{/* Backdrop with blur */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="fixed inset-0 bg-background/80 backdrop-blur-sm z-60"
							onClick={handleClose}
						/>

						{/* Modal - Different layout for mobile vs desktop */}
						{isMobile ? (
							<MobileModal
								tabs={tabs}
								activeTab={activeTab}
								onTabChange={handleTabChange}
								onClose={handleClose}
							/>
						) : (
							<DesktopModal
								tabs={tabs}
								activeTab={activeTab}
								onTabChange={handleTabChange}
								onClose={handleClose}
							/>
						)}
					</>
				)}
			</AnimatePresence>

			{/* Loot Modal - Requirements 7.2, 7.3 */}
			<LootModal
				reward={lastSessionReward}
				isOpen={showLootModal}
				onCollect={handleCollect}
			/>
		</>
	);
}

interface ModalProps {
	tabs: { id: TabType; icon: typeof Clock; label: string }[];
	activeTab: TabType;
	onTabChange: (tab: TabType) => void;
	onClose: () => void;
}

/**
 * Desktop Modal - Horizontal layout with sidebar tabs on left
 */
function DesktopModal({ tabs, activeTab, onTabChange, onClose }: ModalProps) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.95 }}
			transition={{ type: "spring", stiffness: 300, damping: 25 }}
			className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-background border rounded-2xl shadow-2xl z-60 flex overflow-hidden"
			style={{ height: "min(600px, 80vh)" }}
		>
			{/* Left sidebar with vertical tabs */}
			<div className="w-16 bg-muted/30 border-r flex flex-col items-center py-4 gap-1 shrink-0">
				{tabs.map(({ id, icon: Icon, label }) => (
					<Tooltip key={id} delayDuration={300}>
						<TooltipTrigger asChild>
							<button
								onClick={() => onTabChange(id)}
								className={cn(
									"flex items-center justify-center w-12 h-12 rounded-xl transition-all",
									"hover:bg-accent hover:text-accent-foreground",
									activeTab === id
										? "bg-primary text-primary-foreground shadow-md"
										: "text-muted-foreground",
								)}
								aria-label={label}
								aria-pressed={activeTab === id}
							>
								<Icon className="w-5 h-5" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="right" sideOffset={8}>
							{label}
						</TooltipContent>
					</Tooltip>
				))}
			</div>

			{/* Main content area */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
					<h2 className="font-semibold text-lg">
						{tabs.find((t) => t.id === activeTab)?.label || "Pomodoro"}
					</h2>
					<Button variant="ghost" size="icon" onClick={onClose}>
						<X size={18} />
					</Button>
				</div>

				{/* Tab content */}
				<div className="flex-1 overflow-y-auto p-6">
					<AnimatePresence mode="wait">
						{activeTab === "timer" && (
							<motion.div
								key="timer"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
								transition={{ duration: 0.15 }}
								className="h-full"
							>
								<TimerTabDesktop />
							</motion.div>
						)}
						{activeTab === "shop" && (
							<motion.div
								key="shop"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
								transition={{ duration: 0.15 }}
								className="h-full"
							>
								<ShopTab />
							</motion.div>
						)}
						{activeTab === "profile" && (
							<motion.div
								key="profile"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
								transition={{ duration: 0.15 }}
								className="h-full"
							>
								<ProfileTab />
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</div>
		</motion.div>
	);
}

/**
 * Mobile Modal - Slides up from bottom with horizontal tabs
 */
function MobileModal({ tabs, activeTab, onTabChange, onClose }: ModalProps) {
	const tabWidth = 100 / tabs.length;
	const getTabPosition = () => {
		const index = tabs.findIndex((t) => t.id === activeTab);
		return index * tabWidth;
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: "100%" }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: "100%" }}
			transition={{ type: "spring", damping: 25, stiffness: 300 }}
			className="fixed inset-x-0 bottom-0 bg-background border-t rounded-t-2xl shadow-xl z-60 flex flex-col"
			style={{ maxHeight: "90vh" }}
		>
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b shrink-0">
				<h2 className="font-semibold text-lg">Pomodoro</h2>
				<Button variant="ghost" size="icon" onClick={onClose}>
					<X size={18} />
				</Button>
			</div>

			{/* Horizontal tabs */}
			<div className="flex border-b shrink-0 relative">
				{tabs.map(({ id, icon: Icon, label }) => (
					<button
						key={id}
						onClick={() => onTabChange(id)}
						className={cn(
							"flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
							activeTab === id
								? "text-primary"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<Icon size={16} />
						<span>{label}</span>
					</button>
				))}
				<div
					className="absolute bottom-0 h-0.5 bg-primary transition-all duration-200 ease-out"
					style={{ left: `${getTabPosition()}%`, width: `${tabWidth}%` }}
				/>
			</div>

			{/* Tab content */}
			<div className="flex-1 overflow-y-auto p-4">
				<AnimatePresence mode="wait">
					{activeTab === "timer" && (
						<motion.div
							key="timer"
							initial={{ opacity: 0, x: 10 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -10 }}
							transition={{ duration: 0.15 }}
						>
							<TimerTab />
						</motion.div>
					)}
					{activeTab === "shop" && (
						<motion.div
							key="shop"
							initial={{ opacity: 0, x: 10 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -10 }}
							transition={{ duration: 0.15 }}
						>
							<ShopTab />
						</motion.div>
					)}
					{activeTab === "profile" && (
						<motion.div
							key="profile"
							initial={{ opacity: 0, x: 10 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -10 }}
							transition={{ duration: 0.15 }}
						>
							<ProfileTab />
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	);
}

/**
 * Desktop-optimized Timer Tab with horizontal layout
 */
function TimerTabDesktop() {
	return (
		<div className="h-full flex gap-8">
			{/* Left side - Timer */}
			<div className="flex-1 flex flex-col items-center justify-center">
				<TimerTab />
			</div>
		</div>
	);
}
