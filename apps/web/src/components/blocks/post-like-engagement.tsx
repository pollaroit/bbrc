"use client";

import { LikeEngagement } from "@/components/blocks/like-engagement";
import { PostLikersDialogList } from "@/components/blocks/post-likers-dialog-list";

type PostLikeEngagementProps = {
	postSlug: string;
	initialLikeCount: number;
	initialLikedByMe: boolean;
	className?: string;
};

export function PostLikeEngagement({
	postSlug,
	initialLikeCount,
	initialLikedByMe,
	className,
}: PostLikeEngagementProps) {
	return (
		<LikeEngagement
			kind="post"
			slug={postSlug}
			noun="post"
			initialLikeCount={initialLikeCount}
			initialLikedByMe={initialLikedByMe}
			className={className}
			renderLikers={(enabled) => (
				<PostLikersDialogList postSlug={postSlug} enabled={enabled} />
			)}
		/>
	);
}
