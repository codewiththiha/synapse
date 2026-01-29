"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface PerspectiveWrapperProps {
	children: React.ReactNode;
}

export function PerspectiveWrapper({ children }: PerspectiveWrapperProps) {
	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const mouseX = useSpring(x, { stiffness: 150, damping: 20 });
	const mouseY = useSpring(y, { stiffness: 150, damping: 20 });
	const rotateX = useTransform(mouseY, [-0.5, 0.5], ["12deg", "-12deg"]);
	const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-12deg", "12deg"]);

	const handleMouseMove = (e: React.MouseEvent) => {
		const rect = e.currentTarget.getBoundingClientRect();
		x.set((e.clientX - rect.left) / rect.width - 0.5);
		y.set((e.clientY - rect.top) / rect.height - 0.5);
	};

	return (
		<motion.div
			onMouseMove={handleMouseMove}
			onMouseLeave={() => {
				x.set(0);
				y.set(0);
			}}
			style={{ perspective: "1000px", rotateX, rotateY }}
			className="w-full h-full"
		>
			{children}
		</motion.div>
	);
}
