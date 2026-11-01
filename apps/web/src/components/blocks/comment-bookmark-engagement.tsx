"use client";

import { BookmarkEngagement } from "@/components/blocks/bookmark-engagement";
import { authClient } from "@/lib/auth-client";

type CommentBookmarkEngagementProps = {
	commentSlug: string;
	authorUsername: string;
	allowBookmarks: boolean;
	/** When the comment sits on a post, the post must allow bookmarks too. */
	postAllowBookmarks?: boolean;
	size?: "sm" | "md";
};

export function CommentBookmarkEngagement({
	commentSlug,
	authorUsername,
	allowBookmarks,
	postAllowBookmarks = true,
	size,
}: CommentBookmarkEngagementProps) {
	const { data: session } = authClient.useSession();
	if (!allowBookmarks || !postAllowBookmarks) return null;
	const isOwner = session?.user?.username === authorUsername;
	return (
		<BookmarkEngagement
			kind="comment"
			slug={commentSlug}
			noun="comment"
			isOwner={isOwner}
			size={size}
		/>
	);
}
