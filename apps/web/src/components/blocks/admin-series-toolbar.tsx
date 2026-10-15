"use client";

import { adminSeriesSortableFields } from "@bbrc/api/modules/admin/admin-series.listing";
import { seriesRangeableFields } from "@bbrc/api/modules/series/series.listing";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { OverviewFiltersPin } from "@/components/listing/overview-filters-pin";
import {
	adminSeriesRangeByLabels,
	adminSeriesSortByLabels,
	useAdminSeriesListingSearchParams,
} from "@/lib/listing/admin-series-listing";
import { cn } from "@/lib/utils";

function parseOptionalInt(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === "") {
		return null;
	}
	const parsed = Number.parseInt(trimmed, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function countAdminSeriesSheetFilters(
	params: ReturnType<typeof useAdminSeriesListingSearchParams>[0],
) {
	let count = 0;
	if (params.rangeMin != null || params.rangeMax != null) count += 1;
	if (params.minBooks != null || params.hasDescription != null) count += 1;
	return count;
}

type AdminSeriesToolbarProps = {
	variant?: "list" | "overview";
};

function SeriesFiltersSheet({
	params,
	setParams,
	resetPage,
	sheetFilterCount,
}: {
	params: ReturnType<typeof useAdminSeriesListingSearchParams>[0];
	setParams: ReturnType<typeof useAdminSeriesListingSearchParams>[1];
	resetPage: { page?: 1 };
	sheetFilterCount: number;
}) {
	return (
		<ListingFiltersSheet
			title="Series filters"
			description="Date range, size, and description."
			activeFilterCount={sheetFilterCount}
			onClear={() => {
				void setParams({
					rangeBy: null,
					rangeMin: null,
					rangeMax: null,
					minBooks: null,
					hasDescription: null,
					...resetPage,
				});
			}}
		>
			<ListingRangeFields
				rangeBy={params.rangeBy}
				rangeMin={params.rangeMin}
				rangeMax={params.rangeMax}
				rangeByOptions={seriesRangeableFields}
				rangeByLabels={adminSeriesRangeByLabels}
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
			<Field>
				<FieldLabel htmlFor="admin-series-min-books">
					Minimum books in series
				</FieldLabel>
				<Input
					id="admin-series-min-books"
					inputMode="numeric"
					value={params.minBooks?.toString() ?? ""}
					onChange={(event) => {
						const parsed = parseOptionalInt(event.target.value);
						void setParams({
							minBooks: parsed,
							...resetPage,
						});
					}}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="admin-series-has-description">
					Has description
				</FieldLabel>
				<select
					id="admin-series-has-description"
					className="border border-input bg-background px-3 py-2 text-sm"
					value={
						params.hasDescription === true
							? "yes"
							: params.hasDescription === false
								? "no"
								: ""
					}
					onChange={(event) => {
						const value = event.target.value;
						void setParams({
							hasDescription:
								value === "yes" ? true : value === "no" ? false : null,
							...resetPage,
						});
					}}
				>
					<option value="">Any</option>
					<option value="yes">Yes</option>
					<option value="no">No</option>
				</select>
			</Field>
		</ListingFiltersSheet>
	);
}

export function AdminSeriesToolbar({
	variant = "list",
}: AdminSeriesToolbarProps) {
	const [params, setParams] = useAdminSeriesListingSearchParams();
	const sheetFilterCount = countAdminSeriesSheetFilters(params);
	const resetPage = variant === "list" ? { page: 1 as const } : {};

	const filtersSheet = (
		<SeriesFiltersSheet
			params={params}
			setParams={setParams}
			resetPage={resetPage}
			sheetFilterCount={sheetFilterCount}
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
					placeholder="Search title, slug, or description…"
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
							sortByOptions={adminSeriesSortableFields}
							sortByLabels={adminSeriesSortByLabels}
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
