import type { Metadata } from "next";
import { WishlistView } from "@/components/blocks/reading/wishlist-view";
import { requireOwnProfile } from "@/lib/reading/require-own-profile";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";

/** Only the member opens this; it reads the session, so it is never cached. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/wishlist">): Promise<Metadata> {
	const { username } = await params;
	return buildPageMetadata({
		title: "Your wishlist",
		description: "Books you want to read, in the order you want to read them.",
		path: `/users/${username}/wishlist`,
		robots: NO_INDEX_ROBOTS,
	});
}

export default async function UserWishlistPage({
	params,
}: PageProps<"/users/[username]/wishlist">) {
	const { username } = await params;
	await requireOwnProfile(username);

	return <WishlistView username={username} />;
}
