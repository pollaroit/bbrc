"use client";

import type { GetFeedbackBySlugOutput } from "@bbrc/api/modules/feedback/feedback.schema";
import { contentPlainText } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { useQuery } from "@tanstack/react-query";
import { SocialContentBody } from "@/components/blocks/social-content-body";
import { orpc } from "@/utils/orpc";

/**
 * The server-rendered review plus any edit made in this tab. The page gives
 * the first values; an optimistic edit updates the cache and shows here at once.
 */
export function useLiveFeedback(initial: GetFeedbackBySlugOutput) {
	const query = useQuery({
		...orpc.feedback.getFeedbackBySlug.queryOptions({ input: initial.slug }),
		initialData: initial,
		staleTime: 30_000,
	});
	return query.data;
}

export function FeedbackRatingBadge({
	feedback,
}: {
	feedback: GetFeedbackBySlugOutput;
}) {
	const live = useLiveFeedback(feedback);
	return (
		<Badge variant="outline" className="tabular-nums">
			{live.rating.toFixed(1)} / 5
		</Badge>
	);
}

export function FeedbackReviewBody({
	feedback,
}: {
	feedback: GetFeedbackBySlugOutput;
}) {
	const live = useLiveFeedback(feedback);

	if (contentPlainText(live.review).trim().length === 0) {
		return (
			<p className="text-muted-foreground text-sm italic">
				Rating only — no written review.
			</p>
		);
	}

	return (
		<SocialContentBody
			content={live.review}
			isSpoiler={live.isSpoiler}
			kind="feedback"
			identifier={live.slug}
			interactiveLinks
		/>
	);
}
