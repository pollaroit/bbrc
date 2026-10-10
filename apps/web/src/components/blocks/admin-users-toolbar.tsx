"use client";

import { adminUserSortableFields } from "@bbrc/api/modules/admin/admin-user.listing";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { OverviewFiltersPin } from "@/components/listing/overview-filters-pin";
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
import { cn } from "@/lib/utils";

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
	if (params.isHidden != null) count += 1;
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
		params.minShelves != null ||
		params.minDocuments != null ||
		params.minBookRequests != null ||
		params.minFactImpressions != null ||
		params.minReads != null ||
		params.maxReads != null
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

type AdminUsersToolbarProps = {
	variant?: "list" | "overview";
};

export function AdminUsersToolbar({
	variant = "list",
}: AdminUsersToolbarProps) {
	const [params, setParams] = useAdminUsersListingSearchParams();
	const sheetFilterCount = countAdminSheetFilters(params);
	const resetPage = variant === "list" ? { page: 1 as const } : {};

	const toggleStatus = (status: UserListingStatus, checked: boolean) => {
		const current = params.statuses ?? [];
		const next = checked
			? [...new Set([...current, status])]
			: current.filter((value) => value !== status);

		void setParams({
			statuses: next.length > 0 ? next : null,
			...resetPage,
		});
	};

	return (
		<div
			className={cn(
				"flex w-full flex-col gap-3",
				variant === "list" && "lg:flex-row lg:items-center",
			)}
		>
			<ListingSearch
				value={params.search ?? ""}
				onChange={(search) => {
					void setParams({ search, ...resetPage });
				}}
				placeholder="Search by name, username, or email…"
				className={variant === "overview" ? "w-full max-w-2xl" : undefined}
			/>

			<div
				className={cn(
					"flex flex-wrap items-center gap-2",
					variant === "list" && "lg:shrink-0",
					variant === "overview" && "w-full",
				)}
			>
				{variant === "list" ? (
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
				) : null}

				{variant === "overview" ? (
					<OverviewFiltersPin>
						<MemberFiltersSheet
							params={params}
							setParams={setParams}
							resetPage={resetPage}
							sheetFilterCount={sheetFilterCount}
							toggleStatus={toggleStatus}
						/>
					</OverviewFiltersPin>
				) : (
					<MemberFiltersSheet
						params={params}
						setParams={setParams}
						resetPage={resetPage}
						sheetFilterCount={sheetFilterCount}
						toggleStatus={toggleStatus}
					/>
				)}
			</div>
		</div>
	);
}

function MemberFiltersSheet({
	params,
	setParams,
	resetPage,
	sheetFilterCount,
	toggleStatus,
}: {
	params: ReturnType<typeof useAdminUsersListingSearchParams>[0];
	setParams: ReturnType<typeof useAdminUsersListingSearchParams>[1];
	resetPage: { page?: 1 };
	sheetFilterCount: number;
	toggleStatus: (status: UserListingStatus, checked: boolean) => void;
}) {
	return (
		<ListingFiltersSheet
			title="Member filters"
			description="Filter by role, status, join date, read count, or minimum activity."
			activeFilterCount={sheetFilterCount}
			onClear={() => {
				void setParams({
					statuses: null,
					isAdmin: null,
					isHidden: null,
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
					minDocuments: null,
					minBookRequests: null,
					minFactImpressions: null,
					minReads: null,
					maxReads: null,
					...resetPage,
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
								...resetPage,
							});
						},
					},
				]}
			/>

			<ListingCheckboxList
				legend="Visibility"
				options={[
					{
						id: "hidden",
						label: "Hidden (ghost) only",
						checked: params.isHidden === true,
						onCheckedChange: (checked) => {
							void setParams({
								isHidden: checked ? true : null,
								...resetPage,
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
					void setParams({ rangeBy, ...resetPage });
				}}
				onRangeMinChange={(rangeMin) => {
					void setParams({ rangeMin, ...resetPage });
				}}
				onRangeMaxChange={(rangeMax) => {
					void setParams({ rangeMax, ...resetPage });
				}}
				rangeByOptions={["createdAt"] as const}
				rangeByLabels={userRangeByLabels}
			/>

			<fieldset className="flex min-w-0 flex-col gap-3 border-0 p-0">
				<legend className="mb-1 font-medium text-sm">Reads</legend>
				<p className="text-muted-foreground text-xs">
					How many books each member has marked as read.
				</p>
				<div className="grid grid-cols-2 gap-3">
					<MinCountField
						label="Minimum"
						value={params.minReads}
						onChange={(minReads) => {
							void setParams({ minReads, ...resetPage });
						}}
					/>
					<MinCountField
						label="Maximum"
						value={params.maxReads}
						onChange={(maxReads) => {
							void setParams({ maxReads, ...resetPage });
						}}
					/>
				</div>
			</fieldset>

			<fieldset className="flex min-w-0 flex-col gap-3 border-0 p-0">
				<legend className="mb-1 font-medium text-sm">Minimum activity</legend>
				<div className="grid grid-cols-2 gap-3">
					<MinCountField
						label="Min XP"
						value={params.minXp}
						onChange={(minXp) => {
							void setParams({ minXp, ...resetPage });
						}}
					/>
					<MinCountField
						label="Min RP"
						value={params.minRp}
						onChange={(minRp) => {
							void setParams({ minRp, ...resetPage });
						}}
					/>
					<MinCountField
						label="Min posts"
						value={params.minPosts}
						onChange={(minPosts) => {
							void setParams({ minPosts, ...resetPage });
						}}
					/>
					<MinCountField
						label="Min comments"
						value={params.minComments}
						onChange={(minComments) => {
							void setParams({ minComments, ...resetPage });
						}}
					/>
					<MinCountField
						label="Min likes"
						value={params.minLikes}
						onChange={(minLikes) => {
							void setParams({ minLikes, ...resetPage });
						}}
					/>
					<MinCountField
						label="Min feedbacks"
						value={params.minFeedbacks}
						onChange={(minFeedbacks) => {
							void setParams({ minFeedbacks, ...resetPage });
						}}
					/>
					<MinCountField
						label="Min sittings"
						value={params.minParticipations}
						onChange={(minParticipations) => {
							void setParams({ minParticipations, ...resetPage });
						}}
					/>
					<MinCountField
						label="Min favorites"
						value={params.minFavorites}
						onChange={(minFavorites) => {
							void setParams({ minFavorites, ...resetPage });
						}}
					/>
					<MinCountField
						label="Min shelves"
						value={params.minShelves}
						onChange={(minShelves) => {
							void setParams({ minShelves, ...resetPage });
						}}
					/>
					<MinCountField
						label="Min documents"
						value={params.minDocuments}
						onChange={(minDocuments) => {
							void setParams({ minDocuments, ...resetPage });
						}}
					/>
					<MinCountField
						label="Min book requests"
						value={params.minBookRequests}
						onChange={(minBookRequests) => {
							void setParams({ minBookRequests, ...resetPage });
						}}
					/>
					<MinCountField
						label="Min fact views"
						value={params.minFactImpressions}
						onChange={(minFactImpressions) => {
							void setParams({ minFactImpressions, ...resetPage });
						}}
					/>
				</div>
			</fieldset>
		</ListingFiltersSheet>
	);
}
