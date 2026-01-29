import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/providers";
import Script from "next/script";
import { ExtractionIndicator } from "@/components/cards/extraction-indicator";
import { GenerationIndicator } from "@/components/cards/generation-indicator";
import { PomodoroCompletionOverlay } from "@/components/planner/pomodoro/completion-overlay";
import { PomodoroTimerWatcher } from "@/components/planner/pomodoro/timer-watcher";
import { PomodoroIndicator } from "@/components/planner/pomodoro/pomodoro-indicator";
import { EventReminderWatcher } from "@/components/planner/calendar/event-reminder-watcher";
import { AuthInitializer } from "@/components/shared/auth/auth-initializer";
import { BETA_MODE } from "@/lib/config/features";

const inter = Inter({ subsets: ["latin"] });

const siteConfig = {
	name: "Synapse",
	description:
		"Free AI-powered productivity suite with chat, text-to-speech, flashcard generation, and smart planning. No signup required - start instantly with Puter's cloud platform.",
	url: "https://puter.com",
	ogImage: "/og-image.png",
	keywords: [
		"AI chat",
		"free AI",
		"text to speech",
		"TTS",
		"flashcards",
		"AI flashcard generator",
		"study tools",
		"AI planner",
		"productivity",
		"Puter",
		"cloud AI",
		"GPT",
		"language models",
		"voice synthesis",
		"learning tools",
	],
};

export const metadata: Metadata = {
	title: {
		default: siteConfig.name,
		template: `%s | ${siteConfig.name}`,
	},
	description: siteConfig.description,
	keywords: siteConfig.keywords,
	authors: [{ name: "Puter" }],
	creator: "Puter",
	publisher: "Puter",
	metadataBase: new URL(siteConfig.url),
	alternates: {
		canonical: "/",
	},
	openGraph: {
		type: "website",
		locale: "en_US",
		url: siteConfig.url,
		title: siteConfig.name,
		description: siteConfig.description,
		siteName: siteConfig.name,
		images: [
			{
				url: siteConfig.ogImage,
				width: 1200,
				height: 630,
				alt: siteConfig.name,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: siteConfig.name,
		description: siteConfig.description,
		images: [siteConfig.ogImage],
		creator: "@paborito",
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	icons: {
		icon: "/favicon.ico",
		shortcut: "/favicon-16x16.png",
		apple: "/apple-touch-icon.png",
	},
	manifest: "/site.webmanifest",
	category: "technology",
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
	],
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
				{/* Google Calendar API scripts - only loaded in beta mode */}
				{BETA_MODE && (
					<>
						<Script
							src="https://apis.google.com/js/api.js"
							strategy="afterInteractive"
						/>
						<Script
							src="https://accounts.google.com/gsi/client"
							strategy="afterInteractive"
						/>
					</>
				)}
			</head>
			<body className={inter.className} suppressHydrationWarning>
				<Providers>
					<AuthInitializer />
					<main className="h-screen overflow-hidden">{children}</main>
					<ExtractionIndicator />
					<GenerationIndicator />
					<PomodoroIndicator />
					<PomodoroTimerWatcher />
					<PomodoroCompletionOverlay />
					<EventReminderWatcher />
				</Providers>
			</body>
		</html>
	);
}
