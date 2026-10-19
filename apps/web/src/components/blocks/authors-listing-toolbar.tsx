"use client";

import { authorSortableFields } from "@bbrc/api/modules/author/author.listing";
import { Input } from "@bbrc/ui/components/input";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import { ListingAuthorCountryMultiSelect } from "@/components/listing/listing-author-country-multi-select";
import { ListingFilterPanel } from "@/components/listing/listing-filter-panel";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingIntegerRangeFields } from "@/components/listing/listing-integer-range-fields";
import { ListingOpenLibraryRatingSlider } from "@/components/listing/listing-open-library-rating-slider";
import { ListingSideSheetSection } from "@/components/listing/listing-side-sheet";
import { ListingSort } from "@/components/listing/listing-sort";
import {
	authorSortByLabels,
	clearAuthorSheetFilters,
	countAuthorSheetFilters,
	toAuthorListCountryFacetsInput,
	useAuthorsListingSearchParams,
} from "@/lib/listing/authors-listing";

export function AuthorsListingToolbar() {
	const [params, setParams] = useAuthorsListingSearchParams();
	const sheetFilterCount = countAuthorSheetFilters(params);
	const countryFacetsInput = useMemo(
		() => toAuthorListCountryFacetsInput(params),
		[params],
	);
	const searchInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "/") {
				return;
			}

			if (event.metaKey || event.ctrlKey || event.altKey) {
				return;
			}

			const target = event.target;
			if (
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.tagName === "SELECT")
			) {
				return;
			}

			event.preventDefault();
			searchInputRef.current?.focus();
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const filterSection = (
		title: string,
		description: string | undefined,
		content: ReactNode,
	) => (
		<ListingSideSheetSection title={title} description={description}>
			{content}
		</ListingSideSheetSection>
	);

	const refineControls = (
		<>
			<ListingSort
				sortBy={params.sortBy}
				sortDirection={params.sortDirection}
				onSortByChange={(sortBy) => {
					void setParams({ sortBy });
				}}
				onSortDirectionChange={(sortDirection) => {
					void setParams({ sortDirection });
				}}
				sortByOptions={authorSortableFields}
				sortByLabels={authorSortByLabels}
				appearance="library"
			/>
			<ListingFiltersSheet
				title="Author filters"
				description="Filter by country, catalog size, member reads, club reviews, or rating."
				activeFilterCount={sheetFilterCount}
				onClear={() => clearAuthorSheetFilters(setParams)}
				appearance="library"
			>
				{filterSection(
					"Country",
					"Primary country from each author’s catalog books (most common origin).",
					<ListingAuthorCountryMultiSelect
						selectedAlpha2={params.countries ?? []}
						onSelectedAlpha2Change={(countries) => {
							void setParams({
								countries: countries.length > 0 ? countries : null,
							});
						}}
						facetInput={countryFacetsInput}
					/>,
				)}

				{filterSection(
					"Catalog & reads",
					"How many club books and member reads each author has.",
					<div className="flex flex-col gap-3">
						<ListingFilterPanel title="Books in catalog">
							<ListingIntegerRangeFields
								minId="author-filter-min-books"
								maxId="author-filter-max-books"
								min={params.minBooks}
								max={params.maxBooks}
								minLabel="Minimum books"
								maxLabel="Maximum books"
								onMinChange={(minBooks) => {
									void setParams({ minBooks });
								}}
								onMaxChange={(maxBooks) => {
									void setParams({ maxBooks });
								}}
							/>
						</ListingFilterPanel>
						<ListingFilterPanel title="Member reads">
							<ListingIntegerRangeFields
								minId="author-filter-min-reads"
								maxId="author-filter-max-reads"
								min={params.minReads}
								max={params.maxReads}
								minLabel="Minimum reads"
								maxLabel="Maximum reads"
								onMinChange={(minReads) => {
									void setParams({ minReads });
								}}
								onMaxChange={(maxReads) => {
									void setParams({ maxReads });
								}}
							/>
						</ListingFilterPanel>
						<ListingFilterPanel title="Club reviews">
							<ListingIntegerRangeFields
								minId="author-filter-min-reviews"
								maxId="author-filter-max-reviews"
								min={params.minReviews}
								max={params.maxReviews}
								minLabel="Minimum reviews"
								maxLabel="Maximum reviews"
								onMinChange={(minReviews) => {
									void setParams({ minReviews });
								}}
								onMaxChange={(maxReviews) => {
									void setParams({ maxReviews });
								}}
							/>
						</ListingFilterPanel>
					</div>,
				)}

				{filterSection(
					"Club rating",
					"Average rating across all reviews on this author’s books.",
					<ListingFilterPanel title="Average rating">
						<ListingOpenLibraryRatingSlider
							min={params.minAverageRating}
							max={params.maxAverageRating}
							onMinChange={(minAverageRating) => {
								void setParams({ minAverageRating });
							}}
							onMaxChange={(maxAverageRating) => {
								void setParams({ maxAverageRating });
							}}
						/>
					</ListingFilterPanel>,
				)}
			</ListingFiltersSheet>
		</>
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="relative">
				<Search
					className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<Input
					ref={searchInputRef}
					type="search"
					value={params.search ?? ""}
					onChange={(event) => {
						const next = event.target.value;
						void setParams({ search: next.length > 0 ? next : null });
					}}
					placeholder="Search by name or slug…"
					className="ps-8"
					autoComplete="off"
					aria-label="Search authors"
				/>
			</div>
			<div className="flex flex-wrap items-center justify-end gap-2">
				{refineControls}
			</div>
		</div>
	);
}
