"use client";

/**
 * Controlled Input Component
 * Input component integrated with react-hook-form
 */

import { ComponentProps } from "react";
import { Controller, FieldValues, Path, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ControlledInputProps<T extends FieldValues> = {
	name: Path<T>;
	label?: string;
	containerClassName?: string;
} & Omit<ComponentProps<"input">, "name">;

export function ControlledInput<T extends FieldValues>({
	className,
	type,
	name,
	label,
	containerClassName,
	...props
}: ControlledInputProps<T>) {
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
						<Input
							type={type}
							id={name}
							data-slot="input"
							aria-invalid={!!error}
							className={cn(
								error && "border-destructive focus-visible:ring-destructive",
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
