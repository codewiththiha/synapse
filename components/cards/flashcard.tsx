"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Flashcard as FlashcardType } from "@/lib/types/flashcard";

interface FlashcardProps {
	card: FlashcardType;
	isFlipped?: boolean;
	onClick?: () => void;
	className?: string;
	layoutId?: string;
}

export function Flashcard({
	card,
	isFlipped = false,
	onClick,
	className,
	layoutId,
}: FlashcardProps) {
	const [tilt, setTilt] = React.useState({ x: 0, y: 0 });
	const cardRef = React.useRef<HTMLDivElement>(null);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!cardRef.current) return;
		const rect = cardRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;
		const tiltX = (y - centerY) / 10;
		const tiltY = (centerX - x) / 10;
		setTilt({ x: tiltX, y: tiltY });
	};

	const handleMouseLeave = () => {
		setTilt({ x: 0, y: 0 });
	};

	return (
		<motion.div
			ref={cardRef}
			layoutId={layoutId}
			className={cn(
				"relative w-full aspect-[3/4] cursor-pointer perspective-1000",
				className,
			)}
			onClick={onClick}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
			style={{
				transformStyle: "preserve-3d",
			}}
			animate={{
				rotateX: tilt.x,
				rotateY: tilt.y,
			}}
			transition={{ type: "spring", stiffness: 300, damping: 30 }}
		>
			<motion.div
				className="absolute inset-0 w-full h-full"
				style={{
					transformStyle: "preserve-3d",
				}}
				animate={{
					rotateY: isFlipped ? 180 : 0,
				}}
				transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
			>
				{/* Front - Question */}
				<div
					className={cn(
						"absolute inset-0 w-full h-full rounded-xl border bg-card shadow-lg p-4 flex flex-col",
						"backface-hidden",
					)}
					style={{ backfaceVisibility: "hidden" }}
				>
					<div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
						Question
					</div>
					<div className="flex-1 flex items-center justify-center text-center">
						<p className="text-sm font-medium leading-relaxed">
							{card.question}
						</p>
					</div>
				</div>

				{/* Back - Answer */}
				<div
					className={cn(
						"absolute inset-0 w-full h-full rounded-xl border bg-primary text-primary-foreground shadow-lg p-4 flex flex-col",
						"backface-hidden",
					)}
					style={{
						backfaceVisibility: "hidden",
						transform: "rotateY(180deg)",
					}}
				>
					<div className="text-xs opacity-70 mb-2 uppercase tracking-wider">
						Answer
					</div>
					<div className="flex-1 flex items-center justify-center text-center">
						<p className="text-sm font-medium leading-relaxed">{card.answer}</p>
					</div>
				</div>
			</motion.div>
		</motion.div>
	);
}
