"use client";

import {
	userParticipationRangeableFields,
	userParticipationSortableFields,
} from "@bbrc/api/modules/user/user-participation.listing";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { Label } from "@bbrc/ui/components/label";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingIntegerRangeFields } from "@/components/listing/listing-integer-range-fields";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { authClient } from "@/lib/auth-client";
import {
	clearUserSittingSheetFilters,
	countUserSittingSheetFilters,
	userSittingProgresses,
	userSittingProgressLabels,
	userSittingRangeByLabels,
	userSittingSortByLabels,
	userSittingStatuses,
	userSittingStatusLabels,
	useUserSittingListingSearchParams,
} from "@/lib/listing/user-sittings-listing";

type UserSittingsListingToolbarProps = {
	isOwnProfile: boolean;
};

function toggled<T extends string>(
	current: readonly T[] | null,
	value: T,
	checked: boolean,
): T[] | null {
	const next = checked
		? [...new Set([...(current ?? []), value])]
		: (current ?? []).filter((item) => item !== value);
	return next.length > 0 ? next : null;
}

export function UserSittingsListingToolbar({
	isOwnProfile,
}: UserSittingsListingToolbarProps) {
	const { data: session } = authClient.useSession();
	const [params, setParams] = useUserSittingListingSearchParams();
	const sheetFilterCount = countUserSittingSheetFilters(params);
	const showMutual = Boolean(session?.user) && !isOwnProfile;

	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
			<ListingSearch
				value={params.search ?? ""}
				onChange={(search) => {
					void setParams({ search });
				}}
				placeholder="Search by sitting or book…"
			/>

			<div className="flex flex-wrap items-center gap-2 lg:shrink-0">
				{showMutual ? (
					<div className="flex items-center gap-2 border border-border px-3 py-2">
						<Checkbox
							id="user-sittings-mutual-only"
							checked={params.mutualOnly}
							onCheckedChange={(checked) => {
								void setParams({ mutualOnly: checked === true });
							}}
						/>
						<Label
							htmlFor="user-sittings-mutual-only"
							className="cursor-pointer font-normal text-sm"
						>
							Only mutuals
						</Label>
					</div>
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
					sortByOptions={userParticipationSortableFields}
					sortByLabels={userSittingSortByLabels}
				/>

				<ListingFiltersSheet
					title="Sitting filters"
					description="Narrow this member's sittings by status, progress, size, or dates."
					activeFilterCount={sheetFilterCount}
					onClear={() => clearUserSittingSheetFilters(setParams)}
				>
					<ListingCheckboxList
						legend="Sitting status"
						options={userSittingStatuses.map((status) => ({
							id: status,
							label: userSittingStatusLabels[status],
							checked: params.statuses?.includes(status) ?? false,
							onCheckedChange: (checked) => {
								void setParams({
									statuses: toggled(params.statuses, status, checked),
								});
							},
						}))}
					/>

					<ListingCheckboxList
						legend="Member progress"
						options={userSittingProgresses.map((progress) => ({
							id: progress,
							label: userSittingProgressLabels[progress],
							checked: params.progresses?.includes(progress) ?? false,
							onCheckedChange: (checked) => {
								void setParams({
									progresses: toggled(params.progresses, progress, checked),
								});
							},
						}))}
					/>

					<ListingIntegerRangeFields
						legend="Participants"
						minId="user-sitting-filter-min-participants"
						maxId="user-sitting-filter-max-participants"
						min={params.minParticipants}
						max={params.maxParticipants}
						onMinChange={(minParticipants) => {
							void setParams({ minParticipants });
						}}
						onMaxChange={(maxParticipants) => {
							void setParams({ maxParticipants });
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
						rangeByOptions={userParticipationRangeableFields}
						rangeByLabels={userSittingRangeByLabels}
					/>
				</ListingFiltersSheet>
			</div>
		</div>
	);
}
