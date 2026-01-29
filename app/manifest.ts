import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Synapse",
		short_name: "Synapse",
		description:
			"Free AI-powered productivity suite with chat, text-to-speech, flashcard generation, and smart planning.",
		start_url: "/",
		display: "standalone",
		background_color: "#0a0a0a",
		theme_color: "#0a0a0a",
		orientation: "portrait-primary",
		categories: ["productivity", "education", "utilities"],
		// icons: [
		// 	{
		// 		src: "/icon-192x192.png",
		// 		sizes: "192x192",
		// 		type: "image/png",
		// 		purpose: "maskable",
		// 	},
		// 	{
		// 		src: "/icon-512x512.png",
		// 		sizes: "512x512",
		// 		type: "image/png",
		// 		purpose: "any",
		// 	},
		// ],
	};
}
