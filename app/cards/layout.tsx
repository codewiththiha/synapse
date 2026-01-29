import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "AI Flashcards",
	description:
		"Generate study flashcards instantly with AI. Upload images, paste text, or describe topics - AI creates comprehensive flashcard sets for effective learning and memorization.",
	keywords: [
		"AI flashcards",
		"study cards",
		"flashcard generator",
		"learning tools",
		"memorization",
		"spaced repetition",
		"study app",
		"education",
	],
	openGraph: {
		title: "AI Flashcards | Synapse",
		description:
			"Generate study flashcards instantly with AI. Upload images or paste text to create comprehensive flashcard sets.",
	},
};

export default function CardsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
