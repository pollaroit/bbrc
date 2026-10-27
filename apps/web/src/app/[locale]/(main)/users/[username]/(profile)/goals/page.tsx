import type { Metadata } from "next";
import { UserGoalsList } from "@/components/blocks/user-goals-list";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { userGoalsListMetadata } from "@/lib/goal-seo";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	openGraphImageForPath,
} from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/users/[username]/goals">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		const { title, description } = userGoalsListMetadata(
			user.name,
			user.username,
		);
		const path = `/users/${user.username}/goals`;

		return buildPageMetadata({
			title,
			description,
			path,
			openGraph: {
				type: "profile",
				images: openGraphImageForPath(path, title),
			},
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserGoalsPage({
	params,
}: PageProps<"/[locale]/users/[username]/goals">) {
	const { username } = await params;

	return (
		<ListingSearchParamsBoundary>
			<UserGoalsList username={username} />
		</ListingSearchParamsBoundary>
	);
}
