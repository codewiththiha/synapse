"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	Settings,
	X,
	Sun,
	Moon,
	HardDrive,
	Trash2,
	Sparkles,
	Loader2,
	CheckSquare,
	Square,
	AlertTriangle,
	MessageSquare,
	Volume2,
	Layers,
	FolderOpen,
	BookOpen,
	ChevronRight,
	Languages,
	Calendar,
	Cloud,
	Trophy,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { AnimatedSelect } from "@/components/ui/animated-select";
import { cn } from "@/lib/utils";
import { storage, StorageStatus } from "@/lib/utils/storage";
import { useSessionsStore } from "@/stores/use-sessions-store";
import { useFlashcardStore } from "@/stores/use-flashcard-store";
import { usePlannerStore } from "@/stores/use-planner-store";
import { useGamificationStore } from "@/stores/use-gamification-store";
import { useSettingsStore } from "@/stores/use-settings-store";
import { storageAI, StorageItem } from "@/lib/services/storage-ai";
import { toast, alert } from "@/stores/use-global-store";
import { FLASHCARD_LANGUAGES } from "@/lib/constants";
import { FlashcardLanguage } from "@/lib/types";
import { SMOOTH_TWEEN } from "@/lib/constants/animations";
import { useMobile } from "@/hooks/use-mobile";
import { BETA_MODE } from "@/lib/config/features";
import { googleCalendarService } from "@/lib/services/google-calendar";
import { ExportDialog } from "@/components/planner/calendar/export-dialog";

type RouteType = "chat" | "tts" | "cards" | "home" | "planner";

interface SettingsPanelProps {
	isOpen: boolean;
	onClose: () => void;
	routeType?: RouteType;
}

export function SettingsPanel({
	isOpen,
	onClose,
	routeType = "home",
}: SettingsPanelProps) {
	const { theme, setTheme } = useTheme();
	const isMobile = useMobile();
	const [activeTab, setActiveTab] = React.useState<
		"general" | "storage" | "calendar"
	>("general");
	const [storageStatus, setStorageStatus] =
		React.useState<StorageStatus | null>(null);

	// Show calendar tab only in beta mode and on planner route
	const showCalendarTab = BETA_MODE && routeType === "planner";

	React.useEffect(() => {
		if (isOpen) {
			setStorageStatus(storage.getStorageStatus());
		}
	}, [isOpen]);

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 bg-background/80 backdrop-blur-sm z-60"
						onClick={onClose}
					/>
					{/* Panel - Different layout for mobile vs desktop */}
					{isMobile ? (
						<motion.div
							initial={{ opacity: 0, x: "100%" }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: "100%" }}
							transition={SMOOTH_TWEEN}
							className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l shadow-xl z-60 flex flex-col"
						>
							<SettingsPanelContent
								theme={theme}
								setTheme={setTheme}
								activeTab={activeTab}
								setActiveTab={setActiveTab}
								storageStatus={storageStatus}
								setStorageStatus={setStorageStatus}
								routeType={routeType}
								onClose={onClose}
								showCalendarTab={showCalendarTab}
							/>
						</motion.div>
					) : (
						<motion.div
							initial={{ opacity: 0, scale: 0.9, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.9, y: 20 }}
							transition={{ type: "spring", stiffness: 300, damping: 25 }}
							className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-background border rounded-2xl shadow-2xl z-60 flex flex-col overflow-hidden"
							style={{ maxHeight: "85vh" }}
						>
							<SettingsPanelContent
								theme={theme}
								setTheme={setTheme}
								activeTab={activeTab}
								setActiveTab={setActiveTab}
								storageStatus={storageStatus}
								setStorageStatus={setStorageStatus}
								routeType={routeType}
								onClose={onClose}
								showCalendarTab={showCalendarTab}
							/>
						</motion.div>
					)}
				</>
			)}
		</AnimatePresence>
	);
}

function SettingsPanelContent({
	theme,
	setTheme,
	activeTab,
	setActiveTab,
	storageStatus,
	setStorageStatus,
	routeType,
	onClose,
	showCalendarTab,
}: {
	theme: string | undefined;
	setTheme: (theme: string) => void;
	activeTab: "general" | "storage" | "calendar";
	setActiveTab: (tab: "general" | "storage" | "calendar") => void;
	storageStatus: StorageStatus | null;
	setStorageStatus: (status: StorageStatus | null) => void;
	routeType: RouteType;
	onClose: () => void;
	showCalendarTab: boolean;
}) {
	// Calculate tab width and position based on number of tabs
	const tabCount = showCalendarTab ? 3 : 2;
	const tabWidth = 100 / tabCount;
	const getTabPosition = () => {
		if (activeTab === "general") return 0;
		if (activeTab === "storage") return tabWidth;
		return tabWidth * 2; // calendar
	};

	return (
		<>
			<div className="flex items-center justify-between p-4 border-b shrink-0">
				<div className="flex items-center gap-2">
					<Settings size={20} />
					<h2 className="font-semibold">Settings</h2>
				</div>
				<Button variant="ghost" size="icon" onClick={onClose}>
					<X size={18} />
				</Button>
			</div>

			{/* Tabs - simple CSS transition for indicator */}
			<div className="flex border-b shrink-0 relative">
				<button
					onClick={() => setActiveTab("general")}
					className={cn(
						"flex-1 py-3 text-sm font-medium transition-colors",
						activeTab === "general"
							? "text-primary"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					General
				</button>
				<button
					onClick={() => setActiveTab("storage")}
					className={cn(
						"flex-1 py-3 text-sm font-medium transition-colors",
						activeTab === "storage"
							? "text-primary"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					Storage
				</button>
				{showCalendarTab && (
					<button
						onClick={() => setActiveTab("calendar")}
						className={cn(
							"flex-1 py-3 text-sm font-medium transition-colors",
							activeTab === "calendar"
								? "text-primary"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						Calendar
					</button>
				)}
				<div
					className="absolute bottom-0 h-0.5 bg-primary transition-all duration-200 ease-out"
					style={{ left: `${getTabPosition()}%`, width: `${tabWidth}%` }}
				/>
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				{activeTab === "general" ? (
					<GeneralSettings theme={theme} setTheme={setTheme} />
				) : activeTab === "storage" ? (
					<StorageManager
						routeType={routeType}
						storageStatus={storageStatus}
						onRefresh={() => setStorageStatus(storage.getStorageStatus())}
						onClosePanel={onClose}
					/>
				) : (
					<CalendarSettings />
				)}
			</div>
		</>
	);
}

function GeneralSettings({
	theme,
	setTheme,
}: {
	theme: string | undefined;
	setTheme: (theme: string) => void;
}) {
	const { settings, updateSettings } = useSettingsStore();

	const languageOptions = FLASHCARD_LANGUAGES.map(({ value, nativeName }) => ({
		value,
		label: nativeName,
	}));

	const storageMode = settings.storageMode || "local";
	const isPuterAvailable =
		typeof window !== "undefined" && !!window.puter?.kv && !!window.puter?.fs;

	const handleStorageModeChange = async (mode: "local" | "puter") => {
		if (mode === "puter" && !isPuterAvailable) {
			toast({
				description: "Puter cloud sync is not available",
				variant: "destructive",
			});
			return;
		}
		updateSettings({ storageMode: mode });
		toast({
			description:
				mode === "puter"
					? "Cloud sync enabled. Your data will sync automatically."
					: "Switched to local storage only.",
		});
	};

	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<h3 className="text-sm font-medium">Appearance</h3>
				<div className="grid grid-cols-3 gap-2">
					{[
						{ value: "light", icon: Sun, label: "Light" },
						{ value: "dark", icon: Moon, label: "Dark" },
						{ value: "system", icon: Settings, label: "System" },
					].map(({ value, icon: Icon, label }) => (
						<button
							key={value}
							onClick={() => setTheme(value)}
							className={cn(
								"flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
								theme === value
									? "border-primary bg-primary text-primary-foreground"
									: "border-border hover:border-primary/50",
							)}
						>
							<Icon size={20} />
							<span className="text-xs font-medium">{label}</span>
						</button>
					))}
				</div>
			</div>

			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<Cloud size={16} />
					<h3 className="text-sm font-medium">Data Storage</h3>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<button
						onClick={() => handleStorageModeChange("local")}
						className={cn(
							"flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
							storageMode === "local"
								? "border-primary bg-primary text-primary-foreground"
								: "border-border hover:border-primary/50",
						)}
					>
						<HardDrive size={20} />
						<span className="text-xs font-medium">Local Only</span>
					</button>
					<button
						onClick={() => handleStorageModeChange("puter")}
						disabled={!isPuterAvailable}
						className={cn(
							"flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
							storageMode === "puter"
								? "border-primary bg-primary text-primary-foreground"
								: "border-border hover:border-primary/50",
							!isPuterAvailable && "opacity-50 cursor-not-allowed",
						)}
					>
						<Cloud size={20} />
						<span className="text-xs font-medium">Puter Cloud</span>
					</button>
				</div>
				<p className="text-xs text-muted-foreground">
					{storageMode === "puter"
						? "Data syncs to Puter cloud with local backup"
						: "Data stored locally in your browser"}
				</p>
			</div>

			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<Languages size={16} />
					<h3 className="text-sm font-medium">Flashcard Languages</h3>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-1.5">
						<label className="text-xs text-muted-foreground">
							Card Generation
						</label>
						<AnimatedSelect
							value={settings.cardLanguage || "en"}
							onValueChange={(value) =>
								updateSettings({ cardLanguage: value as FlashcardLanguage })
							}
							options={languageOptions}
							placeholder="Select language"
						/>
					</div>
					<div className="space-y-1.5">
						<label className="text-xs text-muted-foreground">Explanation</label>
						<AnimatedSelect
							value={settings.explainLanguage || "en"}
							onValueChange={(value) =>
								updateSettings({ explainLanguage: value as FlashcardLanguage })
							}
							options={languageOptions}
							placeholder="Select language"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

function CalendarSettings() {
	const [isConnected, setIsConnected] = React.useState(false);
	const [isConnecting, setIsConnecting] = React.useState(false);
	const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
	const [connectionError, setConnectionError] = React.useState<string | null>(
		null,
	);

	React.useEffect(() => {
		// Check connection status on mount
		setIsConnected(googleCalendarService.isConnected());
	}, []);

	const handleConnect = async () => {
		setIsConnecting(true);
		setConnectionError(null);
		try {
			const success = await googleCalendarService.connect();
			setIsConnected(success);
			if (success) {
				toast({ description: "Connected to Google Calendar" });
			} else {
				setConnectionError(
					"Connection failed. Check browser console for details.",
				);
				toast({
					description: "Failed to connect. Check console for details.",
					variant: "destructive",
				});
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			setConnectionError(errorMessage);
			toast({
				description: `Connection error: ${errorMessage}`,
				variant: "destructive",
			});
		} finally {
			setIsConnecting(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<Calendar size={16} />
					<h3 className="text-sm font-medium">Google Calendar Integration</h3>
				</div>
				<p className="text-xs text-muted-foreground">
					Connect to Google Calendar to export your planner events.
				</p>

				<div className="space-y-3">
					{/* Connection Status */}
					<div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
						<div className="flex items-center gap-2">
							<div
								className={cn(
									"w-2 h-2 rounded-full",
									isConnected ? "bg-green-500" : "bg-muted-foreground",
								)}
							/>
							<span className="text-sm">
								{isConnected ? "Connected" : "Not connected"}
							</span>
						</div>
						<Button
							variant={isConnected ? "outline" : "default"}
							size="sm"
							onClick={handleConnect}
							disabled={isConnecting}
						>
							{isConnecting ? (
								<Loader2 size={14} className="mr-1 animate-spin" />
							) : null}
							{isConnected ? "Reconnect" : "Connect"}
						</Button>
					</div>

					{/* Error Message */}
					{connectionError && (
						<div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
							<p className="text-xs text-destructive">{connectionError}</p>
						</div>
					)}

					{/* Export Button */}
					<Button
						variant="outline"
						className="w-full"
						onClick={() => setExportDialogOpen(true)}
						disabled={!isConnected}
					>
						<Calendar size={16} className="mr-2" />
						Export Events to Google Calendar
					</Button>
				</div>
			</div>

			<div className="space-y-2 p-3 rounded-lg bg-muted/30">
				<p className="text-xs font-medium">Beta Feature</p>
				<p className="text-xs text-muted-foreground">
					Google Calendar integration is a beta feature. Your events will be
					exported to your primary Google Calendar.
				</p>
			</div>

			<div className="space-y-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
				<p className="text-xs font-medium text-amber-600">Setup Required</p>
				<p className="text-xs text-muted-foreground">
					To use Google Calendar, you need valid OAuth credentials from Google
					Cloud Console. Make sure your app&apos;s authorized JavaScript origins
					include your current domain.
				</p>
			</div>

			<ExportDialog
				open={exportDialogOpen}
				onOpenChange={setExportDialogOpen}
			/>
		</div>
	);
}

function StorageInfoPanel({
	storageStatus,
	routeType,
}: {
	storageStatus: StorageStatus;
	routeType: RouteType;
}) {
	const { blocks } = usePlannerStore();
	const {
		totalXP,
		totalFocusedMinutes,
		currentCoins,
		lifetimeCoinsEarned,
		dailyStreak,
		totalSessionsCompleted,
		getLevel,
	} = useGamificationStore();

	const formatBytes = (bytes: number): string => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	const plannerTotal =
		typeof window !== "undefined" ? new Blob([JSON.stringify(blocks)]).size : 0;
	const estimatedLimit = 10 * 1024 * 1024;
	const usagePercent = (storageStatus.total / estimatedLimit) * 100;
	const chatTotal = storageStatus.chatSessions + storageStatus.folders;
	const ttsTotal = storageStatus.ttsSessions;
	const cardsTotal =
		storageStatus.cards + storageStatus.collections + storageStatus.memos;
	const gamificationTotal = storageStatus.gamification;

	// Get current level
	const currentLevel = getLevel();

	return (
		<div className="space-y-3 p-3 rounded-lg bg-muted/50">
			<div className="space-y-2">
				<div className="flex items-center gap-2 text-sm font-medium">
					<HardDrive size={16} />
					<span>Total Storage</span>
				</div>
				<div className="space-y-1">
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>{storageStatus.totalFormatted} used</span>
						<span>~10 MB limit</span>
					</div>
					<div className="h-2 bg-muted rounded-full overflow-hidden">
						<motion.div
							initial={{ width: 0 }}
							animate={{ width: `${Math.min(usagePercent, 100)}%` }}
							className={cn(
								"h-full rounded-full",
								usagePercent > 80
									? "bg-destructive"
									: usagePercent > 50
										? "bg-yellow-500"
										: "bg-primary",
							)}
						/>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-4 gap-2 pt-2 border-t">
				<div
					className={cn(
						"p-2 rounded-md text-center",
						routeType === "chat"
							? "bg-primary/10 ring-1 ring-primary/30"
							: "bg-muted/50",
					)}
				>
					<MessageSquare size={14} className="mx-auto mb-1 text-blue-500" />
					<p className="text-[10px] text-muted-foreground">Chat</p>
					<p className="text-xs font-medium">{formatBytes(chatTotal)}</p>
				</div>
				<div
					className={cn(
						"p-2 rounded-md text-center",
						routeType === "tts"
							? "bg-primary/10 ring-1 ring-primary/30"
							: "bg-muted/50",
					)}
				>
					<Volume2 size={14} className="mx-auto mb-1 text-green-500" />
					<p className="text-[10px] text-muted-foreground">TTS</p>
					<p className="text-xs font-medium">{formatBytes(ttsTotal)}</p>
				</div>
				<div
					className={cn(
						"p-2 rounded-md text-center",
						routeType === "cards"
							? "bg-primary/10 ring-1 ring-primary/30"
							: "bg-muted/50",
					)}
				>
					<Layers size={14} className="mx-auto mb-1 text-purple-500" />
					<p className="text-[10px] text-muted-foreground">Cards</p>
					<p className="text-xs font-medium">{formatBytes(cardsTotal)}</p>
				</div>
				<div
					className={cn(
						"p-2 rounded-md text-center",
						routeType === "planner"
							? "bg-primary/10 ring-1 ring-primary/30"
							: "bg-muted/50",
					)}
				>
					<Calendar size={14} className="mx-auto mb-1 text-orange-500" />
					<p className="text-[10px] text-muted-foreground">Planner</p>
					<p className="text-xs font-medium">{formatBytes(plannerTotal)}</p>
				</div>
			</div>

			{/* Gamification stats - shown on planner route */}
			{routeType === "planner" && gamificationTotal > 0 && (
				<div className="space-y-2 pt-2 border-t">
					<div className="flex items-center gap-2 text-sm font-medium">
						<Trophy size={14} className="text-yellow-500" />
						<span>Gamification Stats</span>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div className="p-2 rounded-md bg-primary/10 text-center">
							<p className="text-[10px] text-muted-foreground">Level</p>
							<p className="text-sm font-bold text-primary">{currentLevel}</p>
						</div>
						<div className="p-2 rounded-md bg-muted/30 text-center">
							<p className="text-[10px] text-muted-foreground">Total XP</p>
							<p className="text-xs font-medium">{totalXP.toLocaleString()}</p>
						</div>
						<div className="p-2 rounded-md bg-muted/30 text-center">
							<p className="text-[10px] text-muted-foreground">Coins</p>
							<p className="text-xs font-medium">
								{currentCoins.toLocaleString()}
							</p>
						</div>
						<div className="p-2 rounded-md bg-muted/30 text-center">
							<p className="text-[10px] text-muted-foreground">Streak</p>
							<p className="text-xs font-medium">
								{dailyStreak} {dailyStreak === 1 ? "day" : "days"}
							</p>
						</div>
						<div className="p-2 rounded-md bg-muted/30 text-center">
							<p className="text-[10px] text-muted-foreground">Focus Time</p>
							<p className="text-xs font-medium">
								{Math.floor(totalFocusedMinutes / 60)}h{" "}
								{totalFocusedMinutes % 60}m
							</p>
						</div>
						<div className="p-2 rounded-md bg-muted/30 text-center">
							<p className="text-[10px] text-muted-foreground">Sessions</p>
							<p className="text-xs font-medium">{totalSessionsCompleted}</p>
						</div>
					</div>
					<div className="text-[10px] text-muted-foreground text-center">
						Lifetime coins earned: {lifetimeCoinsEarned.toLocaleString()} •
						Storage: {formatBytes(gamificationTotal)}
					</div>
				</div>
			)}

			{routeType === "cards" && (
				<div className="grid grid-cols-3 gap-2 pt-2 border-t">
					<div className="p-2 rounded-md bg-muted/30 text-center">
						<Layers size={12} className="mx-auto mb-1 text-muted-foreground" />
						<p className="text-[10px] text-muted-foreground">Cards</p>
						<p className="text-xs font-medium">
							{formatBytes(storageStatus.cards)}
						</p>
					</div>
					<div className="p-2 rounded-md bg-muted/30 text-center">
						<FolderOpen
							size={12}
							className="mx-auto mb-1 text-muted-foreground"
						/>
						<p className="text-[10px] text-muted-foreground">Collections</p>
						<p className="text-xs font-medium">
							{formatBytes(storageStatus.collections)}
						</p>
					</div>
					<div className="p-2 rounded-md bg-muted/30 text-center">
						<BookOpen
							size={12}
							className="mx-auto mb-1 text-muted-foreground"
						/>
						<p className="text-[10px] text-muted-foreground">Memos</p>
						<p className="text-xs font-medium">
							{formatBytes(storageStatus.memos)}
						</p>
					</div>
				</div>
			)}

			{routeType === "chat" && (
				<div className="grid grid-cols-2 gap-2 pt-2 border-t">
					<div className="p-2 rounded-md bg-muted/30 text-center">
						<MessageSquare
							size={12}
							className="mx-auto mb-1 text-muted-foreground"
						/>
						<p className="text-[10px] text-muted-foreground">Sessions</p>
						<p className="text-xs font-medium">
							{formatBytes(storageStatus.chatSessions)}
						</p>
					</div>
					<div className="p-2 rounded-md bg-muted/30 text-center">
						<FolderOpen
							size={12}
							className="mx-auto mb-1 text-muted-foreground"
						/>
						<p className="text-[10px] text-muted-foreground">Folders</p>
						<p className="text-xs font-medium">
							{formatBytes(storageStatus.folders)}
						</p>
					</div>
				</div>
			)}

			{routeType === "planner" && (
				<div className="grid grid-cols-1 gap-2 pt-2 border-t">
					<div className="p-2 rounded-md bg-muted/30 text-center">
						<Calendar
							size={12}
							className="mx-auto mb-1 text-muted-foreground"
						/>
						<p className="text-[10px] text-muted-foreground">Time Blocks</p>
						<p className="text-xs font-medium">
							{blocks.length} events • {formatBytes(plannerTotal)}
						</p>
					</div>
				</div>
			)}
		</div>
	);
}

function StorageManager({
	routeType,
	storageStatus,
	onRefresh,
	onClosePanel,
}: {
	routeType: RouteType;
	storageStatus: StorageStatus | null;
	onRefresh: () => void;
	onClosePanel: () => void;
}) {
	const { sessions, folders, deleteSession, deleteFolder, clearAllSessions } =
		useSessionsStore();
	const {
		covers,
		collections,
		memos,
		deleteCover,
		deleteCollection,
		deleteMemo,
		clearAllCards,
	} = useFlashcardStore();
	const { blocks, deleteBlock, clearBlocks } = usePlannerStore();
	const {
		totalFocusedMinutes,
		currentCoins,
		purchaseHistory,
		clearAllData: clearGamificationData,
	} = useGamificationStore();

	const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
	const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
	const [isAnalyzing, setIsAnalyzing] = React.useState(false);

	type TreeNode = {
		id: string;
		name: string;
		type: StorageItem["type"];
		children?: TreeNode[];
		parentId?: string;
		messageCount?: number;
	};

	const buildTree = React.useCallback((): TreeNode[] => {
		switch (routeType) {
			case "chat": {
				const chatSessions = sessions.filter((s) => s.type === "chat");
				const folderNodes: TreeNode[] = folders.map((f) => ({
					id: f.id,
					name: f.name || "Untitled Folder",
					type: "folder" as const,
					children: chatSessions
						.filter((s) => s.folderId === f.id)
						.map((s) => ({
							id: s.id,
							name: s.title || "Untitled",
							type: "chat" as const,
							parentId: f.id,
							messageCount: s.messages.length,
						})),
				}));
				const standaloneChats: TreeNode[] = chatSessions
					.filter((s) => !s.folderId)
					.map((s) => ({
						id: s.id,
						name: s.title || "Untitled",
						type: "chat" as const,
						messageCount: s.messages.length,
					}));
				return [...folderNodes, ...standaloneChats];
			}
			case "tts":
				return sessions
					.filter((s) => s.type === "tts")
					.map((s) => ({
						id: s.id,
						name: s.title || "Untitled",
						type: "tts" as const,
						messageCount: s.messages.length,
					}));
			case "cards": {
				const collectionNodes: TreeNode[] = collections.map((col) => ({
					id: col.id,
					name: col.name || "Untitled Collection",
					type: "collection" as const,
					children: covers
						.filter((c) => c.collectionId === col.id)
						.map((c) => ({
							id: c.id,
							name: c.name || "Untitled",
							type: "cover" as const,
							parentId: col.id,
						})),
				}));
				const standaloneCovers: TreeNode[] = covers
					.filter((c) => !c.collectionId)
					.map((c) => ({
						id: c.id,
						name: c.name || "Untitled",
						type: "cover" as const,
					}));
				const memoNodes: TreeNode[] = memos.map((m) => ({
					id: m.id,
					name: (m.question || "Memo").slice(0, 50),
					type: "memo" as const,
				}));
				return [...collectionNodes, ...standaloneCovers, ...memoNodes];
			}
			case "planner": {
				const blockNodes: TreeNode[] = blocks.map((block) => ({
					id: block.id,
					name: block.title || "Untitled Event",
					type: "block" as const,
				}));

				// Add gamification data as a single manageable item if it exists
				const hasGamificationData =
					totalFocusedMinutes > 0 ||
					currentCoins > 0 ||
					purchaseHistory.length > 0;
				if (hasGamificationData) {
					blockNodes.push({
						id: "gamification-data",
						name: `Gamification (${totalFocusedMinutes} min, ${currentCoins} coins, ${purchaseHistory.length} purchases)`,
						type: "gamification" as const,
					});
				}

				return blockNodes;
			}
			default:
				return [];
		}
	}, [
		routeType,
		sessions,
		folders,
		covers,
		collections,
		memos,
		blocks,
		totalFocusedMinutes,
		currentCoins,
		purchaseHistory,
	]);

	const tree = buildTree();

	const getAllItems = React.useCallback((): StorageItem[] => {
		const items: StorageItem[] = [];
		const traverse = (nodes: TreeNode[]) => {
			nodes.forEach((node) => {
				items.push({
					id: node.id,
					name: node.name,
					type: node.type,
					messageCount: node.messageCount,
				});
				if (node.children) traverse(node.children);
			});
		};
		traverse(tree);
		return items;
	}, [tree]);

	const items = getAllItems();

	const getChildIds = (node: TreeNode): string[] => {
		const ids: string[] = [];
		if (node.children) {
			node.children.forEach((child) => {
				ids.push(child.id);
				ids.push(...getChildIds(child));
			});
		}
		return ids;
	};

	const toggleExpand = (id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const toggleSelect = (node: TreeNode) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			const allIds = [node.id, ...getChildIds(node)];
			if (next.has(node.id)) {
				allIds.forEach((id) => next.delete(id));
			} else {
				allIds.forEach((id) => next.add(id));
			}
			return next;
		});
	};

	const selectAll = () => setSelectedIds(new Set(items.map((i) => i.id)));
	const deselectAll = () => setSelectedIds(new Set());

	const handleSmartSuggest = async () => {
		if (items.length === 0) return;
		setIsAnalyzing(true);
		try {
			const suggestedIds = await storageAI.suggestCleanup(items);
			setSelectedIds(new Set(suggestedIds));
			toast({
				description:
					suggestedIds.length > 0
						? `Selected ${suggestedIds.length} items for cleanup`
						: "No unnecessary items found",
			});
		} catch {
			toast({ description: "Could not analyze items", variant: "destructive" });
		} finally {
			setIsAnalyzing(false);
		}
	};

	const handleDeleteSelected = () => {
		if (selectedIds.size === 0) return;
		selectedIds.forEach((id) => {
			// Handle gamification data separately
			if (id === "gamification-data") {
				clearGamificationData();
				return;
			}

			const item = items.find((i) => i.id === id);
			if (!item) return;
			switch (item.type) {
				case "chat":
				case "tts":
					deleteSession(id);
					break;
				case "folder":
					deleteFolder(id);
					break;
				case "cover":
					deleteCover(id);
					break;
				case "collection":
					deleteCollection(id);
					break;
				case "memo":
					deleteMemo(id);
					break;
				case "block":
					deleteBlock(id);
					break;
			}
		});
		toast({ description: `Deleted ${selectedIds.size} items` });
		setSelectedIds(new Set());
		onRefresh();
	};

	const isAllSelected = selectedIds.size === items.length && items.length > 0;

	const handleDeleteClick = () => {
		if (selectedIds.size === 0) return;
		if (isAllSelected) {
			onClosePanel();
			alert({
				title: "Delete all items?",
				description: `You have selected all ${items.length} items. This action cannot be undone.`,
				confirmLabel: "Delete All",
				variant: "destructive",
				onConfirm: handleDeleteSelected,
			});
		} else {
			handleDeleteSelected();
		}
	};

	const handleClearAllClick = () => {
		onClosePanel();
		alert({
			title: "Clear all data?",
			description: `This will permanently delete all data. This action cannot be undone.`,
			confirmLabel: "Clear All",
			variant: "destructive",
			onConfirm: () => {
				switch (routeType) {
					case "chat":
						clearAllSessions("chat");
						break;
					case "tts":
						clearAllSessions("tts");
						break;
					case "cards":
						clearAllCards();
						break;
					case "planner":
						clearBlocks();
						clearGamificationData();
						break;
				}
				toast({ description: "All items cleared" });
				setSelectedIds(new Set());
				onRefresh();
			},
		});
	};

	const getIcon = (type: StorageItem["type"]) => {
		switch (type) {
			case "chat":
				return MessageSquare;
			case "tts":
				return Volume2;
			case "folder":
				return FolderOpen;
			case "cover":
				return Layers;
			case "collection":
				return FolderOpen;
			case "memo":
				return BookOpen;
			case "block":
				return Calendar;
			case "gamification":
				return Trophy;
		}
	};

	const renderNode = (node: TreeNode, depth: number = 0) => {
		const Icon = getIcon(node.type);
		const isSelected = selectedIds.has(node.id);
		const isExpanded = expandedIds.has(node.id);
		const hasChildren = node.children && node.children.length > 0;

		return (
			<div key={node.id}>
				<div
					onClick={() => toggleSelect(node)}
					className={cn(
						"w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors cursor-pointer",
						isSelected
							? "bg-primary/10 border border-primary/30"
							: "hover:bg-muted/50",
					)}
					style={{ paddingLeft: `${depth * 16 + 8}px` }}
				>
					{isSelected ? (
						<CheckSquare size={16} className="text-primary shrink-0" />
					) : (
						<Square size={16} className="text-muted-foreground shrink-0" />
					)}
					{hasChildren && (
						<div
							onClick={(e) => {
								e.stopPropagation();
								toggleExpand(node.id);
							}}
							className="p-0.5 hover:bg-muted rounded cursor-pointer"
						>
							<ChevronRight
								size={14}
								className={cn(
									"transition-transform",
									isExpanded && "rotate-90",
								)}
							/>
						</div>
					)}
					<Icon size={14} className="text-muted-foreground shrink-0" />
					<div className="flex-1 min-w-0">
						<p className="text-sm truncate">{node.name}</p>
						<p className="text-xs text-muted-foreground capitalize">
							{node.type}
							{node.messageCount !== undefined &&
								` • ${node.messageCount} msgs`}
							{hasChildren && ` • ${node.children!.length} items`}
						</p>
					</div>
				</div>
				{hasChildren && isExpanded && (
					<div className="overflow-hidden">
						{node.children!.map((child) => renderNode(child, depth + 1))}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="space-y-4">
			{storageStatus && (
				<StorageInfoPanel storageStatus={storageStatus} routeType={routeType} />
			)}

			{routeType !== "home" && (
				<>
					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleSmartSuggest}
							disabled={isAnalyzing || items.length === 0}
						>
							{isAnalyzing ? (
								<Loader2 size={14} className="mr-1 animate-spin" />
							) : (
								<Sparkles size={14} className="mr-1" />
							)}
							Smart Select
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={
								selectedIds.size === items.length ? deselectAll : selectAll
							}
							disabled={items.length === 0}
						>
							{selectedIds.size === items.length
								? "Deselect All"
								: "Select All"}
						</Button>
						<Button
							variant="destructive"
							size="sm"
							onClick={handleDeleteClick}
							disabled={selectedIds.size === 0}
						>
							<Trash2 size={14} className="mr-1" />
							Delete ({selectedIds.size})
						</Button>
					</div>

					<div className="space-y-1 max-h-[40vh] overflow-y-auto">
						{tree.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">
								No items to manage
							</p>
						) : (
							tree.map((node) => renderNode(node))
						)}
					</div>

					{items.length > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
							onClick={handleClearAllClick}
						>
							<AlertTriangle size={14} className="mr-1" />
							Clear All Data
						</Button>
					)}
				</>
			)}
		</div>
	);
}

export function SettingsButton({
	onClick,
	className,
}: {
	onClick: () => void;
	className?: string;
}) {
	return (
		<Button
			variant="outline"
			size="icon"
			onClick={onClick}
			className={className}
			title="Settings"
		>
			<Settings size={18} />
		</Button>
	);
}
