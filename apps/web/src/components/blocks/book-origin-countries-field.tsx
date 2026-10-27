"use client";

import { Button } from "@bbrc/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@bbrc/ui/components/field";
import { X } from "lucide-react";
import {
	CountryDropdown,
	CountryLabel,
} from "@/components/blocks/country-dropdown";
import { useCountryName } from "@/lib/i18n/use-content-text";

const MAX_COUNTRIES = 8;

type BookOriginCountriesFieldProps = {
	value: string[] | undefined;
	onChange: (countries: string[]) => void;
	onTouched?: () => void;
	isSuggesting?: boolean;
	disabled?: boolean;
};

export function BookOriginCountriesField({
	value,
	onChange,
	onTouched,
	isSuggesting = false,
	disabled = false,
}: BookOriginCountriesFieldProps) {
	const countryName = useCountryName();
	const selected = value ?? [];
	const atLimit = selected.length >= MAX_COUNTRIES;

	const remove = (alpha2: string) => {
		onTouched?.();
		onChange(selected.filter((code) => code !== alpha2));
	};

	const add = (alpha2: string) => {
		onTouched?.();
		if (selected.includes(alpha2) || atLimit) {
			return;
		}
		onChange([...selected, alpha2]);
	};

	return (
		<Field>
			<FieldLabel>Country of origin</FieldLabel>
			<div className="flex flex-col gap-2">
				{selected.length > 0 ? (
					<ul className="flex flex-col gap-1">
						{selected.map((code) => {
							const name = countryName(code);
							return (
								<li
									key={code}
									className="flex items-center justify-between gap-2 border bg-muted/30 px-2.5 py-1.5 text-sm"
								>
									<CountryLabel alpha2={code} name={name} />
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										disabled={disabled}
										aria-label={`Remove ${name}`}
										onClick={() => remove(code)}
									>
										<X className="size-4" aria-hidden />
									</Button>
								</li>
							);
						})}
					</ul>
				) : (
					<p className="text-muted-foreground text-sm">
						No country selected yet.
					</p>
				)}

				<CountryDropdown
					disabled={disabled || atLimit}
					placeholder={atLimit ? "Maximum countries reached" : "Add country…"}
					excludeAlpha2={selected}
					onSelect={(country) => add(country.alpha2)}
				/>
			</div>
			<FieldDescription>
				{isSuggesting
					? "Suggesting literary origin from title and authors…"
					: "Modern country whose literature this work belongs to (author tradition), not where the story is set. Override the AI suggestion if needed."}
			</FieldDescription>
		</Field>
	);
}
