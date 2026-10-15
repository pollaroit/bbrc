"use client";

import { seriesSortableFields } from "@bbrc/api/modules/series/series.listing";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import {
	seriesSortByLabels,
	useSeriesListingSearchParams,
} from "@/lib/listing/series-listing";

export function SeriesListingToolbar() {
	const [params, setParams] = useSeriesListingSearchParams();

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
			<ListingSearch
				value={params.search ?? ""}
				onChange={(search) => {
					void setParams({ search });
				}}
				placeholder="Search series…"
				className="w-full sm:max-w-sm"
			/>
			<ListingSort
				sortBy={params.sortBy}
				sortDirection={params.sortDirection}
				sortByOptions={seriesSortableFields}
				sortByLabels={seriesSortByLabels}
				onSortByChange={(sortBy) => {
					void setParams({ sortBy });
				}}
				onSortDirectionChange={(sortDirection) => {
					void setParams({ sortDirection });
				}}
			/>
		</div>
	);
}
