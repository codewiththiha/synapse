"use client";

/**
 * SidebarTabs Component
 * 3 icon-only buttons (Clock, ShoppingBag, User) in vertical layout with hover tooltips
 * Active tab highlighting
 *
 * Requirements: 8.1, 8.2
 */

import { Clock, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export type TabType = "timer" | "shop" | "profile";

interface SidebarTabsProps {
	activeTab: TabType;
	onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; icon: typeof Clock; label: string }[] = [
	{ id: "timer", icon: Clock, label: "Timer" },
	{ id: "shop", icon: ShoppingBag, label: "Shop" },
	{ id: "profile", icon: User, label: "Profile" },
];

export function SidebarTabs({ activeTab, onTabChange }: SidebarTabsProps) {
	return (
		<div className="flex flex-col gap-1 p-1 bg-muted/50 rounded-lg">
			{tabs.map(({ id, icon: Icon, label }) => (
				<Tooltip key={id} delayDuration={300}>
					<TooltipTrigger asChild>
						<button
							onClick={() => onTabChange(id)}
							className={cn(
								"flex items-center justify-center w-10 h-10 rounded-md transition-all",
								"hover:bg-accent hover:text-accent-foreground",
								activeTab === id
									? "bg-background text-foreground shadow-sm"
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
	);
}
