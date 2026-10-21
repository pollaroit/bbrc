import type { Metadata } from "next";
import { headers } from "next/headers";
import { UserFeedbacksFeed } from "@/components/blocks/user-feedbacks-feed";
import { UserFeedbacksListingToolbar } from "@/components/blocks/user-feedbacks-listing-toolbar";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/feedbacks">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		return buildPageMetadata({
			title: `${user.name} · Feedbacks`,
			description: `Book reviews written by ${user.name}.`,
			path: `/users/${user.username}/feedbacks`,
			openGraph: { type: "profile" },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserFeedbacksPage({
	params,
}: PageProps<"/users/[username]/feedbacks">) {
	const { username } = await params;

	const session = await auth.api.getSession({ headers: await headers() });
	const isOwnProfile = session?.user?.username === username;

	return (
		<div className="flex flex-col gap-6">
			<ListingSearchParamsBoundary>
				<UserFeedbacksListingToolbar isOwnProfile={isOwnProfile} />
				<UserFeedbacksFeed username={username} />
			</ListingSearchParamsBoundary>
		</div>
	);
}
