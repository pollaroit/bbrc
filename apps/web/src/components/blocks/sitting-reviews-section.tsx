"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { formatFeedbackRating } from "@bbrc/shared";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { FeedbackReviewList } from "@/components/blocks/feedback-review-list";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingRatingRangeFields } from "@/components/listing/listing-rating-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { useFormatters } from "@/lib/i18n/use-formatters";
import {
	countSittingReviewFilters,
	filterAndSortSittingReviews,
	hasActiveSittingReviewFilters,
	sittingReviewSortByLabels,
	sittingReviewSortFields,
	sittingReviewSpoilerLabels,
	sittingReviewSpoilerModes,
	useSittingReviewListingParams,
} from "@/lib/listing/sitting-reviews-listing";
import { orpc } from "@/utils/orpc";

type SittingReviewsSectionProps = {
	sitting: GetSittingBySlugOutput;
};

export function SittingReviewsSection({ sitting }: SittingReviewsSectionProps) {
	const f = useFormatters();
	const { data } = useQuery({
		...orpc.sitting.getSittingBySlug.queryOptions({ input: sitting.slug }),
		initialData: sitting,
	});
	const [params, setParams] = useSittingReviewListingParams();

	const bookSlug = data.selectedBook?.slug ?? "";
	if (!bookSlug) {
		return null;
	}

	const visible = filterAndSortSittingReviews(data.reviews, params);
	const filtered = hasActiveSittingReviewFilters(params);
	const { stats } = data;

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 md:flex-row md:items-center">
				<ListingSearch
					value={params.search ?? ""}
					onChange={(search) => {
						void setParams({ search });
					}}
					placeholder="Search by reader or review…"
				/>
				<div className="flex flex-wrap items-center gap-2 md:shrink-0">
					<ListingSort
						sortBy={params.sortBy}
						sortDirection={params.sortDirection}
						onSortByChange={(sortBy) => {
							void setParams({ sortBy });
						}}
						onSortDirectionChange={(sortDirection) => {
							void setParams({ sortDirection });
						}}
						sortByOptions={sittingReviewSortFields}
						sortByLabels={sittingReviewSortByLabels}
						appearance="library"
					/>
					<ListingFiltersSheet
						title="Review filters"
						description="Narrow reviews by rating or spoilers."
						activeFilterCount={countSittingReviewFilters(params)}
						onClear={() => {
							void setParams({
								minRating: null,
								maxRating: null,
								spoilers: null,
							});
						}}
						appearance="library"
					>
						<ListingRatingRangeFields
							legend="Rating"
							minId="sitting-review-filter-min-rating"
							maxId="sitting-review-filter-max-rating"
							step={0.5}
							min={params.minRating}
							max={params.maxRating}
							onMinChange={(minRating) => {
								void setParams({ minRating });
							}}
							onMaxChange={(maxRating) => {
								void setParams({ maxRating });
							}}
						/>
						<ListingCheckboxList
							legend="Spoilers"
							options={sittingReviewSpoilerModes.map((mode) => ({
								id: mode,
								label: sittingReviewSpoilerLabels[mode],
								checked: params.spoilers === mode,
								onCheckedChange: (checked) => {
									void setParams({ spoilers: checked ? mode : null });
								},
							}))}
						/>
					</ListingFiltersSheet>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-sm tabular-nums">
				<span>
					{visible.length} of {stats.participantCount} readers
					{filtered ? " match your filters" : " reviewed"}
				</span>
				{stats.averageRating != null ? (
					<span className="inline-flex items-center gap-1.5 text-foreground">
						<Star className="size-4 fill-warning text-warning" aria-hidden />
						{formatFeedbackRating(Number(f.decimal(stats.averageRating, 1)))}{" "}
						<span className="text-muted-foreground">average</span>
					</span>
				) : null}
			</div>

			<FeedbackReviewList
				impressionSource="sitting_reviews"
				bookSlug={bookSlug}
				reviews={visible}
				emptyMessage={
					filtered
						? "No reviews match these filters."
						: "No club reviews for this book yet. Members can leave feedback once they finish reading."
				}
			/>
		</section>
	);
}
