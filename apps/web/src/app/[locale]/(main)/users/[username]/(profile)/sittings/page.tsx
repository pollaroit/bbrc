import type { Metadata } from "next";
import { headers } from "next/headers";
import { UserReadingsFeed } from "@/components/blocks/user-readings-feed";
import { UserSittingsListingToolbar } from "@/components/blocks/user-sittings-listing-toolbar";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	NO_INDEX_ROBOTS,
} from "@/lib/seo";
import { auth } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/users/[username]/sittings">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		return buildPageMetadata({
			title: `${user.name} · Sittings`,
			description: `Club sittings ${user.name} has joined on BBRC.`,
			path: `/users/${user.username}/sittings`,
			robots: user.indexable ? undefined : NO_INDEX_ROBOTS,
			openGraph: { type: "profile" },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserSittingsPage({
	params,
}: PageProps<"/[locale]/users/[username]/sittings">) {
	const { username } = await params;
	const session = await auth.api.getSession({ headers: await headers() });
	const isOwnProfile = session?.user?.username === username;

	return (
		<div className="flex flex-col gap-6">
			<ListingSearchParamsBoundary>
				<div>
					<UserSittingsListingToolbar isOwnProfile={isOwnProfile} />
				</div>
				<UserReadingsFeed username={username} />
			</ListingSearchParamsBoundary>
		</div>
	);
}
