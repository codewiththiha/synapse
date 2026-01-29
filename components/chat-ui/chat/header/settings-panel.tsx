"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AnimatedSelect } from "@/components/ui/animated-select";
import { AppSettings, SessionType, ModelSortOrder } from "@/lib/types";

interface SettingsPanelProps {
	settings: AppSettings;
	onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
	sessionType: SessionType;
	searchQuery: string;
	onSearchChange: (query: string) => void;
}

export function SettingsPanel({
	settings,
	onUpdateSettings,
	searchQuery,
	onSearchChange,
}: SettingsPanelProps) {
	const sortOrder = settings.modelSortOrder || "name";

	const sortOptions = [
		{ value: "name", label: "Name" },
		{ value: "free", label: "Free First" },
		{ value: "intelligence", label: "Intelligence" },
		{ value: "fi", label: "Free + Intelligence" },
	];

	return (
		<div className="space-y-3 p-4">
			{/* Search */}
			<div className="relative">
				<Search
					size={14}
					className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					placeholder="Search models..."
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-9 h-9"
				/>
			</div>

			{/* Sort */}
			<AnimatedSelect
				value={sortOrder}
				onValueChange={(v) =>
					onUpdateSettings({ modelSortOrder: v as ModelSortOrder })
				}
				options={sortOptions}
			/>
		</div>
	);
}
