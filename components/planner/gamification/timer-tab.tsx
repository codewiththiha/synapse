"use client";

/**
 * TimerTab Component
 * Circular SVG progress bar with Play/Pause/Stop controls
 * Session counter, streak display, today's focus time
 * Flow combo indicator during active sessions
 *
 * Requirements: 8.3, 11.1, 11.2, 11.3, 11.4, 11.5, 15.5
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlannerStore } from "@/stores/use-planner-store";
import { useGamificationStore } from "@/stores/use-gamification-store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Settings, X, Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePomodoroTimer } from "@/hooks/use-pomodoro-timer";
import { notificationService } from "@/lib/services/notification-service";

export function TimerTab() {
	const { pomodoro, updatePomodoroSettings, resetPomodoro, resetTimer } =
		usePlannerStore();
	const {
		dailyStreak,
		flowCombo,
		getTodayFocusedMinutes,
		getLevel,
		getLevelProgress,
	} = useGamificationStore();
	const [showSettings, setShowSettings] = useState(false);

	const {
		timeLeft,
		isRunning,
		isPaused,
		start,
		pause,
		resume,
		reset,
		timeDisplayRef,
		progressRef,
	} = usePomodoroTimer();

	const todayMinutes = getTodayFocusedMinutes();
	const level = getLevel();
	const levelProgress = getLevelProgress();

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	const formatMinutes = (minutes: number) => {
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
	};

	const handleReset = () => {
		const duration =
			pomodoro.currentSession === "work"
				? pomodoro.duration
				: pomodoro.breakDuration;
		reset(duration);
		resetPomodoro();
	};

	const handleToggle = () => {
		if (isRunning) {
			pause();
		} else if (isPaused) {
			resume();
		} else {
			notificationService.requestPermission();
			notificationService.unlockAudio();
			start();
		}
	};

	const currentDuration =
		pomodoro.currentSession === "work"
			? pomodoro.duration
			: pomodoro.breakDuration;
	const totalSeconds = currentDuration * 60;
	const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

	return (
		<div className="flex flex-col">
			{/* Settings toggle */}
			<div className="flex items-center justify-end mb-2">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setShowSettings(!showSettings)}
					className="gap-1.5"
				>
					{showSettings ? <X size={16} /> : <Settings size={16} />}
					<span className="text-xs">{showSettings ? "Close" : "Settings"}</span>
				</Button>
			</div>

			<AnimatePresence mode="wait">
				{showSettings ? (
					<TimerSettings
						key="settings"
						duration={pomodoro.duration}
						breakDuration={pomodoro.breakDuration}
						onDurationChange={(val) => {
							updatePomodoroSettings({ duration: val });
							if (
								!isRunning &&
								!isPaused &&
								pomodoro.currentSession === "work"
							) {
								resetTimer(val);
							}
						}}
						onBreakChange={(val) => {
							updatePomodoroSettings({ breakDuration: val });
							if (
								!isRunning &&
								!isPaused &&
								pomodoro.currentSession === "break"
							) {
								resetTimer(val);
							}
						}}
					/>
				) : (
					<motion.div
						key="timer"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="flex flex-col items-center gap-4 flex-1"
					>
						{/* Session indicator */}
						<div
							className={cn(
								"px-3 py-1 rounded-full text-xs font-medium transition-colors",
								pomodoro.currentSession === "work"
									? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
									: "bg-green-500/20 text-green-600 dark:text-green-400",
							)}
						>
							{pomodoro.currentSession === "work" ? "Focus Time" : "Break Time"}
						</div>

						{/* Circular timer - Requirement 11.1 */}
						<div className="relative">
							<svg className="w-40 h-40 -rotate-90">
								<circle
									cx="80"
									cy="80"
									r="72"
									fill="none"
									stroke="currentColor"
									strokeWidth="6"
									className="text-muted/30"
								/>
								<circle
									ref={progressRef}
									cx="80"
									cy="80"
									r="72"
									fill="none"
									stroke="currentColor"
									strokeWidth="6"
									strokeDasharray={452}
									strokeDashoffset={452 - (452 * progress) / 100}
									strokeLinecap="round"
									className={cn(
										"transition-[stroke-dashoffset] duration-200",
										pomodoro.currentSession === "work"
											? "text-blue-500"
											: "text-green-500",
									)}
								/>
							</svg>
							<div className="absolute inset-0 flex items-center justify-center">
								<span
									ref={timeDisplayRef}
									className="text-3xl font-mono font-bold tabular-nums"
								>
									{formatTime(timeLeft)}
								</span>
							</div>
						</div>

						{/* Controls - Requirement 11.2 */}
						<div className="flex items-center gap-2">
							<Button variant="outline" size="icon" onClick={handleReset}>
								<RotateCcw size={16} />
							</Button>
							<Button
								size="default"
								onClick={handleToggle}
								className={cn(
									"w-24 gap-1.5",
									isRunning && "bg-orange-500 hover:bg-orange-600",
								)}
							>
								{isRunning ? (
									<>
										<Pause size={16} />
										Pause
									</>
								) : (
									<>
										<Play size={16} />
										{isPaused ? "Resume" : "Start"}
									</>
								)}
							</Button>
						</div>

						{/* Flow combo indicator - Requirement 15.5 */}
						{isRunning && flowCombo > 0 && (
							<motion.div
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400"
							>
								<Zap className="w-4 h-4" />
								<span className="text-sm font-medium">Flow x{flowCombo}</span>
							</motion.div>
						)}

						{/* Stats row - Requirements 11.3, 11.4 */}
						<div className="w-full grid grid-cols-3 gap-2 text-center">
							{/* Sessions completed - Requirement 11.3 */}
							<div className="p-2 rounded-lg bg-muted/50">
								<p className="text-xs text-muted-foreground">Sessions</p>
								<p className="text-sm font-semibold">
									{pomodoro.sessionsCompleted}
								</p>
							</div>

							{/* Streak display - Requirement 11.4 */}
							<div className="p-2 rounded-lg bg-muted/50">
								<p className="text-xs text-muted-foreground">Streak</p>
								<p className="text-sm font-semibold flex items-center justify-center gap-1">
									{dailyStreak > 0 ? (
										<>
											{dailyStreak}
											<Flame className="w-3.5 h-3.5 text-orange-500" />
										</>
									) : (
										"0"
									)}
								</p>
							</div>

							{/* Today's focus time - Requirement 11.4 */}
							<div className="p-2 rounded-lg bg-muted/50">
								<p className="text-xs text-muted-foreground">Today</p>
								<p className="text-sm font-semibold">
									{formatMinutes(todayMinutes)}
								</p>
							</div>
						</div>

						{/* Level progress bar */}
						<div className="w-full space-y-1">
							<div className="flex items-center justify-between text-xs">
								<span className="font-medium">Level {level}</span>
								<span className="text-muted-foreground">
									{Math.round(levelProgress)}%
								</span>
							</div>
							<div className="h-1.5 bg-muted rounded-full overflow-hidden">
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${levelProgress}%` }}
									className="h-full bg-primary rounded-full"
									transition={{ duration: 0.5, ease: "easeOut" }}
								/>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function TimerSettings({
	duration,
	breakDuration,
	onDurationChange,
	onBreakChange,
}: {
	duration: number;
	breakDuration: number;
	onDurationChange: (val: number) => void;
	onBreakChange: (val: number) => void;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			className="space-y-5"
		>
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<label className="text-sm font-medium">Focus Duration</label>
					<span className="text-sm text-muted-foreground">{duration} min</span>
				</div>
				<Slider
					value={[duration]}
					onValueChange={([val]) => onDurationChange(val)}
					min={5}
					max={60}
					step={5}
				/>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<label className="text-sm font-medium">Break Duration</label>
					<span className="text-sm text-muted-foreground">
						{breakDuration} min
					</span>
				</div>
				<Slider
					value={[breakDuration]}
					onValueChange={([val]) => onBreakChange(val)}
					min={1}
					max={30}
					step={1}
				/>
			</div>

			<p className="text-xs text-muted-foreground">
				Focus for {duration} minutes, then take a {breakDuration} minute break.
			</p>
		</motion.div>
	);
}
