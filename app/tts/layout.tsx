import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Text to Speech",
	description:
		"Convert text to natural-sounding speech with AI voices. Free TTS with multiple voice options including Alloy, Echo, Nova, and more. Perfect for accessibility and content creation.",
	keywords: [
		"text to speech",
		"TTS",
		"AI voice",
		"speech synthesis",
		"voice generator",
		"audio conversion",
		"accessibility",
	],
	openGraph: {
		title: "Text to Speech | Synapse",
		description:
			"Convert text to natural-sounding speech with AI voices. Free TTS with multiple voice options.",
	},
};

export default function TtsLayout({ children }: { children: React.ReactNode }) {
	return children;
}
