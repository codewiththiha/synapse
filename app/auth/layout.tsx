import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Sign In",
	description:
		"Sign in to Synapse to access AI chat, text-to-speech, flashcard generation, and smart planning tools. Create a free account or continue as a guest.",
	keywords: [
		"sign in",
		"login",
		"Puter account",
		"free AI tools",
		"create account",
	],
	openGraph: {
		title: "Sign In | Synapse",
		description:
			"Sign in to access AI chat, text-to-speech, flashcard generation, and smart planning tools.",
	},
	robots: {
		index: false,
		follow: true,
	},
};

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
