"use client";

import * as React from "react";
import {
	PanelLeft,
	Volume2,
	MessageSquare,
	Loader2,
	SlidersHorizontal,
} from "lucide-react";
import {
	useConcurrencyStore,
	MAX_CONCURRENT_CHATS,
} from "@/stores/use-concurrency-store";
import { Button } from "@/components/ui/button";
import {
	SettingsPanel,
	SettingsButton,
} from "@/components/shared/settings-panel";
import { AnimatedSelect } from "@/components/ui/animated-select";
import { SessionType } from "@/lib/types";
import { useSettingsStore } from "@/stores/use-settings-store";
import { AVAILABLE_MODELS, AVAILABLE_TTS_MODELS } from "@/lib/constants";
import { sortModels, filterModels } from "@/lib/utils/model-helpers";
import { ProfileButton } from "@/components/shared/auth";

interface ChatHeaderProps {
	onToggleSidebar: () => void;
	showSettings: boolean;
	onToggleSettings: () => void;
	sessionType?: SessionType;
	modelSearchQuery?: string;
}

export function ChatHeader({
	onToggleSidebar,
	showSettings,
	onToggleSettings,
	sessionType = "chat",
	modelSearchQuery = "",
}: ChatHeaderProps) {
	const isTTS = sessionType === "tts";
	const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
	const { settings, updateSettings } = useSettingsStore();

	// Use Zustand store for active chat count (reactive)
	const activeChats = useConcurrencyStore(
		(state) => state.activeTasks.chat.length,
	);

	// Get sorted and filtered model options
	const currentModelList = isTTS ? AVAILABLE_TTS_MODELS : AVAILABLE_MODELS;
	const sortOrder = settings.modelSortOrder || "fi";

	const modelOptions = React.useMemo(() => {
		let models = currentModelList;
		if (modelSearchQuery) {
			models = filterModels(models, modelSearchQuery);
		}
		models = sortModels(models, sortOrder);
		return models.map((m) => ({
			value: m.id,
			label: m.name,
		}));
	}, [currentModelList, modelSearchQuery, sortOrder]);

	return (
		<>
			<header className="sticky top-0 z-20 p-2 sm:p-3 bg-background/95 backdrop-blur-md border-b flex flex-nowrap items-center justify-between shrink-0 gap-2">
				<div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
					<Button
						variant="ghost"
						size="icon"
						onClick={onToggleSidebar}
						className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
					>
						<PanelLeft size={16} className="sm:hidden" />
						<PanelLeft size={18} className="hidden sm:block" />
					</Button>

					<div className="h-4 w-px bg-border mx-0.5 sm:mx-1 hidden sm:block shrink-0" />

					{/* Current Mode Indicator */}
					<div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground shrink-0">
						{isTTS ? (
							<>
								<Volume2 size={14} className="text-primary sm:hidden" />
								<Volume2 size={16} className="text-primary hidden sm:block" />
								<span className="hidden lg:inline">Text to Speech</span>
							</>
						) : (
							<>
								<MessageSquare size={14} className="text-primary sm:hidden" />
								<MessageSquare
									size={16}
									className="text-primary hidden sm:block"
								/>
								<span className="hidden lg:inline">AI Chat</span>
							</>
						)}
					</div>

					{/* Model Selector */}
					<div className="h-4 w-px bg-border mx-0.5 sm:mx-1 shrink-0" />
					<AnimatedSelect
						value={isTTS ? settings.ttsModelId : settings.modelId}
						onValueChange={(value: string) =>
							isTTS
								? updateSettings({ ttsModelId: value })
								: updateSettings({ modelId: value })
						}
						options={modelOptions}
						placeholder="Model"
						className="w-[100px] sm:w-[120px] md:w-[150px] lg:w-[180px] shrink-0"
					/>
				</div>

				<div className="flex items-center gap-1 sm:gap-2 shrink-0">
					{/* Profile Button */}
					<ProfileButton className="h-8 sm:h-9" />

					{/* Active Chats Indicator */}
					{activeChats > 0 && (
						<div
							className="hidden sm:flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary/10 rounded-full text-[10px] sm:text-xs font-medium"
							title={`${activeChats} of ${MAX_CONCURRENT_CHATS} concurrent chats active`}
						>
							<Loader2 size={12} className="animate-spin text-primary" />
							<span className="text-primary">
								{activeChats}/{MAX_CONCURRENT_CHATS}
							</span>
						</div>
					)}

					{/* Config Toggle Button */}
					<Button
						variant={showSettings ? "secondary" : "ghost"}
						size="icon"
						onClick={onToggleSettings}
						className="h-8 w-8 sm:h-9 sm:w-9 lg:w-auto lg:px-3"
						title="Model Config"
					>
						<SlidersHorizontal size={16} />
						<span className="hidden lg:inline ml-1.5">Config</span>
					</Button>

					{/* Settings Button */}
					<SettingsButton
						onClick={() => setIsSettingsOpen(true)}
						className="h-8 w-8 sm:h-9 sm:w-9"
					/>
				</div>
			</header>

			{/* Shared Settings Panel */}
			<SettingsPanel
				isOpen={isSettingsOpen}
				onClose={() => setIsSettingsOpen(false)}
				routeType={isTTS ? "tts" : "chat"}
			/>
		</>
	);
}
