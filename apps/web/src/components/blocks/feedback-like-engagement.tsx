"use client";

import { LikeEngagement } from "@/components/blocks/like-engagement";
import { PostLikersDialogList } from "@/components/blocks/post-likers-dialog-list";

type FeedbackLikeEngagementProps = {
	feedbackSlug: string;
	initialLikeCount: number;
	initialLikedByMe: boolean;
	className?: string;
};

export function FeedbackLikeEngagement({
	feedbackSlug,
	initialLikeCount,
	initialLikedByMe,
	className,
}: FeedbackLikeEngagementProps) {
	return (
		<LikeEngagement
			kind="feedback"
			slug={feedbackSlug}
			noun="review"
			initialLikeCount={initialLikeCount}
			initialLikedByMe={initialLikedByMe}
			className={className}
			renderLikers={(enabled) => (
				<PostLikersDialogList feedbackSlug={feedbackSlug} enabled={enabled} />
			)}
		/>
	);
}
