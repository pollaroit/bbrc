"use client";

import { Field, FieldDescription } from "@bbrc/ui/components/field";
import { Slider } from "@bbrc/ui/components/slider";
import { useMemo } from "react";
import { useFormatters } from "@/lib/i18n/use-formatters";

const RATING_MIN = 0;
const RATING_MAX = 5;
const RATING_STEP = 0.1;

type ListingOpenLibraryRatingSliderProps = {
	min: number | null;
	max: number | null;
	onMinChange: (value: number | null) => void;
	onMaxChange: (value: number | null) => void;
};

export function ListingOpenLibraryRatingSlider({
	min,
	max,
	onMinChange,
	onMaxChange,
}: ListingOpenLibraryRatingSliderProps) {
	const f = useFormatters();
	const sliderValue = useMemo(
		() => [min ?? RATING_MIN, max ?? RATING_MAX] as number[],
		[min, max],
	);

	const summary = useMemo(() => {
		const low = min ?? RATING_MIN;
		const high = max ?? RATING_MAX;
		if (low <= RATING_MIN && high >= RATING_MAX) {
			return "Any rating";
		}
		if (low === high) {
			return `${f.rating(low)} stars`;
		}
		return `${f.rating(low)} to ${f.rating(high)} stars`;
	}, [min, max, f]);

	return (
		<Field className="gap-3">
			<div className="flex items-baseline justify-end gap-2">
				<span className="text-muted-foreground text-xs tabular-nums">
					{summary}
				</span>
			</div>
			<Slider
				min={RATING_MIN}
				max={RATING_MAX}
				step={RATING_STEP}
				value={sliderValue}
				onValueChange={(next) => {
					const values = next as number[];
					const [nextMin, nextMax] = values;
					if (nextMin == null || nextMax == null) {
						return;
					}

					onMinChange(nextMin <= RATING_MIN + RATING_STEP / 2 ? null : nextMin);
					onMaxChange(nextMax >= RATING_MAX - RATING_STEP / 2 ? null : nextMax);
				}}
				className="w-full"
			/>
			<FieldDescription className="flex justify-between text-xs">
				<span>{RATING_MIN}</span>
				<span>{RATING_MAX}</span>
			</FieldDescription>
		</Field>
	);
}
