"use client";

/**
 * Controlled Slider Component
 * Slider component integrated with react-hook-form
 */

import { Controller, FieldValues, Path, useFormContext } from "react-hook-form";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ControlledSliderProps<T extends FieldValues> = {
	name: Path<T>;
	label?: string;
	containerClassName?: string;
	min?: number;
	max?: number;
	step?: number;
	showValue?: boolean;
};

export function ControlledSlider<T extends FieldValues>({
	name,
	label,
	containerClassName,
	min = 0,
	max = 100,
	step = 1,
	showValue = true,
}: ControlledSliderProps<T>) {
	const { control } = useFormContext<T>();

	return (
		<div className={cn("relative w-full space-y-3", containerClassName)}>
			<Controller
				name={name}
				control={control}
				render={({ field, fieldState: { error } }) => (
					<>
						{(!!label || showValue) && (
							<div className="flex items-center justify-between">
								{!!label && <Label htmlFor={name}>{label}</Label>}
								{showValue && (
									<span className="text-sm font-bold text-primary">
										{field.value}
									</span>
								)}
							</div>
						)}
						<Slider
							id={name}
							value={[field.value]}
							onValueChange={(values) => field.onChange(values[0])}
							min={min}
							max={max}
							step={step}
							aria-invalid={!!error}
						/>
						{!!error && (
							<p className="text-xs text-destructive mt-1">{error.message}</p>
						)}
					</>
				)}
			/>
		</div>
	);
}
