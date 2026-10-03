"use client";

import { adminUserSortableFields } from "@bbrc/api/modules/admin/admin-user.listing";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import {
	adminUserSortByLabels,
	useAdminUsersListingSearchParams,
} from "@/lib/listing/admin-users-listing";
import {
	type UserListingStatus,
	userRangeByLabels,
	userStatuses,
	userStatusFilterLabels,
} from "@/lib/listing/users-listing";

function parseOptionalInt(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === "") {
		return null;
	}
	const parsed = Number.parseInt(trimmed, 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function countAdminSheetFilters(
	params: ReturnType<typeof useAdminUsersListingSearchParams>[0],
) {
	let count = 0;
	if (params.statuses?.length) count += 1;
	if (params.isAdmin != null) count += 1;
	if (params.rangeMin != null || params.rangeMax != null) count += 1;
	if (
		params.minXp != null ||
		params.minRp != null ||
		params.minPosts != null ||
		params.minComments != null ||
		params.minLikes != null ||
		params.minFeedbacks != null ||
		params.minParticipations != null ||
		params.minFavorites != null ||
		params.minShelves != null
	) {
		count += 1;
	}
	return count;
}

function MinCountField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: number | null;
	onChange: (next: number | null) => void;
}) {
	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			<Input
				type="number"
				min={0}
				inputMode="numeric"
				placeholder="Any"
				value={value ?? ""}
				onChange={(event) => {
					onChange(parseOptionalInt(event.target.value));
				}}
			/>
		</Field>
	);
}

export function AdminUsersToolbar() {
	const [params, setParams] = useAdminUsersListingSearchParams();
	const sheetFilterCount = countAdminSheetFilters(params);

	const toggleStatus = (status: UserListingStatus, checked: boolean) => {
		const current = params.statuses ?? [];
		const next = checked
			? [...new Set([...current, status])]
			: current.filter((value) => value !== status);

		void setParams({
			statuses: next.length > 0 ? next : null,
			page: 1,
		});
	};

	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
			<ListingSearch
				value={params.search ?? ""}
				onChange={(search) => {
					void setParams({ search, page: 1 });
				}}
				placeholder="Search by name, username, or email…"
			/>

			<div className="flex flex-wrap items-center gap-2 lg:shrink-0">
				<ListingSort
					sortBy={params.sortBy}
					sortDirection={params.sortDirection}
					onSortByChange={(sortBy) => {
						void setParams({ sortBy, page: 1 });
					}}
					onSortDirectionChange={(sortDirection) => {
						void setParams({ sortDirection, page: 1 });
					}}
					sortByOptions={adminUserSortableFields}
					sortByLabels={adminUserSortByLabels}
				/>

				<ListingFiltersSheet
					title="Member filters"
					description="Filter by role, status, join date, or minimum activity."
					activeFilterCount={sheetFilterCount}
					onClear={() => {
						void setParams({
							statuses: null,
							isAdmin: null,
							rangeBy: null,
							rangeMin: null,
							rangeMax: null,
							minXp: null,
							minRp: null,
							minPosts: null,
							minComments: null,
							minLikes: null,
							minFeedbacks: null,
							minParticipations: null,
							minFavorites: null,
							minShelves: null,
							page: 1,
						});
					}}
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
										page: 1,
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
							void setParams({ rangeBy, page: 1 });
						}}
						onRangeMinChange={(rangeMin) => {
							void setParams({ rangeMin, page: 1 });
						}}
						onRangeMaxChange={(rangeMax) => {
							void setParams({ rangeMax, page: 1 });
						}}
						rangeByOptions={["createdAt"] as const}
						rangeByLabels={userRangeByLabels}
					/>

					<div className="grid grid-cols-2 gap-3">
						<MinCountField
							label="Min XP"
							value={params.minXp}
							onChange={(minXp) => {
								void setParams({ minXp, page: 1 });
							}}
						/>
						<MinCountField
							label="Min RP"
							value={params.minRp}
							onChange={(minRp) => {
								void setParams({ minRp, page: 1 });
							}}
						/>
						<MinCountField
							label="Min posts"
							value={params.minPosts}
							onChange={(minPosts) => {
								void setParams({ minPosts, page: 1 });
							}}
						/>
						<MinCountField
							label="Min comments"
							value={params.minComments}
							onChange={(minComments) => {
								void setParams({ minComments, page: 1 });
							}}
						/>
						<MinCountField
							label="Min likes"
							value={params.minLikes}
							onChange={(minLikes) => {
								void setParams({ minLikes, page: 1 });
							}}
						/>
						<MinCountField
							label="Min feedbacks"
							value={params.minFeedbacks}
							onChange={(minFeedbacks) => {
								void setParams({ minFeedbacks, page: 1 });
							}}
						/>
						<MinCountField
							label="Min sittings"
							value={params.minParticipations}
							onChange={(minParticipations) => {
								void setParams({ minParticipations, page: 1 });
							}}
						/>
						<MinCountField
							label="Min favorites"
							value={params.minFavorites}
							onChange={(minFavorites) => {
								void setParams({ minFavorites, page: 1 });
							}}
						/>
						<MinCountField
							label="Min shelves"
							value={params.minShelves}
							onChange={(minShelves) => {
								void setParams({ minShelves, page: 1 });
							}}
						/>
					</div>
				</ListingFiltersSheet>
			</div>
		</div>
	);
}
