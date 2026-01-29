"use client";

/**
 * Controlled Textarea Component
 * Textarea component integrated with react-hook-form
 */

import { ComponentProps } from "react";
import { Controller, FieldValues, Path, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ControlledTextareaProps<T extends FieldValues> = {
	name: Path<T>;
	label?: string;
	containerClassName?: string;
} & Omit<ComponentProps<"textarea">, "name">;

export function ControlledTextarea<T extends FieldValues>({
	className,
	name,
	label,
	containerClassName,
	...props
}: ControlledTextareaProps<T>) {
	const { control } = useFormContext<T>();

	return (
		<div className={cn("relative w-full", containerClassName)}>
			{!!label && (
				<Label className="mb-2 block" htmlFor={name}>
					{label}
				</Label>
			)}
			<Controller
				name={name}
				control={control}
				render={({ field, fieldState: { error } }) => (
					<>
						<textarea
							id={name}
							aria-invalid={!!error}
							className={cn(
								"w-full min-h-[80px] p-3 rounded-lg border bg-background resize-none text-sm",
								"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
								error && "border-destructive focus-visible:ring-destructive/50",
								className,
							)}
							{...field}
							{...props}
						/>
						{!!error && (
							<div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in slide-in-from-top-1">
								<div className="absolute -top-1 left-4 h-2 w-2 rotate-45 bg-destructive" />
								<div className="relative rounded-md bg-destructive px-3 py-2 text-xs text-destructive-foreground shadow-md">
									{error.message}
								</div>
							</div>
						)}
					</>
				)}
			/>
		</div>
	);
}
