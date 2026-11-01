import type { Metadata } from "next";
import { Suspense } from "react";
import { ReadingActivityPage } from "@/components/blocks/reading-activity/reading-activity-page";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";

/** What a visitor sees depends on who they are, so this is never cached or shared. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/reading">): Promise<Metadata> {
	const { username } = await params;
	return buildPageMetadata({
		title: "Reading",
		description: "Reading sessions, stats and rankings.",
		path: `/users/${username}/reading`,
		robots: NO_INDEX_ROBOTS,
	});
}

export default async function UserReadingPage({
	params,
}: PageProps<"/users/[username]/reading">) {
	const { username } = await params;
	const user = await loadUserByUsernameForPage(username);

	return (
		<ListingSearchParamsBoundary>
			<Suspense fallback={null}>
				<ReadingActivityPage username={user.username} name={user.name} />
			</Suspense>
		</ListingSearchParamsBoundary>
	);
}
