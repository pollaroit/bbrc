import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BookmarksView } from "@/components/blocks/bookmarks/bookmarks-view";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
	title: "Your bookmarks",
	description: "Posts and comments you saved for later.",
	path: "/bookmarks",
	robots: NO_INDEX_ROBOTS,
});

export default async function BookmarksPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.username) {
		redirect("/sign-in" as Route);
	}

	return (
		<ListingSearchParamsBoundary>
			<BookmarksView username={session.user.username} />
		</ListingSearchParamsBoundary>
	);
}
