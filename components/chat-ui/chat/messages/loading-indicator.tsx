"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import { LoadingDots } from "@/components/shared/loading-dots";
import { slideUp } from "@/lib/utils/motion-variants";

// Loading indicator shown before assistant message is created
// Has animated bot avatar (same position as message-bubble) + 3 dots
export function LoadingIndicator() {
	return (
		<motion.div
			variants={slideUp}
			initial="initial"
			animate="animate"
			exit="exit"
			className="flex gap-4 md:gap-6 flex-row"
		>
			{/* Avatar - same style as message-bubble, animated */}
			<div className="shrink-0 w-8 h-8 rounded flex items-center justify-center mt-1 border bg-background text-muted-foreground">
				<motion.div
					animate={{
						y: [0, -2, 0],
						rotate: [0, -5, 5, 0],
					}}
					transition={{
						duration: 1.2,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				>
					<Bot size={14} />
				</motion.div>
			</div>

			{/* Content area */}
			<div className="flex flex-col items-start">
				<div className="flex items-center gap-2 mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
					<span>Assistant</span>
				</div>

				{/* 3 animated dots - using shared component */}
				<LoadingDots size={8} className="py-1" />
			</div>
		</motion.div>
	);
}
