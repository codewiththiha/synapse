"use client";

import * as React from "react";
import { Search, Wrench, Brain } from "lucide-react";
import { AppSettings, ReasoningEffort } from "@/lib/types";
import { AVAILABLE_MODELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface ChatToolsProps {
	settings: AppSettings;
	onUpdateSettings: (tools: Partial<AppSettings>) => void;
}

export function ChatTools({ settings, onUpdateSettings }: ChatToolsProps) {
	const currentModel = AVAILABLE_MODELS.find((m) => m.id === settings.modelId);
	const supportsReasoning =
		currentModel?.capabilities?.supportsReasoning ?? false;
	const supportsTools = currentModel?.capabilities?.supportsTools ?? false;

	const reasoningLevels: ReasoningEffort[] = ["low", "medium", "high", "xhigh"];

	const cycleReasoning = () => {
		const currentIndex = reasoningLevels.indexOf(settings.reasoningEffort);
		const nextLevel =
			reasoningLevels[(currentIndex + 1) % reasoningLevels.length];
		onUpdateSettings({ reasoningEffort: nextLevel });
	};

	const getReasoningColor = (level: ReasoningEffort) => {
		switch (level) {
			case "xhigh":
				return "text-red-500";
			case "high":
				return "text-purple-500";
			case "medium":
				return "text-blue-500";
			case "low":
				return "text-neutral-400";
			default:
				return "text-muted-foreground";
		}
	};

	// Don't render anything if neither reasoning nor tools are supported
	if (!supportsReasoning && !supportsTools) {
		return null;
	}

	return (
		<div className="flex items-center gap-1 mb-1">
			{/* Reasoning Toggle - shows when model supports reasoning */}
			{supportsReasoning && (
				<Button
					variant="ghost"
					size="icon"
					onClick={cycleReasoning}
					title={`Reasoning: ${settings.reasoningEffort}`}
					className="relative"
				>
					<Brain
						size={18}
						className={getReasoningColor(settings.reasoningEffort)}
					/>
					<Badge
						variant="secondary"
						className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[8px]"
					>
						{settings.reasoningEffort[0].toUpperCase()}
					</Badge>
				</Button>
			)}

			{/* Tools Menu - shows when model supports tools */}
			{supportsTools && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" title="Tools">
							<Wrench size={18} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-56">
						<DropdownMenuLabel>AI Tools</DropdownMenuLabel>
						<DropdownMenuSeparator />

						<DropdownMenuCheckboxItem
							checked={settings.tools.webSearch}
							onCheckedChange={(checked) =>
								onUpdateSettings({
									tools: { ...settings.tools, webSearch: checked },
								})
							}
						>
							<Search size={14} className="mr-2" />
							Web Search
						</DropdownMenuCheckboxItem>

						<DropdownMenuCheckboxItem
							checked={settings.tools.imageGeneration}
							onCheckedChange={(checked) =>
								onUpdateSettings({
									tools: { ...settings.tools, imageGeneration: checked },
								})
							}
							disabled
						>
							Image Generation
							<Badge variant="outline" className="ml-2 text-[10px]">
								Soon
							</Badge>
						</DropdownMenuCheckboxItem>

						<DropdownMenuCheckboxItem
							checked={settings.tools.codeExecution}
							onCheckedChange={(checked) =>
								onUpdateSettings({
									tools: { ...settings.tools, codeExecution: checked },
								})
							}
							disabled
						>
							Code Execution
							<Badge variant="outline" className="ml-2 text-[10px]">
								Soon
							</Badge>
						</DropdownMenuCheckboxItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}
