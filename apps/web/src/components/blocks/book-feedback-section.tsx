"use client";

import type { GetBookFeedbackListOutput } from "@bbrc/api/modules/feedback/feedback.schema";
import { Button } from "@bbrc/ui/components/button";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FeedbackFormDialog } from "@/components/blocks/feedback-form-dialog";
import { FeedbackListSort } from "@/components/blocks/feedback-list-sort";
import { FeedbackRatingFilterSelect } from "@/components/blocks/feedback-rating-filter-select";
import { FeedbackReviewList } from "@/components/blocks/feedback-review-list";
import { authClient } from "@/lib/auth-client";
import {
	feedbackListParamsToQuery,
	isDefaultFeedbackListParams,
	useFeedbackListSearchParams,
} from "@/lib/feedback/feedback-list-search-params";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { orpc } from "@/utils/orpc";

type BookFeedbackSectionProps = {
	bookSlug: string;
	initialReviews: GetBookFeedbackListOutput;
};

export function BookFeedbackSection({
	bookSlug,
	initialReviews,
}: BookFeedbackSectionProps) {
	const t = useTranslations("books");
	const f = useFormatters();
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const [searchParams, setSearchParams] = useFeedbackListSearchParams();
	const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

	const { minRating, minRatingFilter, sortBy, sortDirection } =
		feedbackListParamsToQuery({
			feedbackMinRating: searchParams.feedbackMinRating,
			sortBy: searchParams.sortBy,
			sortDirection: searchParams.sortDirection,
		});

	const listQuery = useQuery({
		...orpc.feedback.getBookFeedbackList.queryOptions({
			input: { bookSlug, minRating, sortBy, sortDirection },
		}),
		initialData: isDefaultFeedbackListParams({
			minRating,
			minRatingFilter,
			sortBy,
			sortDirection,
		})
			? initialReviews
			: undefined,
	});

	const stateQuery = useQuery({
		...orpc.feedback.getBookFeedbackState.queryOptions({
			input: bookSlug,
		}),
		enabled: Boolean(session?.user),
	});

	const reviews = listQuery.data ?? [];
	const state = stateQuery.data;
	const showWriteButton =
		Boolean(session?.user) &&
		!sessionPending &&
		!stateQuery.isPending &&
		state?.canSubmit === true;
	const showHint =
		Boolean(session?.user) &&
		!sessionPending &&
		!stateQuery.isPending &&
		state &&
		!state.canSubmit &&
		!state.myFeedback &&
		state.hint;

	const emptyMessage =
		minRating !== undefined ? t("feedback.noneMatch") : t("feedback.none");

	return (
		<section
			aria-labelledby="book-feedback-heading"
			className="flex flex-col gap-6"
		>
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="flex flex-col gap-1">
					<h2 id="book-feedback-heading" className="font-semibold text-lg">
						{t("feedback.clubReviews")}
					</h2>
					<p className="text-muted-foreground text-sm tabular-nums">
						{minRating !== undefined
							? t("feedback.reviewCountMin", {
									count: reviews.length,
									rating: f.rating(minRating),
								})
							: t("feedback.reviewCount", { count: reviews.length })}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<FeedbackListSort
						sortBy={sortBy}
						sortDirection={sortDirection}
						onSortByChange={(value) => setSearchParams({ sortBy: value })}
						onSortDirectionChange={(value) =>
							setSearchParams({ sortDirection: value })
						}
					/>
					<FeedbackRatingFilterSelect
						value={minRatingFilter}
						onValueChange={(value) =>
							setSearchParams({ feedbackMinRating: value })
						}
					/>
					{showWriteButton ? (
						<Button
							type="button"
							size="sm"
							onClick={() => setFeedbackDialogOpen(true)}
						>
							{t("feedback.write")}
						</Button>
					) : null}
				</div>
			</div>

			{listQuery.isError ? (
				<Card size="sm">
					<CardContent className="text-destructive text-sm">
						{t("feedback.loadFailed")}
					</CardContent>
				</Card>
			) : (
				<FeedbackReviewList
					bookSlug={bookSlug}
					reviews={reviews}
					emptyMessage={emptyMessage}
				/>
			)}

			{showHint ? (
				<Card size="sm">
					<CardContent className="text-muted-foreground text-sm">
						{state.hint}
					</CardContent>
				</Card>
			) : null}

			{sessionPending || (session?.user && stateQuery.isPending) ? (
				<p className="text-muted-foreground text-sm">
					{t("feedback.optionsLoading")}
				</p>
			) : null}

			{stateQuery.isError ? (
				<Card size="sm">
					<CardContent className="text-destructive text-sm">
						{t("feedback.stateFailed")}
					</CardContent>
				</Card>
			) : null}

			<FeedbackFormDialog
				bookSlug={bookSlug}
				open={feedbackDialogOpen}
				onOpenChange={setFeedbackDialogOpen}
			/>
		</section>
	);
}
