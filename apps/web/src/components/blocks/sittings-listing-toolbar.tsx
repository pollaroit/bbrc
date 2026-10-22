"use client";

import {
	sittingListSortableFields,
	sittingRangeableFields,
} from "@bbrc/api/modules/sitting/sitting.listing";
import { UserRound } from "lucide-react";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingIntegerRangeFields } from "@/components/listing/listing-integer-range-fields";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { ListingToggleChip } from "@/components/listing/listing-toggle-chip";
import { authClient } from "@/lib/auth-client";
import {
	clearSittingSheetFilters,
	countSittingSheetFilters,
	type SittingListingStatus,
	sittingRangeByLabels,
	sittingSortByLabels,
	sittingStatuses,
	sittingStatusFilterLabels,
	useSittingListingSearchParams,
} from "@/lib/listing/sittings-listing";

export function SittingsListingToolbar() {
	const { data: session } = authClient.useSession();
	const [params, setParams] = useSittingListingSearchParams();

	const toggleStatus = (status: SittingListingStatus, checked: boolean) => {
		const current = params.statuses ?? [];
		const next = checked
			? [...new Set([...current, status])]
			: current.filter((value) => value !== status);

		void setParams({ statuses: next.length > 0 ? next : null });
	};

	return (
		<div className="flex flex-col gap-3 md:flex-row md:items-center">
			<ListingSearch
				value={params.search ?? ""}
				onChange={(search) => {
					void setParams({ search });
				}}
				placeholder="Search by sitting or book…"
			/>

			<div className="flex flex-wrap items-center gap-2 md:shrink-0">
				{session?.user ? (
					<ListingToggleChip
						pressed={params.mineOnly}
						onPressedChange={(mineOnly) => {
							void setParams({ mineOnly });
						}}
						icon={<UserRound data-icon="inline-start" />}
					>
						My sittings
					</ListingToggleChip>
				) : null}

				<ListingSort
					sortBy={params.sortBy}
					sortDirection={params.sortDirection}
					onSortByChange={(sortBy) => {
						void setParams({ sortBy });
					}}
					onSortDirectionChange={(sortDirection) => {
						void setParams({ sortDirection });
					}}
					sortByOptions={sittingListSortableFields}
					sortByLabels={sittingSortByLabels}
					appearance="library"
				/>

				<ListingFiltersSheet
					title="Sitting filters"
					description="Narrow sittings by status, size, how many finished, book length, or dates."
					activeFilterCount={countSittingSheetFilters(params)}
					onClear={() => clearSittingSheetFilters(setParams)}
					appearance="library"
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

					<ListingIntegerRangeFields
						legend="Participants"
						minId="sitting-filter-min-participants"
						maxId="sitting-filter-max-participants"
						min={params.minParticipants}
						max={params.maxParticipants}
						onMinChange={(minParticipants) => {
							void setParams({ minParticipants });
						}}
						onMaxChange={(maxParticipants) => {
							void setParams({ maxParticipants });
						}}
					/>

					<ListingIntegerRangeFields
						legend="Completed readers"
						minId="sitting-filter-min-completed"
						maxId="sitting-filter-max-completed"
						min={params.minCompleted}
						max={params.maxCompleted}
						onMinChange={(minCompleted) => {
							void setParams({ minCompleted });
						}}
						onMaxChange={(maxCompleted) => {
							void setParams({ maxCompleted });
						}}
					/>

					<ListingIntegerRangeFields
						legend="Book pages"
						minId="sitting-filter-min-pages"
						maxId="sitting-filter-max-pages"
						min={params.minPages}
						max={params.maxPages}
						onMinChange={(minPages) => {
							void setParams({ minPages });
						}}
						onMaxChange={(maxPages) => {
							void setParams({ maxPages });
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
						rangeByOptions={sittingRangeableFields}
						rangeByLabels={sittingRangeByLabels}
					/>
				</ListingFiltersSheet>
			</div>
		</div>
	);
}
