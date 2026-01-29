"use client";

/**
 * Planner Assistant
 * Draggable floating circle button with auto-expanding input for AI scheduling
 *
 * Refactored to use:
 * - useFloatingAssistant hook for drag/position logic
 * - FloatingAssistantButton for the FAB
 * - AssistantInputShell for the animated container
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Send, Loader2 } from "lucide-react";
import { plannerCommandService } from "@/lib/services/planner-command";
import { usePlannerStore } from "@/stores/use-planner-store";
import {
	plannerCommandSchema,
	PlannerCommandSchema,
	plannerCommandDefaultValues,
} from "@/lib/schemas/chat";
import { useFloatingAssistant } from "@/hooks/use-floating-assistant";
import {
	FloatingAssistantButton,
	AssistantInputShell,
} from "@/components/ui/assistant";

const INPUT_MIN_WIDTH = 280;
const INPUT_MAX_WIDTH = 400;

export function PlannerAssistant() {
	const {
		isExpanded,
		isDragging,
		buttonPos,
		inputPos,
		inputWidth,
		textareaRef,
		measureRef,
		buttonRef,
		setIsExpanded,
		handleDragStart,
		handleButtonClick,
		updateInputWidth,
	} = useFloatingAssistant({
		minWidth: INPUT_MIN_WIDTH,
		maxWidth: INPUT_MAX_WIDTH,
		placeholder: "Meeting at 3pm...",
	});

	const [isProcessing, setIsProcessing] = React.useState(false);
	const isGenerating = usePlannerStore((s) => s.isGenerating);
	const isLoading = isGenerating || isProcessing;

	const form = useForm<PlannerCommandSchema>({
		resolver: zodResolver(plannerCommandSchema),
		defaultValues: plannerCommandDefaultValues,
	});

	const commandValue = form.watch("command");

	// Update width when input changes
	useEffect(() => {
		updateInputWidth(commandValue);
	}, [commandValue, updateInputWidth]);

	// Auto-resize textarea height
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
		}
	}, [commandValue, textareaRef]);

	const handleSubmit = form.handleSubmit(async (data) => {
		if (isProcessing) return;

		const command = data.command.trim();
		setIsProcessing(true);
		setIsExpanded(false);
		form.reset(plannerCommandDefaultValues);

		try {
			const fullCommand = command.toLowerCase().startsWith("@")
				? command
				: `@planner ${command}`;

			await plannerCommandService.processCommand({
				command: fullCommand,
			});
		} finally {
			setIsProcessing(false);
		}
	});

	const handleCancel = () => {
		plannerCommandService.cancelActiveTasks();
		setIsProcessing(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
		if (e.key === "Escape") {
			setIsExpanded(false);
			form.reset(plannerCommandDefaultValues);
		}
	};

	return (
		<>
			{/* Hidden span for measuring text width */}
			<span
				ref={measureRef}
				className="fixed invisible whitespace-pre text-sm"
				style={{ top: -9999, left: -9999 }}
			/>

			{/* Draggable button */}
			<FloatingAssistantButton
				ref={buttonRef}
				visible={!isExpanded}
				position={buttonPos}
				isLoading={isLoading}
				isDragging={isDragging}
				onClick={() => handleButtonClick(handleCancel, isLoading)}
				onPointerDown={handleDragStart}
			/>

			{/* Expanded input */}
			<AssistantInputShell
				isExpanded={isExpanded}
				buttonPos={buttonPos}
				inputPos={inputPos}
				inputWidth={inputWidth}
				minWidth={INPUT_MIN_WIDTH}
			>
				<motion.div
					className="bg-card border rounded-2xl shadow-lg flex items-end gap-2 p-1.5 pl-4"
					layout
					transition={{ duration: 0.2 }}
				>
					<textarea
						{...form.register("command", {
							onChange: () => {
								if (textareaRef.current) {
									textareaRef.current.style.height = "auto";
									textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
								}
							},
						})}
						ref={(e) => {
							form.register("command").ref(e);
							(
								textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>
							).current = e;
						}}
						onKeyDown={handleKeyDown}
						placeholder="Meeting at 3pm..."
						rows={1}
						className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground min-w-0 resize-none py-2 max-h-[120px] overflow-y-auto"
						disabled={isProcessing}
						autoComplete="off"
						autoCorrect="off"
						autoCapitalize="off"
						spellCheck={false}
					/>
					<div className="flex items-center gap-1 shrink-0 pb-0.5">
						<Button
							size="icon"
							variant="ghost"
							onClick={() => setIsExpanded(false)}
							className="h-9 w-9 rounded-full"
						>
							<X size={18} />
						</Button>
						<Button
							size="icon"
							onClick={() => handleSubmit()}
							disabled={!commandValue.trim() || isProcessing}
							className="h-9 w-9 rounded-full"
						>
							{isProcessing ? (
								<Loader2 size={16} className="animate-spin" />
							) : (
								<Send size={16} />
							)}
						</Button>
					</div>
				</motion.div>
			</AssistantInputShell>
		</>
	);
}

// Need React import for useState
import React from "react";
