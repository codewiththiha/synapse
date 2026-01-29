import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "AI Chat",
	description:
		"Chat with advanced AI models for free. Get instant answers, code help, creative writing, and more. Powered by GPT, Llama, and other leading language models.",
	keywords: [
		"AI chat",
		"free chatbot",
		"GPT chat",
		"AI assistant",
		"code help",
		"writing assistant",
	],
	openGraph: {
		title: "AI Chat | Synapse",
		description:
			"Chat with advanced AI models for free. Get instant answers, code help, creative writing, and more.",
	},
};

export default function ChatLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
