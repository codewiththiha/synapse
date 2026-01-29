"use client";

/**
 * StepConfiguration Component
 * Card generation configuration with react-hook-form + zod validation
 */

import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ControlledSlider } from "@/components/ui/form";
import {
	cardGenerationConfigSchema,
	CardGenerationConfigSchema,
	cardGenerationConfigDefaultValues,
} from "@/lib/schemas/flashcard";

interface StepConfigurationProps {
	extractedText: string;
	onGenerate: (cardCount: number) => void;
}

export function StepConfiguration({
	extractedText,
	onGenerate,
}: StepConfigurationProps) {
	const form = useForm<CardGenerationConfigSchema>({
		resolver: zodResolver(cardGenerationConfigSchema),
		defaultValues: {
			...cardGenerationConfigDefaultValues,
			extractedText,
		},
	});

	// Update extracted text when it changes
	useEffect(() => {
		form.setValue("extractedText", extractedText);
	}, [extractedText, form]);

	const cardCount = form.watch("cardCount");

	const handleSubmit = form.handleSubmit((data) => {
		onGenerate(data.cardCount);
	});

	return (
		<FormProvider {...form}>
			<form onSubmit={handleSubmit} className="space-y-6">
				<div className="rounded-lg bg-muted/50 overflow-hidden">
					<p className="text-xs text-muted-foreground px-3 pt-3 pb-1">
						Extracted text preview:
					</p>
					<div className="max-h-28 overflow-y-auto px-3 pb-3">
						<p className="text-sm break-words whitespace-pre-wrap">
							{extractedText.slice(0, 500)}
							{extractedText.length > 500 ? "..." : ""}
						</p>
					</div>
				</div>

				<ControlledSlider<CardGenerationConfigSchema>
					name="cardCount"
					label="Number of cards"
					min={1}
					max={30}
					step={1}
					showValue
				/>

				<p className="text-xs text-muted-foreground">
					Maximum 30 cards per generation
				</p>

				<Button type="submit" className="w-full">
					<Sparkles size={16} className="mr-2" />
					Generate {cardCount} Cards
				</Button>
			</form>
		</FormProvider>
	);
}
