"use client";

import { adminBookSortableFields } from "@bbrc/api/modules/admin/admin-book.listing";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { useMemo } from "react";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingCountryMultiSelect } from "@/components/listing/listing-country-multi-select";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { OverviewFiltersPin } from "@/components/listing/overview-filters-pin";
import {
	adminBookSortByLabels,
	toAdminBooksCountryFacetsInput,
	useAdminBooksListingSearchParams,
} from "@/lib/listing/admin-books-listing";
import {
	type BookListingStatus,
	bookStatuses,
	bookStatusFilterLabels,
} from "@/lib/listing/books-listing";
import { cn } from "@/lib/utils";

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
		params.maxOpenLibraryRating != null ||
		params.minAverageRating != null ||
		params.maxAverageRating != null
	) {
		count += 1;
	}
	if (
		params.minFeedbacks != null ||
		params.minFavorites != null ||
		params.minPostAttachments != null ||
		params.minPollOptions != null ||
		params.minPollVotes != null ||
		params.minReads != null ||
		params.maxReads != null
	) {
		count += 1;
	}
	if (params.missingClubRating != null) count += 1;
	if (params.missingOpenLibraryRating != null) count += 1;
	if (params.countries?.length) count += 1;
	return count;
}

type AdminBooksToolbarProps = {
	variant?: "list" | "overview";
};

export function AdminBooksToolbar({
	variant = "list",
}: AdminBooksToolbarProps) {
	const [params, setParams] = useAdminBooksListingSearchParams();
	const sheetFilterCount = countAdminBookSheetFilters(params);
	const resetPage = variant === "list" ? { page: 1 as const } : {};
	const countryFacetsInput = useMemo(
		() => toAdminBooksCountryFacetsInput(params),
		[params],
	);

	const toggleStatus = (status: BookListingStatus, checked: boolean) => {
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
					placeholder="Search title or slug…"
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
							sortByOptions={adminBookSortableFields}
							sortByLabels={adminBookSortByLabels}
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
							<BookFiltersSheet
								params={params}
								setParams={setParams}
								resetPage={resetPage}
								sheetFilterCount={sheetFilterCount}
								toggleStatus={toggleStatus}
								countryFacetsInput={countryFacetsInput}
							/>
						</OverviewFiltersPin>
					) : (
						<BookFiltersSheet
							params={params}
							setParams={setParams}
							resetPage={resetPage}
							sheetFilterCount={sheetFilterCount}
							toggleStatus={toggleStatus}
							countryFacetsInput={countryFacetsInput}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

function BookFiltersSheet({
	params,
	setParams,
	resetPage,
	sheetFilterCount,
	toggleStatus,
	countryFacetsInput,
}: {
	params: ReturnType<typeof useAdminBooksListingSearchParams>[0];
	setParams: ReturnType<typeof useAdminBooksListingSearchParams>[1];
	resetPage: { page?: 1 };
	sheetFilterCount: number;
	toggleStatus: (status: BookListingStatus, checked: boolean) => void;
	countryFacetsInput: ReturnType<typeof toAdminBooksCountryFacetsInput>;
}) {
	return (
		<ListingFiltersSheet
			title="Book filters"
			description="Status, countries, dates, pages, and ratings."
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
					minAverageRating: null,
					maxAverageRating: null,
					minFeedbacks: null,
					minFavorites: null,
					minPostAttachments: null,
					minPollOptions: null,
					minPollVotes: null,
					minReads: null,
					maxReads: null,
					missingClubRating: null,
					missingOpenLibraryRating: null,
					countries: null,
					...resetPage,
				});
			}}
		>
			<ListingCountryMultiSelect
				selectedAlpha2={params.countries ?? []}
				onSelectedAlpha2Change={(countries) => {
					void setParams({
						countries: countries.length > 0 ? countries : null,
						...resetPage,
					});
				}}
				facetInput={countryFacetsInput}
			/>
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
					<FieldLabel>Min pages</FieldLabel>
					<Input
						type="number"
						min={1}
						placeholder="Any"
						value={params.minPages ?? ""}
						onChange={(e) => {
							void setParams({
								minPages: parseOptionalInt(e.target.value),
								...resetPage,
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
								...resetPage,
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
								...resetPage,
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
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Min club rating</FieldLabel>
					<Input
						type="number"
						min={0}
						max={5}
						step={0.1}
						placeholder="Any"
						value={params.minAverageRating ?? ""}
						onChange={(e) => {
							void setParams({
								minAverageRating: parseOptionalRating(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Max club rating</FieldLabel>
					<Input
						type="number"
						min={0}
						max={5}
						step={0.1}
						placeholder="Any"
						value={params.maxAverageRating ?? ""}
						onChange={(e) => {
							void setParams({
								maxAverageRating: parseOptionalRating(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<Field>
					<FieldLabel>Min feedbacks</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.minFeedbacks ?? ""}
						onChange={(e) => {
							void setParams({
								minFeedbacks: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Min favorites</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.minFavorites ?? ""}
						onChange={(e) => {
							void setParams({
								minFavorites: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Min reads</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.minReads ?? ""}
						onChange={(e) => {
							void setParams({
								minReads: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Max reads</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.maxReads ?? ""}
						onChange={(e) => {
							void setParams({
								maxReads: parseOptionalInt(e.target.value),
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
								...resetPage,
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
								...resetPage,
							});
						},
					},
				]}
			/>
		</ListingFiltersSheet>
	);
}
