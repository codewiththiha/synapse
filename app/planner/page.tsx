"use client";

/**
 * AI Planner Page
 *
 * Layout:
 * - Center: Calendar view
 * - Right: Pomodoro timer (toggleable)
 * - Bottom: Floating assistant button
 */

import { useEffect, useState } from "react";
import { usePlannerStore } from "@/stores/use-planner-store";
import { PlannerCalendar } from "@/components/planner/calendar";
import { PomodoroTimer } from "@/components/planner/pomodoro";
import { PlannerAssistant } from "@/components/planner/assistant/planner-assistant";
import { Button } from "@/components/ui/button";
import {
	SettingsPanel,
	SettingsButton,
} from "@/components/shared/settings-panel";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Timer, Calendar as CalendarIcon, Home, Trash2 } from "lucide-react";
import { AppLoader } from "@/components/shared/loading";
import Link from "next/link";
import { toast } from "@/stores/use-global-store";
import { ProfileButton } from "@/components/shared/auth";

export default function PlannerPage() {
	const {
		isPomodoroVisible,
		togglePomodoroVisibility,
		blocks,
		clearBlocks,
		isInitialized,
		initializePlanner,
	} = usePlannerStore();

	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [showClearDialog, setShowClearDialog] = useState(false);

	useEffect(() => {
		if (!isInitialized) {
			initializePlanner();
		}
	}, [isInitialized, initializePlanner]);

	const handleClearAll = () => {
		clearBlocks();
		toast({ description: "All events cleared" });
		setShowClearDialog(false);
	};

	if (!isInitialized) {
		return <AppLoader message="Loading Planner..." />;
	}

	return (
		<div className="flex h-screen bg-background">
			{/* Main Calendar Area */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Header */}
				<header className="flex items-center justify-between p-2 sm:p-4 border-b shrink-0">
					<div className="flex items-center gap-2 sm:gap-3">
						<Link href="/">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 sm:h-9 sm:w-9"
							>
								<Home size={16} className="sm:hidden" />
								<Home size={18} className="hidden sm:block" />
							</Button>
						</Link>
						<div className="flex items-center gap-1.5 sm:gap-2">
							<CalendarIcon size={16} className="text-primary sm:hidden" />
							<CalendarIcon
								size={20}
								className="text-primary hidden sm:block"
							/>
							<h1 className="text-base sm:text-xl font-semibold">AI Planner</h1>
						</div>
					</div>

					<div className="flex items-center gap-1 sm:gap-2">
						{blocks.length > 0 && (
							<AlertDialog
								open={showClearDialog}
								onOpenChange={setShowClearDialog}
							>
								<AlertDialogTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 text-muted-foreground hover:text-destructive"
									>
										<Trash2 size={16} />
										<span className="hidden sm:inline ml-1">Clear</span>
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent className="rounded-2xl max-w-[90vw] sm:max-w-lg">
									<AlertDialogHeader>
										<AlertDialogTitle>Clear all events?</AlertDialogTitle>
										<AlertDialogDescription>
											This will permanently delete all scheduled events. This
											action cannot be undone.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel className="rounded-xl">
											Cancel
										</AlertDialogCancel>
										<AlertDialogAction
											onClick={handleClearAll}
											className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											Clear All
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						)}

						{/* Pomodoro toggle */}
						<Button
							variant={isPomodoroVisible ? "secondary" : "outline"}
							size="icon"
							onClick={togglePomodoroVisibility}
							className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
						>
							<Timer size={16} />
							<span className="hidden sm:inline ml-1.5">Pomodoro</span>
						</Button>

						<ProfileButton />
						<SettingsButton onClick={() => setIsSettingsOpen(true)} />
					</div>
				</header>

				{/* Calendar */}
				<div className="flex-1 p-2 sm:p-4 overflow-hidden">
					<PlannerCalendar />
				</div>
			</div>

			{/* Pomodoro Timer Modal - renders its own modal with backdrop */}
			<PomodoroTimer />

			{/* Floating Assistant */}
			<PlannerAssistant />

			{/* Settings Panel */}
			<SettingsPanel
				isOpen={isSettingsOpen}
				onClose={() => setIsSettingsOpen(false)}
				routeType="planner"
			/>
		</div>
	);
}
