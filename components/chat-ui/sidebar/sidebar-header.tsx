"use client";

import { usePathname } from "next/navigation";
import { X, Home, MessageSquare, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransitionLink } from "@/components/shared/transition-link";
import { cn } from "@/lib/utils";

interface SidebarHeaderProps {
	onClose: () => void;
}

export function SidebarHeader({ onClose }: SidebarHeaderProps) {
	const pathname = usePathname();

	const isChat = pathname.startsWith("/chat");
	const isTts = pathname.startsWith("/tts");

	return (
		<div className="h-14 flex items-center justify-between px-3 border-b bg-background shrink-0">
			<div className="flex items-center gap-1">
				{/* Home button */}
				<TransitionLink href="/">
					<Button
						variant="ghost"
						size="icon"
						className={cn("h-8 w-8", pathname === "/" && "bg-accent")}
					>
						<Home size={16} />
					</Button>
				</TransitionLink>

				{/* Route tabs - custom styled for better visibility */}
				<div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
					<TransitionLink href="/chat">
						<button
							className={cn(
								"flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
								isChat
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground hover:bg-background/50",
							)}
						>
							<MessageSquare size={14} />
							Chat
						</button>
					</TransitionLink>
					<TransitionLink href="/tts">
						<button
							className={cn(
								"flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
								isTts
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground hover:bg-background/50",
							)}
						>
							<Volume2 size={14} />
							TTS
						</button>
					</TransitionLink>
				</div>
			</div>

			<Button
				variant="ghost"
				size="icon"
				onClick={onClose}
				className="md:hidden h-8 w-8"
			>
				<X size={16} />
			</Button>
		</div>
	);
}
