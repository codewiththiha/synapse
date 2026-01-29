"use client";

/**
 * Dialog Components with React Hook Form + Zod
 * Type-safe form dialogs with validation
 */

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { ControlledInput } from "@/components/ui/form";
import {
	renameSchema,
	RenameSchema,
	renameDefaultValues,
	inputDialogSchema,
	InputDialogSchema,
	inputDialogDefaultValues,
} from "@/lib/schemas/dialog";

// ============================================
// RenameDialog - For renaming items
// ============================================
interface RenameDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: string;
	currentName: string;
	placeholder?: string;
	onConfirm: (newName: string) => void;
}

export function RenameDialog({
	open,
	onOpenChange,
	title = "Rename",
	currentName,
	placeholder = "Enter name...",
	onConfirm,
}: RenameDialogProps) {
	const form = useForm<RenameSchema>({
		resolver: zodResolver(renameSchema),
		defaultValues: { ...renameDefaultValues, name: currentName },
	});

	// Reset form when dialog opens with current name
	React.useEffect(() => {
		if (open) {
			form.reset({ name: currentName });
			// Focus input after a short delay
			setTimeout(() => {
				const input = document.getElementById("name");
				input?.focus();
			}, 50);
		}
	}, [open, currentName, form]);

	const handleSubmit = form.handleSubmit((data) => {
		onConfirm(data.name);
		onOpenChange(false);
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<FormProvider {...form}>
					<form onSubmit={handleSubmit}>
						<ControlledInput<RenameSchema>
							name="name"
							placeholder={placeholder}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleSubmit();
								}
							}}
							autoFocus
						/>
						<DialogFooter className="mt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={!form.formState.isValid}>
								Rename
							</Button>
						</DialogFooter>
					</form>
				</FormProvider>
			</DialogContent>
		</Dialog>
	);
}

// ============================================
// InputDialog - For creating new items
// ============================================
interface InputDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	placeholder?: string;
	confirmLabel?: string;
	onConfirm: (value: string) => void;
}

export function InputDialog({
	open,
	onOpenChange,
	title,
	placeholder = "Enter name...",
	confirmLabel = "Create",
	onConfirm,
}: InputDialogProps) {
	const form = useForm<InputDialogSchema>({
		resolver: zodResolver(inputDialogSchema),
		defaultValues: inputDialogDefaultValues,
	});

	// Reset form when dialog opens
	React.useEffect(() => {
		if (open) {
			form.reset(inputDialogDefaultValues);
			setTimeout(() => {
				const input = document.getElementById("value");
				input?.focus();
			}, 50);
		}
	}, [open, form]);

	const handleSubmit = form.handleSubmit((data) => {
		onConfirm(data.value);
		onOpenChange(false);
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<FormProvider {...form}>
					<form onSubmit={handleSubmit}>
						<ControlledInput<InputDialogSchema>
							name="value"
							placeholder={placeholder}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleSubmit();
								}
							}}
							autoFocus
						/>
						<DialogFooter className="mt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={!form.formState.isValid}>
								{confirmLabel}
							</Button>
						</DialogFooter>
					</form>
				</FormProvider>
			</DialogContent>
		</Dialog>
	);
}

// ============================================
// SelectDialog - For selecting from a list
// ============================================
interface SelectOption {
	id: string;
	name: string;
	icon?: React.ReactNode;
}

interface SelectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	options: SelectOption[];
	emptyOption?: { label: string; value: string | null };
	onSelect: (id: string | null) => void;
}

export function SelectDialog({
	open,
	onOpenChange,
	title,
	options,
	emptyOption,
	onSelect,
}: SelectDialogProps) {
	const handleSelect = (id: string | null) => {
		onSelect(id);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<div className="space-y-2">
					{emptyOption && (
						<Button
							variant="outline"
							className="w-full justify-start"
							onClick={() => handleSelect(null)}
						>
							<span className="text-muted-foreground">{emptyOption.label}</span>
						</Button>
					)}
					{options.map((option) => (
						<Button
							key={option.id}
							variant="outline"
							className="w-full justify-start"
							onClick={() => handleSelect(option.id)}
						>
							{option.icon || <FolderOpen size={16} className="mr-2" />}
							{option.name}
						</Button>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ============================================
// useRenameDialog - Hook for easy rename dialog usage
// ============================================
interface UseRenameDialogOptions<T> {
	getItemName: (item: T) => string;
	onRename: (item: T, newName: string) => void;
}

export function useRenameDialog<T>({
	getItemName,
	onRename,
}: UseRenameDialogOptions<T>) {
	const [isOpen, setIsOpen] = React.useState(false);
	const [item, setItem] = React.useState<T | null>(null);

	const openRename = React.useCallback((itemToRename: T) => {
		setItem(itemToRename);
		setIsOpen(true);
	}, []);

	const handleConfirm = React.useCallback(
		(newName: string) => {
			if (item) {
				onRename(item, newName);
			}
		},
		[item, onRename],
	);

	const dialogProps = {
		open: isOpen,
		onOpenChange: setIsOpen,
		currentName: item ? getItemName(item) : "",
		onConfirm: handleConfirm,
	};

	return { openRename, dialogProps };
}
