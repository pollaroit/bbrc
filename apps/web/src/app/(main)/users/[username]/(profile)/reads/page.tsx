import type { Metadata } from "next";
import { UserReadsFeed } from "@/components/blocks/user-reads-feed";
import { UserReadsListingToolbar } from "@/components/blocks/user-reads-listing-toolbar";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";

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

	return (
		<div className="flex flex-col gap-6">
			<ListingSearchParamsBoundary>
				<div className="border border-border bg-muted/15 p-4">
					<UserReadsListingToolbar />
				</div>
				<UserReadsFeed username={username} />
			</ListingSearchParamsBoundary>
		</div>
	);
}
