"use client";

/**
 * Model Selector (Qwen-inspired)
 *
 * Transparent trigger that shows model name + chevron
 * Dropdown with model options, descriptions, and checkmark for selected
 * Reusable across chat and TTS pages
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModelOption {
	id: string;
	name: string;
	description?: string;
	badge?: string;
}

interface ModelSelectorProps {
	value: string;
	options: ModelOption[];
	onChange: (value: string) => void;
	className?: string;
	align?: "start" | "center" | "end";
	/** Compact mode for mobile - smaller text and padding */
	compact?: boolean;
}

export function ModelSelector({
	value,
	options,
	onChange,
	className,
	align = "start",
	compact = false,
}: ModelSelectorProps) {
	const [open, setOpen] = React.useState(false);
	const triggerRef = React.useRef<HTMLButtonElement>(null);
	const dropdownRef = React.useRef<HTMLDivElement>(null);

	const selectedOption = options.find((opt) => opt.id === value);

	// Close on click outside
	React.useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node) &&
				triggerRef.current &&
				!triggerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		};

		if (open) {
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [open]);

	// Close on escape
	React.useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};

		if (open) {
			document.addEventListener("keydown", handleEscape);
			return () => document.removeEventListener("keydown", handleEscape);
		}
	}, [open]);

	const handleSelect = (optionId: string) => {
		onChange(optionId);
		setOpen(false);
	};

	return (
		<div className={cn("relative", className)}>
			{/* Transparent Trigger */}
			<button
				ref={triggerRef}
				onClick={() => setOpen(!open)}
				className={cn(
					"flex items-center gap-1 rounded-lg",
					"text-foreground font-medium",
					"hover:bg-muted/50 transition-colors",
					"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					compact ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm",
				)}
			>
				<span className={compact ? "max-w-[120px] truncate" : ""}>
					{selectedOption?.name || "Select model"}
				</span>
				<motion.div
					animate={{ rotate: open ? 180 : 0 }}
					transition={{ duration: 0.2 }}
				>
					<ChevronDown
						size={compact ? 12 : 14}
						className="text-muted-foreground"
					/>
				</motion.div>
			</button>

			{/* Dropdown */}
			<AnimatePresence>
				{open && (
					<motion.div
						ref={dropdownRef}
						initial={{ opacity: 0, y: -8, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -8, scale: 0.96 }}
						transition={{ duration: 0.15 }}
						className={cn(
							"absolute z-50 mt-2 min-w-[320px] max-w-[420px]",
							"bg-popover border border-border rounded-xl shadow-xl",
							"overflow-hidden",
							align === "start" && "left-0",
							align === "center" && "left-1/2 -translate-x-1/2",
							align === "end" && "right-0",
						)}
					>
						{/* Header */}
						<div className="px-3 py-2 border-b border-border flex items-center justify-between">
							<span className="text-xs font-medium text-muted-foreground">
								Model
							</span>
						</div>

						{/* Options */}
						<div className="py-1 max-h-[400px] overflow-y-auto">
							{options.map((option) => (
								<button
									key={option.id}
									onClick={() => handleSelect(option.id)}
									className={cn(
										"w-full px-3 py-2 text-left",
										"hover:bg-muted/50 transition-colors",
										"flex items-start justify-between gap-2",
									)}
								>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-1.5">
											<span className="text-sm font-medium">{option.name}</span>
											{option.badge && (
												<span className="px-1 py-0.5 text-[9px] font-medium bg-primary/10 text-primary rounded">
													{option.badge}
												</span>
											)}
										</div>
										{option.description && (
											<p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
												{option.description}
											</p>
										)}
									</div>
									{value === option.id && (
										<Check size={14} className="text-primary shrink-0 mt-0.5" />
									)}
								</button>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
