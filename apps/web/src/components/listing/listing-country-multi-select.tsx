"use client";

import type { GetBookListCountryFacetsInput } from "@bbrc/api/modules/book/book.schema";
import { Button } from "@bbrc/ui/components/button";
import { Card } from "@bbrc/ui/components/card";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Field,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { ScrollArea } from "@bbrc/ui/components/scroll-area";
import { Separator } from "@bbrc/ui/components/separator";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { CountryLabel } from "@/components/blocks/country-dropdown";
import { orpc } from "@/utils/orpc";

type ListingCountryMultiSelectProps = {
	legend?: string;
	selectedAlpha2: string[];
	onSelectedAlpha2Change: (codes: string[]) => void;
	facetInput: Partial<GetBookListCountryFacetsInput>;
};

export function ListingCountryMultiSelect({
	legend = "Literary origin",
	selectedAlpha2,
	onSelectedAlpha2Change,
	facetInput,
}: ListingCountryMultiSelectProps) {
	const [search, setSearch] = useState("");

	const facetsQuery = useQuery({
		...orpc.book.getBookListCountryFacets.queryOptions({
			input: facetInput,
		}),
	});

	const countries = facetsQuery.data?.countries ?? [];

	const filteredCountries = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) {
			return countries;
		}

		return countries.filter(
			(country) =>
				country.name.toLowerCase().includes(query) ||
				country.alpha2.toLowerCase().includes(query),
		);
	}, [countries, search]);

	const selectedSet = useMemo(
		() => new Set(selectedAlpha2.map((code) => code.toUpperCase())),
		[selectedAlpha2],
	);

	function toggleCountry(alpha2: string, checked: boolean) {
		const code = alpha2.toUpperCase();
		if (checked) {
			if (selectedSet.has(code)) {
				return;
			}
			onSelectedAlpha2Change([...selectedAlpha2, code]);
			return;
		}

		onSelectedAlpha2Change(
			selectedAlpha2.filter((value) => value.toUpperCase() !== code),
		);
	}

	const legendLabel =
		selectedAlpha2.length > 0
			? `${legend} (${selectedAlpha2.length} selected)`
			: legend;

	return (
		<FieldSet className="gap-3">
			<FieldLegend>{legendLabel}</FieldLegend>
			<Field>
				<FieldLabel htmlFor="country-filter-search" className="sr-only">
					Search countries
				</FieldLabel>
				<div className="relative">
					<SearchIcon
						className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						id="country-filter-search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search countries…"
						className="ps-8"
						autoComplete="off"
					/>
				</div>
			</Field>

			{facetsQuery.isPending ? (
				<Skeleton className="h-40 w-full" />
			) : filteredCountries.length === 0 ? (
				<p className="text-muted-foreground text-xs">
					No countries match the current catalog filters.
				</p>
			) : (
				<Card className="p-0">
					<ScrollArea className="h-48">
						<ul className="flex flex-col p-1">
							{filteredCountries.map((country, index) => (
								<Fragment key={country.alpha2}>
									{index > 0 ? <Separator /> : null}
									<li>
										<div className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted/40">
											<Checkbox
												checked={selectedSet.has(country.alpha2)}
												onCheckedChange={(checked) => {
													toggleCountry(country.alpha2, checked === true);
												}}
											/>
											<span className="min-w-0 flex-1">
												<CountryLabel
													alpha2={country.alpha2}
													name={country.name}
												/>
											</span>
											<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
												{country.bookCount}
											</span>
										</div>
									</li>
								</Fragment>
							))}
						</ul>
					</ScrollArea>
				</Card>
			)}

			{selectedAlpha2.length > 0 ? (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="w-fit px-2"
					onClick={() => onSelectedAlpha2Change([])}
				>
					Clear countries
				</Button>
			) : null}
		</FieldSet>
	);
}
