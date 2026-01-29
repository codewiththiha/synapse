"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AlertDialogProvider } from "@/components/ui/alert-dialog-provider";
import { RouteTransitionProvider } from "@/components/shared/route-transition";
import { PuterSyncProvider } from "@/providers/puter-sync-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

interface ProvidersProps {
	children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<TooltipProvider delayDuration={300}>
				<PuterSyncProvider>
					<RouteTransitionProvider>{children}</RouteTransitionProvider>
				</PuterSyncProvider>
			</TooltipProvider>
			<Toaster />
			<AlertDialogProvider />
		</ThemeProvider>
	);
}
