"use client";

import { adminBookSortableFields } from "@bbrc/api/modules/admin/admin-book.listing";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import {
	adminBookSortByLabels,
	useAdminBooksListingSearchParams,
} from "@/lib/listing/admin-books-listing";
import {
	type BookListingStatus,
	bookStatuses,
	bookStatusFilterLabels,
} from "@/lib/listing/books-listing";

const bookRangeByOptions = ["createdAt", "updatedAt"] as const;

const bookRangeByLabels = {
	createdAt: "Added",
	updatedAt: "Updated",
} as const;

function parseOptionalInt(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === "") {
		return null;
	}
	const parsed = Number.parseInt(trimmed, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalRating(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === "") {
		return null;
	}
	const parsed = Number.parseFloat(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

function countAdminBookSheetFilters(
	params: ReturnType<typeof useAdminBooksListingSearchParams>[0],
) {
	let count = 0;
	if (params.statuses?.length) count += 1;
	if (params.rangeMin != null || params.rangeMax != null) count += 1;
	if (
		params.minPages != null ||
		params.maxPages != null ||
		params.minOpenLibraryRating != null ||
		params.maxOpenLibraryRating != null
	) {
		count += 1;
	}
	if (params.missingClubRating != null) count += 1;
	if (params.missingOpenLibraryRating != null) count += 1;
	return count;
}

export function AdminBooksToolbar() {
	const [params, setParams] = useAdminBooksListingSearchParams();
	const sheetFilterCount = countAdminBookSheetFilters(params);

	const toggleStatus = (status: BookListingStatus, checked: boolean) => {
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
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<ListingSearch
					value={params.search ?? ""}
					onChange={(search) => {
						void setParams({ search: search || null, page: 1 });
					}}
					placeholder="Search title or slug…"
					className="max-w-md"
				/>
				<div className="flex flex-wrap items-center gap-2">
					<ListingSort
						sortBy={params.sortBy}
						sortDirection={params.sortDirection}
						sortByOptions={adminBookSortableFields}
						sortByLabels={adminBookSortByLabels}
						onSortByChange={(sortBy) => {
							void setParams({ sortBy, page: 1 });
						}}
						onSortDirectionChange={(sortDirection) => {
							void setParams({ sortDirection, page: 1 });
						}}
					/>
					<ListingFiltersSheet
						title="Book filters"
						description="Status, dates, pages, and ratings."
						activeFilterCount={sheetFilterCount}
						onClear={() => {
							void setParams({
								statuses: null,
								rangeBy: null,
								rangeMin: null,
								rangeMax: null,
								minPages: null,
								maxPages: null,
								minOpenLibraryRating: null,
								maxOpenLibraryRating: null,
								missingClubRating: null,
								missingOpenLibraryRating: null,
								page: 1,
							});
						}}
					>
						<ListingCheckboxList
							legend="Status"
							options={bookStatuses.map((status) => ({
								id: status,
								label: bookStatusFilterLabels[status],
								checked: params.statuses?.includes(status) ?? false,
								onCheckedChange: (checked) => {
									toggleStatus(status, checked);
								},
							}))}
						/>
						<ListingRangeFields
							rangeBy={params.rangeBy}
							rangeMin={params.rangeMin}
							rangeMax={params.rangeMax}
							rangeByOptions={bookRangeByOptions}
							rangeByLabels={bookRangeByLabels}
							onRangeByChange={(rangeBy) => {
								void setParams({ rangeBy, page: 1 });
							}}
							onRangeMinChange={(rangeMin) => {
								void setParams({ rangeMin, page: 1 });
							}}
							onRangeMaxChange={(rangeMax) => {
								void setParams({ rangeMax, page: 1 });
							}}
						/>
						<div className="grid gap-3 sm:grid-cols-2">
							<Field>
								<FieldLabel>Min pages</FieldLabel>
								<Input
									type="number"
									min={1}
									placeholder="Any"
									value={params.minPages ?? ""}
									onChange={(e) => {
										void setParams({
											minPages: parseOptionalInt(e.target.value),
											page: 1,
										});
									}}
								/>
							</Field>
							<Field>
								<FieldLabel>Max pages</FieldLabel>
								<Input
									type="number"
									min={1}
									placeholder="Any"
									value={params.maxPages ?? ""}
									onChange={(e) => {
										void setParams({
											maxPages: parseOptionalInt(e.target.value),
											page: 1,
										});
									}}
								/>
							</Field>
							<Field>
								<FieldLabel>Min OL rating</FieldLabel>
								<Input
									type="number"
									min={0}
									max={5}
									step={0.1}
									placeholder="Any"
									value={params.minOpenLibraryRating ?? ""}
									onChange={(e) => {
										void setParams({
											minOpenLibraryRating: parseOptionalRating(e.target.value),
											page: 1,
										});
									}}
								/>
							</Field>
							<Field>
								<FieldLabel>Max OL rating</FieldLabel>
								<Input
									type="number"
									min={0}
									max={5}
									step={0.1}
									placeholder="Any"
									value={params.maxOpenLibraryRating ?? ""}
									onChange={(e) => {
										void setParams({
											maxOpenLibraryRating: parseOptionalRating(e.target.value),
											page: 1,
										});
									}}
								/>
							</Field>
						</div>
						<ListingCheckboxList
							legend="Missing ratings"
							options={[
								{
									id: "missingClub",
									label: "No club rating",
									checked: params.missingClubRating === true,
									onCheckedChange: (checked) => {
										void setParams({
											missingClubRating: checked ? true : null,
											page: 1,
										});
									},
								},
								{
									id: "missingOl",
									label: "No OL rating",
									checked: params.missingOpenLibraryRating === true,
									onCheckedChange: (checked) => {
										void setParams({
											missingOpenLibraryRating: checked ? true : null,
											page: 1,
										});
									},
								},
							]}
						/>
					</ListingFiltersSheet>
				</div>
			</div>
		</div>
	);
}
