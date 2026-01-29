"use client";

import { motion } from "framer-motion";
import {
	MessageSquare,
	Volume2,
	Layers,
	ArrowRight,
	Calendar,
} from "lucide-react";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
} from "@/components/ui/card";
import { TransitionLink } from "@/components/shared/transition-link";
import { slideUp } from "@/lib/utils/motion-variants";

const features = [
	{
		title: "AI Chat",
		description:
			"Have intelligent conversations with various AI models. Supports reasoning, images, and more.",
		icon: MessageSquare,
		href: "/chat",
		gradient: "from-blue-500/10 to-purple-500/10",
		iconColor: "text-blue-500",
	},
	{
		title: "Text to Speech",
		description:
			"Convert your text into natural-sounding speech with multiple voices and models.",
		icon: Volume2,
		href: "/tts",
		gradient: "from-green-500/10 to-emerald-500/10",
		iconColor: "text-green-500",
	},
	{
		title: "Flashcards",
		description:
			"Generate AI-powered flashcards from images, documents, or text. Study smarter with explanations.",
		icon: Layers,
		href: "/cards",
		gradient: "from-orange-500/10 to-amber-500/10",
		iconColor: "text-orange-500",
	},
	{
		title: "AI Planner",
		description:
			"Schedule events with natural language. Includes a Pomodoro timer for focused work sessions.",
		icon: Calendar,
		href: "/planner",
		gradient: "from-pink-500/10 to-rose-500/10",
		iconColor: "text-pink-500",
	},
];

export function FeatureCards() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl mx-auto">
			{features.map((feature, index) => (
				<motion.div
					key={feature.title}
					variants={slideUp}
					initial="initial"
					animate="animate"
					transition={{ delay: index * 0.1 }}
				>
					<TransitionLink href={feature.href}>
						<Card
							className={`group cursor-pointer transition-all hover:shadow-md hover:border-primary/20 bg-gradient-to-br ${feature.gradient}`}
						>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<div
										className={`p-2 rounded-lg bg-background/80 ${feature.iconColor}`}
									>
										<feature.icon size={20} />
									</div>
									<ArrowRight
										size={16}
										className="text-muted-foreground opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0"
									/>
								</div>
								<CardTitle className="text-lg mt-3">{feature.title}</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription>{feature.description}</CardDescription>
							</CardContent>
						</Card>
					</TransitionLink>
				</motion.div>
			))}
		</div>
	);
}
