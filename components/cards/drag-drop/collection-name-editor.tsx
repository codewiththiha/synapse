"use client";

import React, { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ControlledInput } from "@/components/ui/form";
import { CardCollection } from "@/lib/types/flashcard";
import { cn } from "@/lib/utils";
import { useDoubleTap } from "@/hooks/use-double-tap";
import { inlineEditSchema, InlineEditSchema } from "@/lib/schemas/chat";

/**
 * CollectionNameEditor - Inline editor for collection names
 *
 * PARAMETERS:
 * - collection: CardCollection to edit
 * - isEditing: Whether in edit mode
 * - onStartEdit: Callback to enter edit mode
 * - onSave: Callback with new name (called on Enter or blur)
 * - onCancel: Callback to exit edit mode without saving
 * - onClick?: Callback for single click (navigate)
 * - className?: Additional CSS classes
 *
 * WHAT IT DOES:
 * Provides inline editing for collection names with dual-mode display:
 * - Display mode: Shows name, responds to double-tap to edit
 * - Edit mode: Shows input field, validates on save
 *
 * KEY FEATURES:
 * - Double-tap/click to edit (single tap navigates)
 * - Enter key saves, Escape key cancels
 * - Validates non-empty names
 * - Auto-focus and select on edit mode
 * - Blur saves changes
 * - Works on desktop and mobile
 *
 * WHAT IT SERVES:
 * Allows users to rename collections without leaving the current view.
 * Combines navigation (single tap) and editing (double tap) in one component.
 *
 * USAGE:
 * <CollectionNameEditor
 *   collection={collection}
 *   isEditing={isEditing}
 *   onStartEdit={() => setIsEditing(true)}
 *   onSave={(name) => updateCollection(name)}
 *   onCancel={() => setIsEditing(false)}
 *   onClick={() => navigate()}
 * />
 *
 * BENEFITS:
 * - Inline editing saves screen space
 * - Double-tap pattern is familiar on mobile
 * - Validation prevents empty names
 * - Keyboard shortcuts for power users
 * - Reusable for any inline text editing
 */
interface CollectionNameEditorProps {
	collection: CardCollection;
	isEditing: boolean;
	onStartEdit: () => void;
	onSave: (name: string) => void;
	onCancel: () => void;
	onClick?: () => void;
	className?: string;
}

/**
 * Inline editor for collection names.
 * Requirements: 1.1, 1.2, 1.3, 1.4
 * - Displays collection name or inline edit field
 * - Enter key saves, Escape key cancels
 * - Validates non-empty name before saving
 * - Single click navigates, double click/tap edits
 */
export function CollectionNameEditor({
	collection,
	isEditing,
	onStartEdit,
	onSave,
	onCancel,
	onClick,
	className,
}: CollectionNameEditorProps) {
	if (isEditing) {
		return (
			<CollectionNameInput
				initialValue={collection.name}
				onSave={onSave}
				onCancel={onCancel}
				className={className}
			/>
		);
	}

	return (
		<CollectionNameDisplay
			name={collection.name}
			onStartEdit={onStartEdit}
			onClick={onClick}
			className={className}
		/>
	);
}

/**
 * CollectionNameInput - Input component for editing with react-hook-form
 *
 * PARAMETERS:
 * - initialValue: Starting name value
 * - onSave: Callback with trimmed name
 * - onCancel: Callback to exit edit mode
 * - className?: Additional CSS classes
 *
 * WHAT IT DOES:
 * Renders an input field with zod validation and keyboard handling.
 * Auto-focuses and selects text on mount for immediate editing.
 *
 * BENEFITS:
 * - Uses react-hook-form + zod for validation
 * - Manages its own edit state
 * - Validates before saving
 * - Shows error state for empty names
 */
interface CollectionNameInputProps {
	initialValue: string;
	onSave: (name: string) => void;
	onCancel: () => void;
	className?: string;
}

function CollectionNameInput({
	initialValue,
	onSave,
	onCancel,
	className,
}: CollectionNameInputProps) {
	const form = useForm<InlineEditSchema>({
		resolver: zodResolver(inlineEditSchema),
		defaultValues: { name: initialValue },
		mode: "onChange",
	});

	// Focus and select on mount
	useEffect(() => {
		const input = document.querySelector<HTMLInputElement>(
			'[data-collection-name-input="true"]',
		);
		if (input) {
			input.focus();
			input.select();
		}
	}, []);

	const handleSave = form.handleSubmit((data) => {
		onSave(data.name);
	});

	const handleBlur = () => {
		// Small delay to allow click events to fire first
		setTimeout(() => {
			if (form.formState.isValid) {
				handleSave();
			} else {
				onCancel();
			}
		}, 100);
	};

	return (
		<FormProvider {...form}>
			<form onSubmit={handleSave} className={cn("relative", className)}>
				<ControlledInput<InlineEditSchema>
					name="name"
					aria-label="Collection name"
					data-collection-name-input="true"
					className="h-7 px-2 py-1 text-sm font-medium"
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							handleSave();
						} else if (e.key === "Escape") {
							e.preventDefault();
							onCancel();
						}
					}}
					onBlur={handleBlur}
				/>
			</form>
		</FormProvider>
	);
}

/**
 * CollectionNameDisplay - Display component with double-tap detection
 *
 * PARAMETERS:
 * - name: Collection name to display
 * - onStartEdit: Callback for double-tap
 * - onClick?: Callback for single tap
 * - className?: Additional CSS classes
 *
 * WHAT IT DOES:
 * Shows collection name with double-tap detection using useDoubleTap hook.
 * Single tap triggers onClick, double tap triggers onStartEdit.
 *
 * BENEFITS:
 * - Clean separation of concerns
 * - Uses reusable useDoubleTap hook
 * - Keyboard accessible (Enter to navigate, Space to edit)
 */
interface CollectionNameDisplayProps {
	name: string;
	onStartEdit: () => void;
	onClick?: () => void;
	className?: string;
}

function CollectionNameDisplay({
	name,
	onStartEdit,
	onClick,
	className,
}: CollectionNameDisplayProps) {
	const { handleTap } = useDoubleTap({
		onSingleTap: onClick,
		onDoubleTap: onStartEdit,
		delay: 300,
	});

	return (
		<span
			className={cn(
				"cursor-pointer hover:text-primary transition-colors select-none",
				"focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded",
				className,
			)}
			onClick={handleTap}
			onTouchEnd={handleTap}
			tabIndex={0}
			role="button"
			aria-label={`${name} - tap to open, double-tap to edit`}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					onClick?.();
				} else if (e.key === " ") {
					e.preventDefault();
					onStartEdit();
				}
			}}
		>
			{name}
		</span>
	);
}

export default CollectionNameEditor;
