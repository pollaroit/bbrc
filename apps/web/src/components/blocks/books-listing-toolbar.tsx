"use client";

import {
	bookRangeableFields,
	bookSortableFields,
} from "@bbrc/api/modules/book/book.listing";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingRatingRangeFields } from "@/components/listing/listing-rating-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import {
	type BookListingStatus,
	bookRangeByLabels,
	bookSortByLabels,
	bookStatuses,
	bookStatusFilterLabels,
	clearBookSheetFilters,
	countBookSheetFilters,
	useBookListingSearchParams,
} from "@/lib/listing/books-listing";

export function BooksListingToolbar() {
	const [params, setParams] = useBookListingSearchParams();
	const sheetFilterCount = countBookSheetFilters(params);

	const toggleStatus = (status: BookListingStatus, checked: boolean) => {
		const current = params.statuses ?? [];
		const next = checked
			? [...new Set([...current, status])]
			: current.filter((value) => value !== status);

		void setParams({
			statuses: next.length > 0 ? next : null,
		});
	};

	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
			<ListingSearch
				value={params.search ?? ""}
				onChange={(search) => {
					void setParams({ search });
				}}
				placeholder="Search books by title…"
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
					sortByOptions={bookSortableFields}
					sortByLabels={bookSortByLabels}
				/>

				<ListingFiltersSheet
					title="Book filters"
					description="Filter by status, rating, or date."
					activeFilterCount={sheetFilterCount}
					onClear={() => clearBookSheetFilters(setParams)}
				>
					<ListingCheckboxList
						legend="Status"
						options={bookStatuses.map((status) => ({
							id: status,
							label: bookStatusFilterLabels[status],
							checked: params.statuses?.includes(status) ?? false,
							onCheckedChange: (checked) => {
								toggleStatus(status, checked);
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
						rangeByOptions={bookRangeableFields}
						rangeByLabels={bookRangeByLabels}
					/>
				</ListingFiltersSheet>
			</div>
		</div>
	);
}
