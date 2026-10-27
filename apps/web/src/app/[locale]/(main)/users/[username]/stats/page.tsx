import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UserStatsPage } from "@/components/blocks/user-stats-page";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	openGraphImageForPath,
} from "@/lib/seo";
import { userStatsMetadataFromSearchParams } from "@/lib/user-stats-seo";

export async function generateMetadata({
	params,
	searchParams,
}: PageProps<"/[locale]/users/[username]/stats">): Promise<Metadata> {
	const { username } = await params;
	const resolvedSearchParams = await searchParams;

	try {
		const user = await loadUserByUsernameForPage(username);
		const { title, description } = userStatsMetadataFromSearchParams(
			user.name,
			user.username,
			resolvedSearchParams,
		);
		const path = `/users/${user.username}/stats`;

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
		return buildNotFoundMetadata("Reading stats");
	}
}

export default async function UserStatsRoute({
	params,
}: PageProps<"/[locale]/users/[username]/stats">) {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		return (
			<ListingSearchParamsBoundary>
				<UserStatsPage username={user.username} displayName={user.name} />
			</ListingSearchParamsBoundary>
		);
	} catch {
		notFound();
	}
}
