"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
	value: string;
	label: string;
}

interface AnimatedSelectProps {
	value: string;
	onValueChange: (value: string) => void;
	options: Option[];
	placeholder?: string;
	className?: string;
	compact?: boolean;
	side?: "top" | "bottom";
}

export function AnimatedSelect({
	value,
	onValueChange,
	options,
	placeholder = "Select...",
	className,
	compact = false,
	side = "bottom",
}: AnimatedSelectProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	const [mounted, setMounted] = React.useState(false);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const [dropdownPosition, setDropdownPosition] = React.useState({
		top: 0,
		left: 0,
		width: 0,
	});

	const selectedOption = options.find((opt) => opt.value === value);

	// Mount check for portal
	React.useEffect(() => {
		setMounted(true);
	}, []);

	// Update dropdown position when opening
	React.useEffect(() => {
		if (isOpen && containerRef.current) {
			const rect = containerRef.current.getBoundingClientRect();
			const dropdownHeight = options.length * 40 + 8; // Approximate height
			setDropdownPosition({
				top: side === "top" ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
				left: rect.left,
				width: Math.max(rect.width, 120), // Minimum width for dropdown
			});
		}
	}, [isOpen, side, options.length]);

	// Close on outside click
	React.useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Close on escape
	React.useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false);
		};
		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, []);

	const dropdown = (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0, y: side === "top" ? 8 : -8, scale: 0.96 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: side === "top" ? 8 : -8, scale: 0.96 }}
					transition={{ duration: 0.15, ease: "easeOut" }}
					style={{
						position: "fixed",
						top: dropdownPosition.top,
						left: dropdownPosition.left,
						minWidth: dropdownPosition.width,
						zIndex: 9999,
					}}
					className="overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg"
				>
					<div className="max-h-[300px] overflow-y-auto p-1">
						{options.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => {
									onValueChange(option.value);
									setIsOpen(false);
								}}
								className={cn(
									"relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-3 text-sm outline-none transition-colors",
									option.value === value
										? "bg-accent text-accent-foreground"
										: "hover:bg-muted",
								)}
							>
								<span className="flex-1 text-left truncate">
									{option.label}
								</span>
								{option.value === value && <Check className="h-4 w-4 ml-2" />}
							</button>
						))}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			<motion.button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className={cn(
					"flex items-center justify-between gap-1 border border-input bg-background ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
					compact
						? "h-8 px-3 py-1.5 text-xs rounded-full"
						: "h-10 w-full px-3 py-2 text-sm rounded-md",
				)}
				whileTap={{ scale: 0.98 }}
			>
				<span
					className={cn(
						"truncate",
						selectedOption ? "" : "text-muted-foreground",
					)}
				>
					{selectedOption?.label || placeholder}
				</span>
				<motion.div
					animate={{ rotate: isOpen ? 180 : 0 }}
					transition={{ duration: 0.15, ease: "easeOut" }}
				>
					<ChevronDown
						className={cn(compact ? "h-3 w-3" : "h-4 w-4", "opacity-50")}
					/>
				</motion.div>
			</motion.button>

			{mounted && createPortal(dropdown, document.body)}
		</div>
	);
}
