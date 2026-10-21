import type { Metadata } from "next";
import { headers } from "next/headers";
import { UserReadsFeed } from "@/components/blocks/user-reads-feed";
import { UserReadsListingToolbar } from "@/components/blocks/user-reads-listing-toolbar";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/reads">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		return buildPageMetadata({
			title: `${user.name} · Books read`,
			description: `Books ${user.name} has finished reading on BBRC.`,
			path: `/users/${user.username}/reads`,
			openGraph: { type: "profile" },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserReadsPage({
	params,
}: PageProps<"/users/[username]/reads">) {
	const { username } = await params;
	await loadUserByUsernameForPage(username);
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const isOwnProfile = session?.user?.username === username;

	return (
		<div className="flex flex-col gap-6">
			<ListingSearchParamsBoundary>
				<div>
					<UserReadsListingToolbar
						username={username}
						isOwnProfile={isOwnProfile}
					/>
				</div>
				<UserReadsFeed username={username} />
			</ListingSearchParamsBoundary>
		</div>
	);
}
