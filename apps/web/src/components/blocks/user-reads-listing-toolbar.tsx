"use client";

import {
	userReadRangeableFields,
	userReadSortableFields,
} from "@bbrc/api/modules/read/read.schema";
import { useMemo } from "react";
import { ListingAuthorMultiSelect } from "@/components/listing/listing-author-multi-select";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingCountryMultiSelect } from "@/components/listing/listing-country-multi-select";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingIntegerRangeFields } from "@/components/listing/listing-integer-range-fields";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingRatingRangeFields } from "@/components/listing/listing-rating-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import {
	bookStatuses,
	bookStatusFilterLabels,
	clearUserReadsSheetFilters,
	countUserReadsSheetFilters,
	toggleUserReadsStatus,
	toUserReadsAuthorFacetsInput,
	toUserReadsCountryFacetsInput,
	userReadRangeByLabels,
	userReadSortByLabels,
	useUserReadsListingSearchParams,
} from "@/lib/listing/user-reads-listing";

export function UserReadsListingToolbar() {
	const [params, setParams] = useUserReadsListingSearchParams();
	const sheetFilterCount = countUserReadsSheetFilters(params);
	const authorFacetsInput = useMemo(
		() => toUserReadsAuthorFacetsInput(params),
		[params],
	);
	const countryFacetsInput = useMemo(
		() => toUserReadsCountryFacetsInput(params),
		[params],
	);

	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
			<ListingSearch
				value={params.search ?? ""}
				onChange={(search) => {
					void setParams({ search });
				}}
				placeholder="Search by title or slug…"
			/>

			<div className="flex flex-wrap items-center gap-2 lg:shrink-0">
				<ListingSort
					sortBy={params.sortBy}
					sortDirection={params.sortDirection}
					onSortByChange={(sortBy) => {
						void setParams({ sortBy });
					}}
					onSortDirectionChange={(sortDirection) => {
						void setParams({ sortDirection });
					}}
					sortByOptions={userReadSortableFields}
					sortByLabels={userReadSortByLabels}
				/>

				<ListingFiltersSheet
					title="Read list filters"
					description="Filter this member's reads by author, status, rating, pages, or catalog dates."
					activeFilterCount={sheetFilterCount}
					onClear={() => clearUserReadsSheetFilters(setParams)}
				>
					<ListingCheckboxList
						legend="Status"
						options={bookStatuses.map((status) => ({
							id: status,
							label: bookStatusFilterLabels[status],
							checked: params.statuses?.includes(status) ?? false,
							onCheckedChange: (checked) => {
								toggleUserReadsStatus(params, setParams, status, checked);
							},
						}))}
					/>

					<ListingRatingRangeFields
						legend="Open Library rating"
						min={params.minOpenLibraryRating}
						max={params.maxOpenLibraryRating}
						onMinChange={(minOpenLibraryRating) => {
							void setParams({ minOpenLibraryRating });
						}}
						onMaxChange={(maxOpenLibraryRating) => {
							void setParams({ maxOpenLibraryRating });
						}}
					/>

					<ListingIntegerRangeFields
						legend="Page count"
						minId="user-read-filter-min-pages"
						maxId="user-read-filter-max-pages"
						min={params.minPages}
						max={params.maxPages}
						onMinChange={(minPages) => {
							void setParams({ minPages });
						}}
						onMaxChange={(maxPages) => {
							void setParams({ maxPages });
						}}
					/>

					<ListingIntegerRangeFields
						legend="Club reads"
						minId="user-read-filter-min-reads"
						maxId="user-read-filter-max-reads"
						min={params.minReads}
						max={params.maxReads}
						onMinChange={(minReads) => {
							void setParams({ minReads });
						}}
						onMaxChange={(maxReads) => {
							void setParams({ maxReads });
						}}
					/>

					<ListingAuthorMultiSelect
						selectedSlugs={params.authors ?? []}
						onSelectedSlugsChange={(authors) => {
							void setParams({
								authors: authors.length > 0 ? authors : null,
							});
						}}
						facetInput={authorFacetsInput}
					/>

					<ListingCountryMultiSelect
						selectedAlpha2={params.countries ?? []}
						onSelectedAlpha2Change={(countries) => {
							void setParams({
								countries: countries.length > 0 ? countries : null,
							});
						}}
						facetInput={countryFacetsInput}
					/>

					<ListingRangeFields
						rangeBy={params.rangeBy}
						rangeMin={params.rangeMin}
						rangeMax={params.rangeMax}
						onRangeByChange={(rangeBy) => {
							void setParams({ rangeBy });
						}}
						onRangeMinChange={(rangeMin) => {
							void setParams({ rangeMin });
						}}
						onRangeMaxChange={(rangeMax) => {
							void setParams({ rangeMax });
						}}
						rangeByOptions={userReadRangeableFields}
						rangeByLabels={userReadRangeByLabels}
					/>
				</ListingFiltersSheet>
			</div>
		</div>
	);
}
