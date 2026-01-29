"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	PasswordStrength,
	calculatePasswordStrength,
} from "@/lib/schemas/auth";

interface PasswordStrengthIndicatorProps {
	password: string;
	className?: string;
}

export function PasswordStrengthIndicator({
	password,
	className,
}: PasswordStrengthIndicatorProps) {
	const strength = React.useMemo(
		() => calculatePasswordStrength(password),
		[password],
	);

	if (!password) return null;

	const strengthColors: Record<PasswordStrength["label"], string> = {
		weak: "bg-destructive",
		fair: "bg-orange-500",
		good: "bg-yellow-500",
		strong: "bg-green-500",
		excellent: "bg-emerald-500",
	};

	const requirements = [
		{
			key: "length",
			label: "At least 8 characters",
			met: strength.checks.length,
		},
		{
			key: "uppercase",
			label: "One uppercase letter",
			met: strength.checks.uppercase,
		},
		{
			key: "lowercase",
			label: "One lowercase letter",
			met: strength.checks.lowercase,
		},
		{ key: "digit", label: "One number", met: strength.checks.digit },
		{
			key: "special",
			label: "One special character (@$!%*#?&)",
			met: strength.checks.special,
		},
	];

	return (
		<div className={cn("space-y-2", className)}>
			{/* Strength bar */}
			<div className="space-y-1">
				<div className="flex justify-between text-xs">
					<span className="text-muted-foreground">Password strength</span>
					<span
						className={cn(
							"font-medium capitalize",
							strength.score <= 1 && "text-destructive",
							strength.score === 2 && "text-orange-500",
							strength.score === 3 && "text-yellow-500",
							strength.score === 4 && "text-green-500",
							strength.score === 5 && "text-emerald-500",
						)}
					>
						{strength.label}
					</span>
				</div>
				<div className="h-1.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
					{[1, 2, 3, 4, 5].map((segment) => (
						<motion.div
							key={segment}
							initial={{ scaleX: 0 }}
							animate={{ scaleX: segment <= strength.score ? 1 : 0 }}
							transition={{ duration: 0.2, delay: segment * 0.05 }}
							className={cn(
								"flex-1 h-full rounded-full origin-left",
								segment <= strength.score
									? strengthColors[strength.label]
									: "bg-transparent",
							)}
						/>
					))}
				</div>
			</div>

			{/* Requirements checklist */}
			<div className="grid grid-cols-1 gap-1">
				{requirements.map(({ key, label, met }) => (
					<motion.div
						key={key}
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						className="flex items-center gap-1.5 text-xs"
					>
						{met ? (
							<Check size={12} className="text-green-500" />
						) : (
							<X size={12} className="text-muted-foreground" />
						)}
						<span
							className={cn(met ? "text-green-500" : "text-muted-foreground")}
						>
							{label}
						</span>
					</motion.div>
				))}
			</div>
		</div>
	);
}
