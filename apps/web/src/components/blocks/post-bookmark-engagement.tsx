"use client";

import { BookmarkEngagement } from "@/components/blocks/bookmark-engagement";
import { authClient } from "@/lib/auth-client";

type PostBookmarkEngagementProps = {
	postSlug: string;
	authorUsername: string;
	allowBookmarks: boolean;
};

export function PostBookmarkEngagement({
	postSlug,
	authorUsername,
	allowBookmarks,
}: PostBookmarkEngagementProps) {
	const { data: session } = authClient.useSession();
	if (!allowBookmarks) return null;
	const isOwner = session?.user?.username === authorUsername;
	return (
		<BookmarkEngagement
			kind="post"
			slug={postSlug}
			noun="post"
			isOwner={isOwner}
		/>
	);
}
