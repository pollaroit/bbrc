import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { BookmarksView } from "@/components/blocks/bookmarks/bookmarks-view";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ username: string }> };

export async function generateMetadata({
	params,
}: PageParams): Promise<Metadata> {
	const { username } = await params;
	return buildPageMetadata({
		title: "Bookmarks",
		description: "Saved posts and comments.",
		path: `/users/${username}/bookmarks`,
		robots: NO_INDEX_ROBOTS,
	});
}

export default async function UserBookmarksPage({ params }: PageParams) {
	const { username } = await params;
	const user = await loadUserByUsernameForPage(username);
	const session = await auth.api.getSession({ headers: await headers() });
	const isOwnProfile = session?.user?.username === user.username;

	return (
		<ListingSearchParamsBoundary>
			<Suspense fallback={null}>
				<BookmarksView
					username={user.username}
					impressionSource="profile"
					title={isOwnProfile ? "Your bookmarks" : `${user.name}'s bookmarks`}
					description={
						isOwnProfile
							? "Posts and comments you saved for later."
							: "Saved posts and comments this member chose to share."
					}
				/>
			</Suspense>
		</ListingSearchParamsBoundary>
	);
}
