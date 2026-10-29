"use client";

import { adminSittingSortableFields } from "@bbrc/api/modules/admin/admin-sitting.listing";
import { sittingRangeableFields } from "@bbrc/api/modules/sitting/sitting.listing";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingMemberMultiSelect } from "@/components/listing/listing-member-multi-select";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { OverviewFiltersPin } from "@/components/listing/overview-filters-pin";
import {
	adminSittingRangeByLabels,
	adminSittingSortByLabels,
	adminSittingStatuses,
	useAdminSittingsListingSearchParams,
} from "@/lib/listing/admin-sittings-listing";
import {
	type SittingListingStatus,
	sittingStatusFilterLabels,
} from "@/lib/listing/sittings-listing";
import { cn } from "@/lib/utils";

function parseOptionalInt(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === "") {
		return null;
	}
	const parsed = Number.parseInt(trimmed, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function countAdminSittingSheetFilters(
	params: ReturnType<typeof useAdminSittingsListingSearchParams>[0],
) {
	let count = 0;
	if (params.statuses?.length) count += 1;
	if (params.ongoingOnly != null) count += 1;
	if (
		params.hasSelectedBook != null ||
		params.deadlineOverdue != null ||
		params.hasMidtermScheduled != null
	) {
		count += 1;
	}
	if (params.participantUsernames?.length) count += 1;
	if (params.rangeMin != null || params.rangeMax != null) count += 1;
	if (
		params.minParticipants != null ||
		params.minActiveParticipants != null ||
		params.minPollVotes != null ||
		params.minPollOptions != null ||
		params.minCompletedParticipants != null ||
		params.minDnfParticipants != null ||
		params.minPostAttachments != null
	) {
		count += 1;
	}
	if (
		params.minSelectedBookPages != null ||
		params.maxSelectedBookPages != null
	) {
		count += 1;
	}
	return count;
}

type AdminSittingsToolbarProps = {
	variant?: "list" | "overview";
};

export function AdminSittingsToolbar({
	variant = "list",
}: AdminSittingsToolbarProps) {
	const [params, setParams] = useAdminSittingsListingSearchParams();
	const sheetFilterCount = countAdminSittingSheetFilters(params);
	const resetPage = variant === "list" ? { page: 1 as const } : {};

	const toggleStatus = (status: SittingListingStatus, checked: boolean) => {
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
		<div className="flex w-full flex-col gap-3">
			<div
				className={cn(
					"flex w-full flex-col gap-3",
					variant === "list" && "lg:flex-row lg:items-end lg:justify-between",
				)}
			>
				<ListingSearch
					value={params.search ?? ""}
					onChange={(search) => {
						void setParams({ search: search || null, ...resetPage });
					}}
					placeholder="Search slug or selected book title…"
					className={variant === "overview" ? "w-full max-w-2xl" : "max-w-md"}
				/>
				<div
					className={cn(
						"flex flex-wrap items-center gap-2",
						variant === "overview" && "w-full",
					)}
				>
					{variant === "list" ? (
						<ListingSort
							sortBy={params.sortBy}
							sortDirection={params.sortDirection}
							sortByOptions={adminSittingSortableFields}
							sortByLabels={adminSittingSortByLabels}
							onSortByChange={(sortBy) => {
								void setParams({ sortBy, page: 1 });
							}}
							onSortDirectionChange={(sortDirection) => {
								void setParams({ sortDirection, page: 1 });
							}}
						/>
					) : null}
					{variant === "overview" ? (
						<OverviewFiltersPin>
							<SittingFiltersSheet
								params={params}
								setParams={setParams}
								resetPage={resetPage}
								sheetFilterCount={sheetFilterCount}
								toggleStatus={toggleStatus}
							/>
						</OverviewFiltersPin>
					) : (
						<SittingFiltersSheet
							params={params}
							setParams={setParams}
							resetPage={resetPage}
							sheetFilterCount={sheetFilterCount}
							toggleStatus={toggleStatus}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

function SittingFiltersSheet({
	params,
	setParams,
	resetPage,
	sheetFilterCount,
	toggleStatus,
}: {
	params: ReturnType<typeof useAdminSittingsListingSearchParams>[0];
	setParams: ReturnType<typeof useAdminSittingsListingSearchParams>[1];
	resetPage: { page?: 1 };
	sheetFilterCount: number;
	toggleStatus: (status: SittingListingStatus, checked: boolean) => void;
}) {
	return (
		<ListingFiltersSheet
			title="Sitting filters"
			description="Status, lifecycle flags, selected book, dates, and engagement."
			activeFilterCount={sheetFilterCount}
			onClear={() => {
				void setParams({
					statuses: null,
					ongoingOnly: null,
					hasSelectedBook: null,
					deadlineOverdue: null,
					hasMidtermScheduled: null,
					participantUsernames: null,
					rangeBy: null,
					rangeMin: null,
					rangeMax: null,
					minParticipants: null,
					minActiveParticipants: null,
					minPollVotes: null,
					minPollOptions: null,
					minCompletedParticipants: null,
					minDnfParticipants: null,
					minPostAttachments: null,
					minSelectedBookPages: null,
					maxSelectedBookPages: null,
					...resetPage,
				});
			}}
		>
			<ListingCheckboxList
				legend="Status"
				options={adminSittingStatuses.map((status) => ({
					id: status,
					label: sittingStatusFilterLabels[status],
					checked: params.statuses?.includes(status) ?? false,
					onCheckedChange: (checked) => {
						toggleStatus(status, checked);
					},
				}))}
			/>
			<ListingCheckboxList
				legend="Lifecycle"
				options={[
					{
						id: "ongoingOnly",
						label: "Ongoing only (voting or reading)",
						checked: params.ongoingOnly === true,
						onCheckedChange: (checked) => {
							void setParams({
								ongoingOnly: checked ? true : null,
								...resetPage,
							});
						},
					},
					{
						id: "hasSelectedBook",
						label: "Has selected book",
						checked: params.hasSelectedBook === true,
						onCheckedChange: (checked) => {
							void setParams({
								hasSelectedBook: checked ? true : null,
								...resetPage,
							});
						},
					},
					{
						id: "deadlineOverdue",
						label: "Voting deadline overdue",
						checked: params.deadlineOverdue === true,
						onCheckedChange: (checked) => {
							void setParams({
								deadlineOverdue: checked ? true : null,
								...resetPage,
							});
						},
					},
					{
						id: "hasMidtermScheduled",
						label: "Midterm scheduled",
						checked: params.hasMidtermScheduled === true,
						onCheckedChange: (checked) => {
							void setParams({
								hasMidtermScheduled: checked ? true : null,
								...resetPage,
							});
						},
					},
				]}
			/>
			<ListingMemberMultiSelect
				legend="Participants"
				selectedUsernames={params.participantUsernames ?? []}
				onSelectedUsernamesChange={(participantUsernames) => {
					void setParams({
						participantUsernames:
							participantUsernames.length > 0 ? participantUsernames : null,
						...resetPage,
					});
				}}
			/>
			<ListingRangeFields
				rangeBy={params.rangeBy}
				rangeMin={params.rangeMin}
				rangeMax={params.rangeMax}
				rangeByOptions={sittingRangeableFields}
				rangeByLabels={adminSittingRangeByLabels}
				onRangeByChange={(rangeBy) => {
					void setParams({ rangeBy, ...resetPage });
				}}
				onRangeMinChange={(rangeMin) => {
					void setParams({ rangeMin, ...resetPage });
				}}
				onRangeMaxChange={(rangeMax) => {
					void setParams({ rangeMax, ...resetPage });
				}}
			/>
			<div className="grid gap-3 sm:grid-cols-2">
				<Field>
					<FieldLabel>Min participants</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.minParticipants ?? ""}
						onChange={(e) => {
							void setParams({
								minParticipants: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Min active participants</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.minActiveParticipants ?? ""}
						onChange={(e) => {
							void setParams({
								minActiveParticipants: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Min completed readers</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.minCompletedParticipants ?? ""}
						onChange={(e) => {
							void setParams({
								minCompletedParticipants: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Min DNF</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.minDnfParticipants ?? ""}
						onChange={(e) => {
							void setParams({
								minDnfParticipants: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Min poll votes</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.minPollVotes ?? ""}
						onChange={(e) => {
							void setParams({
								minPollVotes: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Min poll options</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.minPollOptions ?? ""}
						onChange={(e) => {
							void setParams({
								minPollOptions: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Min post attachments</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.minPostAttachments ?? ""}
						onChange={(e) => {
							void setParams({
								minPostAttachments: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<Field>
					<FieldLabel>Min selected book pages</FieldLabel>
					<Input
						type="number"
						min={1}
						placeholder="Any"
						value={params.minSelectedBookPages ?? ""}
						onChange={(e) => {
							void setParams({
								minSelectedBookPages: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Max selected book pages</FieldLabel>
					<Input
						type="number"
						min={1}
						placeholder="Any"
						value={params.maxSelectedBookPages ?? ""}
						onChange={(e) => {
							void setParams({
								maxSelectedBookPages: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
			</div>
		</ListingFiltersSheet>
	);
}
