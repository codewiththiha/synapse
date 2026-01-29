import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "AI Planner",
	description:
		"Smart AI-powered planner with calendar, Pomodoro timer, and intelligent scheduling. Organize your day with natural language commands and boost productivity.",
	keywords: [
		"AI planner",
		"smart calendar",
		"Pomodoro timer",
		"productivity",
		"task management",
		"scheduling",
		"time management",
		"focus timer",
	],
	openGraph: {
		title: "AI Planner | Synapse",
		description:
			"Smart AI-powered planner with calendar, Pomodoro timer, and intelligent scheduling.",
	},
};

export default function PlannerLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
