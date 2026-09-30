"use client";

import { sittingSortableFields } from "@bbrc/api/modules/sitting/sitting.listing";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import {
	clearSittingSheetFilters,
	countSittingSheetFilters,
	type SittingListingStatus,
	sittingSortByLabels,
	sittingStatuses,
	sittingStatusFilterLabels,
	useSittingListingSearchParams,
} from "@/lib/listing/sittings-listing";

export function SittingsListingToolbar() {
	const [params, setParams] = useSittingListingSearchParams();
	const sheetFilterCount = countSittingSheetFilters(params);

	const toggleStatus = (status: SittingListingStatus, checked: boolean) => {
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
				placeholder="Search sittings by slug…"
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
					sortByOptions={sittingSortableFields}
					sortByLabels={sittingSortByLabels}
				/>

				<ListingFiltersSheet
					title="Sitting filters"
					description="Filter by status."
					activeFilterCount={sheetFilterCount}
					onClear={() => clearSittingSheetFilters(setParams)}
				>
					<ListingCheckboxList
						legend="Status"
						options={sittingStatuses.map((status) => ({
							id: status,
							label: sittingStatusFilterLabels[status],
							checked: params.statuses?.includes(status) ?? false,
							onCheckedChange: (checked) => {
								toggleStatus(status, checked);
							},
						}))}
					/>
				</ListingFiltersSheet>
			</div>
		</div>
	);
}
