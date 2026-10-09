"use client";

import { adminShelfSortableFields } from "@bbrc/api/modules/admin/admin-shelf.listing";
import { shelfRangeableFields } from "@bbrc/api/modules/shelf/shelf.listing";
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
	adminShelfRangeByLabels,
	adminShelfSortByLabels,
	adminShelfStatuses,
	adminShelfStatusFilterLabels,
	shelfTypeFilterLabels,
	shelfTypes,
	useAdminShelvesListingSearchParams,
} from "@/lib/listing/admin-shelves-listing";
import { cn } from "@/lib/utils";

function parseOptionalInt(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === "") {
		return null;
	}
	const parsed = Number.parseInt(trimmed, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function countAdminShelfSheetFilters(
	params: ReturnType<typeof useAdminShelvesListingSearchParams>[0],
) {
	let count = 0;
	if (params.statuses?.length) count += 1;
	if (params.types?.length) count += 1;
	if (params.ownerUsernames?.length) count += 1;
	if (params.rangeMin != null || params.rangeMax != null) count += 1;
	if (
		params.minBooks != null ||
		params.minPostAttachments != null ||
		params.hasCoverImage != null
	) {
		count += 1;
	}
	return count;
}

type AdminShelvesToolbarProps = {
	variant?: "list" | "overview";
};

export function AdminShelvesToolbar({
	variant = "list",
}: AdminShelvesToolbarProps) {
	const [params, setParams] = useAdminShelvesListingSearchParams();
	const sheetFilterCount = countAdminShelfSheetFilters(params);
	const resetPage = variant === "list" ? { page: 1 as const } : {};

	const toggleStatus = (
		status: (typeof adminShelfStatuses)[number],
		checked: boolean,
	) => {
		const current = params.statuses ?? [];
		const next = checked
			? [...new Set([...current, status])]
			: current.filter((value) => value !== status);

		void setParams({
			statuses: next.length > 0 ? next : null,
			...resetPage,
		});
	};

	const toggleType = (type: (typeof shelfTypes)[number], checked: boolean) => {
		const current = params.types ?? [];
		const next = checked
			? [...new Set([...current, type])]
			: current.filter((value) => value !== type);

		void setParams({
			types: next.length > 0 ? next : null,
			...resetPage,
		});
	};

	const filtersSheet = (
		<ShelfFiltersSheet
			params={params}
			setParams={setParams}
			resetPage={resetPage}
			sheetFilterCount={sheetFilterCount}
			toggleStatus={toggleStatus}
			toggleType={toggleType}
		/>
	);

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
					placeholder="Search title, slug, owner…"
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
							sortByOptions={adminShelfSortableFields}
							sortByLabels={adminShelfSortByLabels}
							onSortByChange={(sortBy) => {
								void setParams({ sortBy, page: 1 });
							}}
							onSortDirectionChange={(sortDirection) => {
								void setParams({ sortDirection, page: 1 });
							}}
						/>
					) : null}
					{variant === "overview" ? (
						<OverviewFiltersPin>{filtersSheet}</OverviewFiltersPin>
					) : (
						filtersSheet
					)}
				</div>
			</div>
		</div>
	);
}

function ShelfFiltersSheet({
	params,
	setParams,
	resetPage,
	sheetFilterCount,
	toggleStatus,
	toggleType,
}: {
	params: ReturnType<typeof useAdminShelvesListingSearchParams>[0];
	setParams: ReturnType<typeof useAdminShelvesListingSearchParams>[1];
	resetPage: { page?: 1 };
	sheetFilterCount: number;
	toggleStatus: (
		status: (typeof adminShelfStatuses)[number],
		checked: boolean,
	) => void;
	toggleType: (type: (typeof shelfTypes)[number], checked: boolean) => void;
}) {
	return (
		<ListingFiltersSheet
			title="Shelf filters"
			description="Visibility, list type, owners, dates, and engagement."
			activeFilterCount={sheetFilterCount}
			onClear={() => {
				void setParams({
					statuses: null,
					types: null,
					ownerUsernames: null,
					rangeBy: null,
					rangeMin: null,
					rangeMax: null,
					minBooks: null,
					hasCoverImage: null,
					minPostAttachments: null,
					...resetPage,
				});
			}}
		>
			<ListingCheckboxList
				legend="Status"
				options={adminShelfStatuses.map((status) => ({
					id: status,
					label: adminShelfStatusFilterLabels[status],
					checked: params.statuses?.includes(status) ?? false,
					onCheckedChange: (checked) => {
						toggleStatus(status, checked);
					},
				}))}
			/>
			<ListingCheckboxList
				legend="List type"
				options={shelfTypes.map((type) => ({
					id: type,
					label: shelfTypeFilterLabels[type],
					checked: params.types?.includes(type) ?? false,
					onCheckedChange: (checked) => {
						toggleType(type, checked);
					},
				}))}
			/>
			<ListingCheckboxList
				legend="Cover"
				options={[
					{
						id: "hasCoverImage",
						label: "Custom cover image",
						checked: params.hasCoverImage === true,
						onCheckedChange: (checked) => {
							void setParams({
								hasCoverImage: checked ? true : null,
								...resetPage,
							});
						},
					},
				]}
			/>
			<ListingMemberMultiSelect
				legend="Owners"
				selectedUsernames={params.ownerUsernames ?? []}
				onSelectedUsernamesChange={(ownerUsernames) => {
					void setParams({
						ownerUsernames: ownerUsernames.length > 0 ? ownerUsernames : null,
						...resetPage,
					});
				}}
			/>
			<ListingRangeFields
				rangeBy={params.rangeBy}
				rangeMin={params.rangeMin}
				rangeMax={params.rangeMax}
				rangeByOptions={shelfRangeableFields}
				rangeByLabels={adminShelfRangeByLabels}
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
					<FieldLabel>Min books on shelf</FieldLabel>
					<Input
						type="number"
						min={1}
						placeholder="Any"
						value={params.minBooks ?? ""}
						onChange={(e) => {
							void setParams({
								minBooks: parseOptionalInt(e.target.value),
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
		</ListingFiltersSheet>
	);
}
