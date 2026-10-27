"use client";

import {
	Field,
	FieldGroup,
	FieldLegend,
	FieldSet,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { useTranslations } from "next-intl";

type ListingRatingRangeFieldsProps = {
	min: number | null;
	max: number | null;
	onMinChange: (value: number | null) => void;
	onMaxChange: (value: number | null) => void;
	minId?: string;
	maxId?: string;
	legend?: string;
	minLabel?: string;
	maxLabel?: string;
	step?: number;
};

function parseRatingInput(raw: string): number | null {
	if (raw.trim() === "") {
		return null;
	}

	const value = Number.parseFloat(raw);
	if (Number.isNaN(value)) {
		return null;
	}

	return value;
}

export function ListingRatingRangeFields({
	min,
	max,
	onMinChange,
	onMaxChange,
	minId = "listing-rating-min",
	maxId = "listing-rating-max",
	legend,
	minLabel,
	maxLabel,
	step = 0.1,
}: ListingRatingRangeFieldsProps) {
	const t = useTranslations("listing");
	return (
		<FieldSet className="gap-3">
			{legend ? <FieldLegend>{legend}</FieldLegend> : null}
			<FieldGroup className="grid grid-cols-2 gap-3">
				<Field>
					<Label htmlFor={minId}>{minLabel ?? t("range.minimum")}</Label>
					<Input
						id={minId}
						type="number"
						min={0}
						max={5}
						step={step}
						inputMode="decimal"
						placeholder="0"
						className="bg-background"
						value={min ?? ""}
						onChange={(event) => {
							onMinChange(parseRatingInput(event.target.value));
						}}
					/>
				</Field>
				<Field>
					<Label htmlFor={maxId}>{maxLabel ?? t("range.maximum")}</Label>
					<Input
						id={maxId}
						type="number"
						min={0}
						max={5}
						step={step}
						inputMode="decimal"
						placeholder="5"
						className="bg-background"
						value={max ?? ""}
						onChange={(event) => {
							onMaxChange(parseRatingInput(event.target.value));
						}}
					/>
				</Field>
			</FieldGroup>
		</FieldSet>
	);
}
