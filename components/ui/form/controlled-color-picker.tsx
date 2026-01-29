"use client";

/**
 * Controlled Color Picker Component
 * Color selection component integrated with react-hook-form
 */

import { Controller, FieldValues, Path, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ColorOption {
	name: string;
	value: string;
}

type ControlledColorPickerProps<T extends FieldValues> = {
	name: Path<T>;
	label?: string;
	containerClassName?: string;
	colors: ColorOption[];
};

export function ControlledColorPicker<T extends FieldValues>({
	name,
	label,
	containerClassName,
	colors,
}: ControlledColorPickerProps<T>) {
	const { control } = useFormContext<T>();

	return (
		<div className={cn("relative w-full space-y-2", containerClassName)}>
			{!!label && <Label>{label}</Label>}
			<Controller
				name={name}
				control={control}
				render={({ field, fieldState: { error } }) => (
					<>
						<div className="flex gap-2">
							{colors.map((color) => (
								<button
									key={color.value}
									type="button"
									onClick={() => field.onChange(color.value)}
									className={cn(
										"w-8 h-8 rounded-full transition-all",
										field.value === color.value
											? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110"
											: "hover:scale-105",
									)}
									style={{ backgroundColor: color.value }}
									title={color.name}
								/>
							))}
						</div>
						{!!error && (
							<p className="text-xs text-destructive">{error.message}</p>
						)}
					</>
				)}
			/>
		</div>
	);
}
