"use client";

import { getBookCountryName } from "@bbrc/shared";
import type { Route } from "next";
import Link from "next/link";
import { CountryLabel } from "@/components/blocks/country-dropdown";

type BookLiteraryOriginProps = {
	countries: string[];
	/** When true, each country links to the books catalog filtered by that country. */
	linkable?: boolean;
};

export function BookLiteraryOrigin({
	countries,
	linkable = false,
}: BookLiteraryOriginProps) {
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
					const label = <CountryLabel alpha2={code} name={name} />;

					return (
						<li key={code} className="text-sm">
							{linkable ? (
								<Link
									href={`/books?countries=${encodeURIComponent(code)}` as Route}
									className="inline-flex w-fit underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								>
									{label}
								</Link>
							) : (
								label
							)}
						</li>
					);
				})}
			</ul>
		</section>
	);
}
