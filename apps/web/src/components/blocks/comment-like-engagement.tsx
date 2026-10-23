"use client";

import { CommentLikersDialogList } from "@/components/blocks/comment-likers-dialog-list";
import { LikeEngagement } from "@/components/blocks/like-engagement";

type CommentLikeEngagementProps = {
	commentSlug: string;
	initialLikeCount: number;
	initialLikedByMe: boolean;
	size?: "sm" | "md";
	className?: string;
};

export function CommentLikeEngagement({
	commentSlug,
	initialLikeCount,
	initialLikedByMe,
	size = "md",
	className,
}: CommentLikeEngagementProps) {
	return (
		<LikeEngagement
			kind="comment"
			slug={commentSlug}
			noun="comment"
			size={size}
			initialLikeCount={initialLikeCount}
			initialLikedByMe={initialLikedByMe}
			className={className}
			renderLikers={(enabled) => (
				<CommentLikersDialogList commentSlug={commentSlug} enabled={enabled} />
			)}
		/>
	);
}
