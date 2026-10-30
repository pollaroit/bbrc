import type { Metadata } from "next";
import { MemberFriendsList } from "@/components/blocks/member-friends-list";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	NO_INDEX_ROBOTS,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/friends">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		return buildPageMetadata({
			title: `${user.name} · Friends`,
			description: `Friends of ${user.name} on BBRC.`,
			path: `/users/${user.username}/friends`,
			// Who someone's friends are is never indexed.
			robots: NO_INDEX_ROBOTS,
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserFriendsPage({
	params,
}: PageProps<"/users/[username]/friends">) {
	const { username } = await params;
	const user = await loadUserByUsernameForPage(username);

	return (
		<ListingSearchParamsBoundary>
			<MemberFriendsList username={user.username} name={user.name} />
		</ListingSearchParamsBoundary>
	);
}
