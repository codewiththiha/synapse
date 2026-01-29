"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, BookOpen, ChevronRight } from "lucide-react";
import { useSessionsStore } from "@/stores/use-sessions-store";
import { useFlashcardStore } from "@/stores/use-flashcard-store";
import { AppLoader } from "@/components/shared/loading";
import { HomeAssistant } from "@/components/home/home-assistant";
import { FeatureCards } from "@/components/home/feature-cards";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { TransitionLink } from "@/components/shared/transition-link";
import { Button } from "@/components/ui/button";
import { ProfileButton } from "@/components/shared/auth";

export default function Home() {
	const { isInitialized, initializeSessions } = useSessionsStore();
	const {
		isInitialized: flashcardsInitialized,
		initializeFlashcards,
		memos,
	} = useFlashcardStore();

	useEffect(() => {
		if (!isInitialized) {
			initializeSessions();
		}
		if (!flashcardsInitialized) {
			initializeFlashcards();
		}
	}, [
		isInitialized,
		initializeSessions,
		flashcardsInitialized,
		initializeFlashcards,
	]);

	if (!isInitialized) {
		return <AppLoader />;
	}

	const recentMemos = memos.slice(0, 3);

	return (
		<div className="h-full flex flex-col items-center justify-center p-4 pt-12 md:pt-4 overflow-y-auto">
			{/* Header with theme toggle and profile */}
			<div className="absolute top-4 right-4 z-10 flex items-center gap-2">
				<ProfileButton />
				<ThemeToggle />
			</div>

			{/* Floating Assistant Button */}
			<HomeAssistant />

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex flex-col items-center gap-6 md:gap-8 w-full max-w-3xl my-auto py-4"
			>
				{/* Logo/Title */}
				<div className="flex flex-col items-center gap-2 text-center">
					<div className="p-3 rounded-2xl bg-primary/10">
						<Sparkles size={32} className="text-primary" />
					</div>
					<h1 className="text-2xl font-semibold mt-2">Synapse</h1>
					<p className="text-muted-foreground text-sm">
						Chat with AI or convert text to speech
					</p>
					<p className="text-muted-foreground/60 text-xs mt-1">
						Tap the <Sparkles size={12} className="inline text-primary" />{" "}
						button to ask anything
					</p>
				</div>

				{/* Feature Cards */}
				<div className="w-full mt-2 md:mt-4">
					<FeatureCards />
				</div>

				{/* Memos Section */}
				{recentMemos.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="w-full mt-1 md:mt-2"
					>
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<BookOpen size={16} />
								<span>Recent Memos</span>
							</div>
							<TransitionLink href="/cards/memos">
								<Button variant="ghost" size="sm" className="text-xs">
									View all
									<ChevronRight size={14} className="ml-1" />
								</Button>
							</TransitionLink>
						</div>
						<div className="grid gap-2">
							{recentMemos.map((memo) => (
								<TransitionLink key={memo.id} href="/cards/memos">
									<motion.div
										whileHover={{ scale: 1.01 }}
										className="p-3 rounded-lg border bg-card hover:border-primary/50 cursor-pointer transition-colors"
									>
										<p className="text-sm font-medium truncate">
											{memo.question}
										</p>
										<p className="text-xs text-muted-foreground line-clamp-1 mt-1">
											{memo.explanation}
										</p>
									</motion.div>
								</TransitionLink>
							))}
						</div>
					</motion.div>
				)}
			</motion.div>
		</div>
	);
}
