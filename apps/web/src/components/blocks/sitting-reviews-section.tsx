"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { formatFeedbackRating } from "@bbrc/shared";
import { useMemo, useState } from "react";
import { FeedbackRatingFilterSelect } from "@/components/blocks/feedback-rating-filter-select";
import { FeedbackReviewList } from "@/components/blocks/feedback-review-list";
import {
	filterReviewsByMinRating,
	parseFeedbackMinRatingFilter,
} from "@/lib/feedback/rating-filter";

type SittingReviewsSectionProps = {
	bookSlug: string;
	reviews: GetSittingBySlugOutput["reviews"];
	participantCount: number;
};

export function SittingReviewsSection({
	bookSlug,
	reviews,
	participantCount,
}: SittingReviewsSectionProps) {
	const [minRatingFilter, setMinRatingFilter] = useState("all");

	const minRating = useMemo(
		() => parseFeedbackMinRatingFilter(minRatingFilter),
		[minRatingFilter],
	);

	const filteredReviews = useMemo(
		() => filterReviewsByMinRating(reviews, minRating),
		[reviews, minRating],
	);

	const emptyMessage =
		minRating !== undefined
			? "No participant reviews match this rating filter."
			: "No club reviews for this book yet. Members can leave feedback once they finish reading.";

	return (
		<section className="flex flex-col gap-3">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="flex flex-col gap-1">
					<h2 className="font-semibold text-lg">Reviews</h2>
					<p className="text-muted-foreground text-sm tabular-nums">
						{filteredReviews.length} of {participantCount} participants
						{minRating !== undefined
							? ` · ${formatFeedbackRating(minRating)}+`
							: ""}
					</p>
				</div>
				<FeedbackRatingFilterSelect
					value={minRatingFilter}
					onValueChange={setMinRatingFilter}
				/>
			</div>

			<FeedbackReviewList
				bookSlug={bookSlug}
				reviews={filteredReviews}
				emptyMessage={emptyMessage}
			/>
		</section>
	);
}
