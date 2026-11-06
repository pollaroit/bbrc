"use client";

import { Field, FieldLabel } from "@bbrc/ui/components/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import {
	type HiddenFilter,
	hiddenFilterLabels,
	hiddenFilterValues,
} from "@/lib/listing/books-listing";

/** Any / Hidden / Not hidden, for lists of books. */
export function BookHiddenFilterSelect({
	value,
	onChange,
}: {
	value: HiddenFilter | null | undefined;
	onChange: (value: HiddenFilter | null) => void;
}) {
	return (
		<Field className="min-w-0">
			<FieldLabel className="text-muted-foreground text-xs">
				Sittings
			</FieldLabel>
			<Select
				value={value ?? "any"}
				onValueChange={(next) => {
					onChange(
						next === "hidden" || next === "visible"
							? (next as HiddenFilter)
							: null,
					);
				}}
			>
				<SelectTrigger
					className="w-full bg-background"
					aria-label="Filter by whether the book is hidden from sittings"
				>
					<SelectValue placeholder="Any">
						{value ? hiddenFilterLabels[value] : "Any"}
					</SelectValue>
				</SelectTrigger>
				<SelectContent alignItemWithTrigger={false}>
					<SelectGroup>
						<SelectItem value="any">Any</SelectItem>
						{hiddenFilterValues.map((option) => (
							<SelectItem key={option} value={option}>
								{hiddenFilterLabels[option]}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</Field>
	);
}
