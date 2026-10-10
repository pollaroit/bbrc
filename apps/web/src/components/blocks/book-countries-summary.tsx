"use client";

import { getBookCountryName } from "@bbrc/shared";
import { CountryLabel } from "@/components/blocks/country-dropdown";

type BookCountriesSummaryProps = {
	countries: string[];
	maxVisible?: number;
};

export function BookCountriesSummary({
	countries,
	maxVisible = 3,
}: BookCountriesSummaryProps) {
	if (countries.length === 0) {
		return <span className="text-muted-foreground text-xs">—</span>;
	}

	const visible = countries.slice(0, maxVisible);
	const remaining = countries.length - visible.length;

	return (
		<ul className="flex flex-col gap-1">
			{visible.map((code) => {
				const name = getBookCountryName(code) ?? code;
				return (
					<li key={code}>
						<CountryLabel alpha2={code} name={name} className="text-xs" />
					</li>
				);
			})}
			{remaining > 0 ? (
				<li className="text-muted-foreground text-xs">+{remaining} more</li>
			) : null}
		</ul>
	);
}
