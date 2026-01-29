"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleMarkdown } from "@/components/shared/markdown-content";

interface ExplanationPanelProps {
	explanation: string | null;
	hasMemo: boolean;
	hasReturnIndex?: boolean;
	onSaveMemo: () => void;
	variant?: "desktop" | "mobile";
}

export function ExplanationPanel({
	explanation,
	hasMemo,
	hasReturnIndex,
	onSaveMemo,
	variant = "desktop",
}: ExplanationPanelProps) {
	if (!explanation) return null;

	if (variant === "mobile") {
		return (
			<AnimatePresence>
				<motion.div
					initial={{ opacity: 0, y: 20, scale: 0.95 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: 20, scale: 0.95 }}
					transition={{ type: "spring", damping: 25, stiffness: 300 }}
					className="rounded-xl border bg-card shadow-lg overflow-hidden"
				>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.1 }}
						className="flex items-center justify-between p-3 border-b bg-primary/5"
					>
						<div className="flex items-center gap-2">
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								transition={{ type: "spring", delay: 0.2 }}
							>
								<Lightbulb size={14} className="text-primary" />
							</motion.div>
							<span className="text-xs font-medium">Explanation</span>
						</div>
						<Button
							variant={hasMemo ? "secondary" : "outline"}
							size="sm"
							onClick={onSaveMemo}
							disabled={hasMemo}
							className="h-7 text-xs"
						>
							<Save size={12} className="mr-1" />
							{hasMemo ? "Saved" : "Save"}
						</Button>
					</motion.div>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.15 }}
						className="p-3 max-h-40 overflow-y-auto"
					>
						<div className="prose prose-sm dark:prose-invert max-w-none">
							<SimpleMarkdown content={explanation} />
						</div>
					</motion.div>
					{hasReturnIndex && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.3 }}
							className="px-3 py-2 bg-muted/50 border-t text-center"
						>
							<p className="text-[10px] text-muted-foreground">
								Swipe to return to where you were
							</p>
						</motion.div>
					)}
				</motion.div>
			</AnimatePresence>
		);
	}

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, x: 20, width: 0 }}
				animate={{ opacity: 1, x: 0, width: 320 }}
				exit={{ opacity: 0, x: 20, width: 0 }}
				className="flex flex-col rounded-xl border bg-card shadow-lg overflow-hidden"
				style={{ minWidth: 320 }}
			>
				<div className="flex items-center justify-between p-4 border-b bg-muted/30">
					<div className="flex items-center gap-2">
						<Lightbulb size={16} className="text-primary" />
						<span className="font-medium text-sm">Explanation</span>
					</div>
					<Button
						variant={hasMemo ? "secondary" : "outline"}
						size="sm"
						onClick={onSaveMemo}
						disabled={hasMemo}
						title={hasMemo ? "Already saved" : "Save to memo"}
					>
						<Save size={14} className="mr-1" />
						{hasMemo ? "Saved" : "Save"}
					</Button>
				</div>
				<div className="flex-1 p-4 overflow-y-auto max-h-[60vh]">
					<div className="prose prose-sm dark:prose-invert max-w-none">
						<SimpleMarkdown content={explanation} />
					</div>
				</div>
				{hasReturnIndex && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.3 }}
						className="px-4 py-2 bg-muted/50 border-t text-center"
					>
						<p className="text-xs text-muted-foreground">
							Navigate to return to where you were
						</p>
					</motion.div>
				)}
			</motion.div>
		</AnimatePresence>
	);
}
