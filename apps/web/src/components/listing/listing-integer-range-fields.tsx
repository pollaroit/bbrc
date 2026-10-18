"use client";

import {
	Field,
	FieldGroup,
	FieldLegend,
	FieldSet,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";

type ListingIntegerRangeFieldsProps = {
	min: number | null;
	max: number | null;
	onMinChange: (value: number | null) => void;
	onMaxChange: (value: number | null) => void;
	minId?: string;
	maxId?: string;
	legend?: string;
	minLabel?: string;
	maxLabel?: string;
	inputMin?: number;
	placeholderMin?: string;
	placeholderMax?: string;
};

function parseIntegerInput(raw: string): number | null {
	if (raw.trim() === "") {
		return null;
	}

	const value = Number.parseInt(raw, 10);
	if (Number.isNaN(value)) {
		return null;
	}

	return value;
}

export function ListingIntegerRangeFields({
	min,
	max,
	onMinChange,
	onMaxChange,
	minId = "listing-int-min",
	maxId = "listing-int-max",
	legend,
	minLabel = "Minimum",
	maxLabel = "Maximum",
	inputMin = 1,
	placeholderMin = "Min",
	placeholderMax = "Max",
}: ListingIntegerRangeFieldsProps) {
	return (
		<FieldSet className="gap-3">
			{legend ? <FieldLegend>{legend}</FieldLegend> : null}
			<FieldGroup className="grid grid-cols-2 gap-3">
				<Field>
					<Label htmlFor={minId}>{minLabel}</Label>
					<Input
						id={minId}
						type="number"
						min={inputMin}
						step={1}
						inputMode="numeric"
						placeholder={placeholderMin}
						className="bg-background"
						value={min ?? ""}
						onChange={(event) => {
							onMinChange(parseIntegerInput(event.target.value));
						}}
					/>
				</Field>
				<Field>
					<Label htmlFor={maxId}>{maxLabel}</Label>
					<Input
						id={maxId}
						type="number"
						min={inputMin}
						step={1}
						inputMode="numeric"
						placeholder={placeholderMax}
						className="bg-background"
						value={max ?? ""}
						onChange={(event) => {
							onMaxChange(parseIntegerInput(event.target.value));
						}}
					/>
				</Field>
			</FieldGroup>
		</FieldSet>
	);
}
