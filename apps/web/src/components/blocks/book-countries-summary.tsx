"use client";

import { CountryLabel } from "@/components/blocks/country-dropdown";
import { useCountryName } from "@/lib/i18n/use-content-text";

type BookCountriesSummaryProps = {
	countries: string[];
	maxVisible?: number;
};

export function BookCountriesSummary({
	countries,
	maxVisible = 3,
}: BookCountriesSummaryProps) {
	const countryName = useCountryName();
	if (countries.length === 0) {
		return <span className="text-muted-foreground text-xs">—</span>;
	}

	const visible = countries.slice(0, maxVisible);
	const remaining = countries.length - visible.length;

	return (
		<ul className="flex flex-col gap-1">
			{visible.map((code) => {
				const name = countryName(code);
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
