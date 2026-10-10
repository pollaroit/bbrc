"use client";

import { getBookCountryName } from "@bbrc/shared";
import { CountryLabel } from "@/components/blocks/country-dropdown";

type BookLiteraryOriginProps = {
	countries: string[];
};

export function BookLiteraryOrigin({ countries }: BookLiteraryOriginProps) {
	if (countries.length === 0) {
		return null;
	}

	return (
		<section className="flex flex-col gap-3">
			<h2 className="font-semibold text-lg">Literary origin</h2>
			<p className="text-muted-foreground text-sm">
				Country whose literature this title belongs to, based on author
				tradition —not necessarily where the story is set.
			</p>
			<ul className="flex flex-col gap-2">
				{countries.map((code) => {
					const name = getBookCountryName(code) ?? code;
					return (
						<li key={code} className="text-sm">
							<CountryLabel alpha2={code} name={name} />
						</li>
					);
				})}
			</ul>
		</section>
	);
}
