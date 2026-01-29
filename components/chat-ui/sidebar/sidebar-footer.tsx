"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { alert } from "@/stores/use-global-store";

interface SidebarFooterProps {
	onClearAll: () => void;
}

export function SidebarFooter({ onClearAll }: SidebarFooterProps) {
	const handleClearAll = () => {
		alert({
			title: "Clear All History?",
			description:
				"This will permanently delete all chat sessions and folders. This action cannot be undone.",
			confirmLabel: "Clear All",
			variant: "destructive",
			onConfirm: onClearAll,
		});
	};

	return (
		<div className="p-4 border-t bg-background shrink-0">
			<div className="grid grid-cols-2 gap-2">
				<ThemeToggle />
				<Button
					variant="outline"
					size="sm"
					className="text-xs"
					onClick={handleClearAll}
				>
					<Trash2 size={14} className="mr-2" />
					Clear
				</Button>
			</div>

			<div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-widest">
				<span>Powered by Puter</span>
				<div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
			</div>
		</div>
	);
}
