"use client";

import {
	userRangeableFields,
	userSortableFields,
} from "@bbrc/api/modules/user/user.listing";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import {
	clearUserSheetFilters,
	countUserSheetFilters,
	type UserListingStatus,
	userRangeByLabels,
	userSortByLabels,
	userStatuses,
	userStatusFilterLabels,
	useUserListingSearchParams,
} from "@/lib/listing/users-listing";

export function MembersListingToolbar() {
	const [params, setParams] = useUserListingSearchParams();
	const sheetFilterCount = countUserSheetFilters(params);

	const toggleStatus = (status: UserListingStatus, checked: boolean) => {
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
				placeholder="Search members by name or username…"
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
					sortByOptions={userSortableFields}
					sortByLabels={userSortByLabels}
				/>

				<ListingFiltersSheet
					title="Member filters"
					description="Filter by role, status, or join date."
					activeFilterCount={sheetFilterCount}
					onClear={() => clearUserSheetFilters(setParams)}
				>
					<ListingCheckboxList
						legend="Status"
						options={userStatuses.map((status) => ({
							id: status,
							label: userStatusFilterLabels[status],
							checked: params.statuses?.includes(status) ?? false,
							onCheckedChange: (checked) => {
								toggleStatus(status, checked);
							},
						}))}
					/>

					<ListingCheckboxList
						legend="Role"
						options={[
							{
								id: "admin",
								label: "Administrators only",
								checked: params.isAdmin === true,
								onCheckedChange: (checked) => {
									void setParams({
										isAdmin: checked ? true : null,
									});
								},
							},
						]}
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
						rangeByOptions={userRangeableFields}
						rangeByLabels={userRangeByLabels}
					/>
				</ListingFiltersSheet>
			</div>
		</div>
	);
}
