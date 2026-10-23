"use client";

import type { GetFeedbackBySlugOutput } from "@bbrc/api/modules/feedback/feedback.schema";
import { FeedbackEditIconButton } from "@/components/blocks/feedback-edit-icon-button";
import { useLiveFeedback } from "@/components/blocks/feedback-live";
import { authClient } from "@/lib/auth-client";

type FeedbackDetailOwnerActionsProps = {
	feedback: GetFeedbackBySlugOutput;
};

export function FeedbackDetailOwnerActions({
	feedback,
}: FeedbackDetailOwnerActionsProps) {
	const { data: session } = authClient.useSession();
	const live = useLiveFeedback(feedback);

	if (!session?.user || session.user.username !== feedback.author.username) {
		return null;
	}

	return (
		<FeedbackEditIconButton
			bookSlug={feedback.bookSlug}
			rating={live.rating}
			review={live.review}
			isSpoiler={live.isSpoiler}
			feedbackSlug={feedback.slug}
		/>
	);
}
