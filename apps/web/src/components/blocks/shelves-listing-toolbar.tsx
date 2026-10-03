"use client";

import {
	shelfRangeableFields,
	shelfSortableFields,
	shelfTypes,
} from "@bbrc/api/modules/shelf/shelf.listing";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import {
	clearShelvesSheetFilters,
	countShelvesSheetFilters,
	shelfRangeByLabels,
	shelfSortByLabels,
	shelfTypeFilterLabels,
	useShelvesListingSearchParams,
} from "@/lib/listing/shelves-listing";

function parseOptionalInt(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === "") {
		return null;
	}
	const parsed = Number.parseInt(trimmed, 10);
	return Number.isNaN(parsed) ? null : parsed;
}

export function ShelvesListingToolbar() {
	const [params, setParams] = useShelvesListingSearchParams();
	const sheetFilterCount = countShelvesSheetFilters(params);

	const toggleType = (type: (typeof shelfTypes)[number], checked: boolean) => {
		const current = params.types ?? [];
		const next = checked
			? [...new Set([...current, type])]
			: current.filter((value) => value !== type);

		void setParams({
			types: next.length > 0 ? next : null,
		});
	};

	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
			<ListingSearch
				value={params.search ?? ""}
				onChange={(search) => {
					void setParams({ search });
				}}
				placeholder="Search by shelf title or @username…"
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
					sortByOptions={shelfSortableFields}
					sortByLabels={shelfSortByLabels}
				/>

				<ListingFiltersSheet
					title="Shelf filters"
					description="Filter by list type, minimum books, or date."
					activeFilterCount={sheetFilterCount}
					onClear={() => clearShelvesSheetFilters(setParams)}
				>
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

					<Field>
						<FieldLabel>Minimum books</FieldLabel>
						<Input
							type="number"
							min={1}
							inputMode="numeric"
							placeholder="Any"
							value={params.minBooks ?? ""}
							onChange={(event) => {
								void setParams({
									minBooks: parseOptionalInt(event.target.value),
								});
							}}
						/>
					</Field>

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
						rangeByOptions={shelfRangeableFields}
						rangeByLabels={shelfRangeByLabels}
					/>
				</ListingFiltersSheet>
			</div>
		</div>
	);
}
