import type { Metadata } from "next";
import { MemberShelfDetail } from "@/components/blocks/member-shelf-detail";
import { TrackDetailView } from "@/components/blocks/track-detail-view";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import {
	loadShelfBySlugForPage,
	loadUserByUsernameForPage,
} from "@/lib/member-profile-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	NO_INDEX_ROBOTS,
	truncateDescription,
} from "@/lib/seo";
import { auth } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/shelves/[slug]">): Promise<Metadata> {
	const { username, slug: shelfSlug } = await params;

	try {
		const [user, shelf] = await Promise.all([
			loadUserByUsernameForPage(username),
			loadShelfBySlugForPage(username, shelfSlug),
		]);

		const description =
			shelf.description?.trim() ||
			`${shelf.bookCount} ${shelf.bookCount === 1 ? "book" : "books"} on ${user.name}'s reading list.`;

		return buildPageMetadata({
			title: `${shelf.title} · ${user.name}`,
			description: truncateDescription(description),
			path: `/users/${user.username}/shelves/${shelf.slug}`,
			openGraph: { type: "website" },
			robots: shelf.status === "active" ? undefined : NO_INDEX_ROBOTS,
		});
	} catch {
		return buildNotFoundMetadata("Shelf");
	}
}

export default async function ShelfDetailPage({
	params,
}: PageProps<"/users/[username]/shelves/[slug]">) {
	const { username, slug } = await params;

	return (
		<ListingSearchParamsBoundary>
			<TrackDetailView resource="shelf" itemRef={`${username}/${slug}`} />
			<MemberShelfDetail username={username} shelfSlug={slug} />
		</ListingSearchParamsBoundary>
	);
}
