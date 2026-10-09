"use client";

import { adminFeedbackSortableFields } from "@bbrc/api/modules/admin/admin-feedback.listing";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { ListingBookMultiSelect } from "@/components/listing/listing-book-multi-select";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingMemberMultiSelect } from "@/components/listing/listing-member-multi-select";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { OverviewFiltersPin } from "@/components/listing/overview-filters-pin";
import {
	adminFeedbackRangeByLabels,
	adminFeedbackSortByLabels,
	useAdminFeedbacksListingSearchParams,
} from "@/lib/listing/admin-feedbacks-listing";
import { cn } from "@/lib/utils";

const feedbackRangeByOptions = ["createdAt", "updatedAt"] as const;

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

function countAdminFeedbackSheetFilters(
	params: ReturnType<typeof useAdminFeedbacksListingSearchParams>[0],
) {
	let count = 0;
	if (params.rangeMin != null || params.rangeMax != null) count += 1;
	if (params.minRating != null || params.maxRating != null) count += 1;
	if (
		params.minLikes != null ||
		params.minComments != null ||
		params.minPostAttachments != null ||
		params.minReviewLength != null
	) {
		count += 1;
	}
	if (params.minBookPages != null || params.maxBookPages != null) count += 1;
	if (params.bookSlugs?.length) count += 1;
	if (params.authorUsernames?.length) count += 1;
	return count;
}

type AdminFeedbacksToolbarProps = {
	variant?: "list" | "overview";
};

export function AdminFeedbacksToolbar({
	variant = "list",
}: AdminFeedbacksToolbarProps) {
	const [params, setParams] = useAdminFeedbacksListingSearchParams();
	const sheetFilterCount = countAdminFeedbackSheetFilters(params);
	const resetPage = variant === "list" ? { page: 1 as const } : {};

	const filtersSheet = (
		<FeedbackFiltersSheet
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
					placeholder="Search slug, review, book, or author…"
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
							sortByOptions={adminFeedbackSortableFields}
							sortByLabels={adminFeedbackSortByLabels}
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

function FeedbackFiltersSheet({
	params,
	setParams,
	resetPage,
	sheetFilterCount,
}: {
	params: ReturnType<typeof useAdminFeedbacksListingSearchParams>[0];
	setParams: ReturnType<typeof useAdminFeedbacksListingSearchParams>[1];
	resetPage: { page?: 1 };
	sheetFilterCount: number;
}) {
	return (
		<ListingFiltersSheet
			title="Feedback filters"
			description="Ratings, engagement, books, authors, and dates."
			activeFilterCount={sheetFilterCount}
			onClear={() => {
				void setParams({
					rangeBy: null,
					rangeMin: null,
					rangeMax: null,
					minRating: null,
					maxRating: null,
					minLikes: null,
					minComments: null,
					minPostAttachments: null,
					minReviewLength: null,
					minBookPages: null,
					maxBookPages: null,
					bookSlugs: null,
					authorUsernames: null,
					...resetPage,
				});
			}}
		>
			<ListingBookMultiSelect
				selectedSlugs={params.bookSlugs ?? []}
				onSelectedSlugsChange={(bookSlugs) => {
					void setParams({
						bookSlugs: bookSlugs.length > 0 ? bookSlugs : null,
						...resetPage,
					});
				}}
			/>
			<ListingMemberMultiSelect
				legend="Authors"
				selectedUsernames={params.authorUsernames ?? []}
				onSelectedUsernamesChange={(authorUsernames) => {
					void setParams({
						authorUsernames:
							authorUsernames.length > 0 ? authorUsernames : null,
						...resetPage,
					});
				}}
			/>
			<ListingRangeFields
				rangeBy={params.rangeBy}
				rangeMin={params.rangeMin}
				rangeMax={params.rangeMax}
				rangeByOptions={feedbackRangeByOptions}
				rangeByLabels={adminFeedbackRangeByLabels}
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
					<FieldLabel>Min rating</FieldLabel>
					<Input
						type="number"
						min={0}
						max={5}
						step={0.5}
						placeholder="Any"
						value={params.minRating ?? ""}
						onChange={(e) => {
							void setParams({
								minRating: parseOptionalRating(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Max rating</FieldLabel>
					<Input
						type="number"
						min={0}
						max={5}
						step={0.5}
						placeholder="Any"
						value={params.maxRating ?? ""}
						onChange={(e) => {
							void setParams({
								maxRating: parseOptionalRating(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Min likes</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.minLikes ?? ""}
						onChange={(e) => {
							void setParams({
								minLikes: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Min comments</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.minComments ?? ""}
						onChange={(e) => {
							void setParams({
								minComments: parseOptionalInt(e.target.value),
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
					<FieldLabel>Min review length (chars)</FieldLabel>
					<Input
						type="number"
						min={1}
						placeholder="Any"
						value={params.minReviewLength ?? ""}
						onChange={(e) => {
							void setParams({
								minReviewLength: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Min book pages</FieldLabel>
					<Input
						type="number"
						min={1}
						placeholder="Any"
						value={params.minBookPages ?? ""}
						onChange={(e) => {
							void setParams({
								minBookPages: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Max book pages</FieldLabel>
					<Input
						type="number"
						min={1}
						placeholder="Any"
						value={params.maxBookPages ?? ""}
						onChange={(e) => {
							void setParams({
								maxBookPages: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
			</div>
		</ListingFiltersSheet>
	);
}
