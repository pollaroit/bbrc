import type { Metadata } from "next";
import { ReadingStatsView } from "@/components/blocks/reading/reading-stats-view";
import { requireOwnProfile } from "@/lib/reading/require-own-profile";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";

/** Only the member opens this; it reads the session, so it is never cached. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/users/[username]/reading">): Promise<Metadata> {
	const { username } = await params;
	return buildPageMetadata({
		title: "Your reading",
		description: "How fast you read, your streaks and what you finished.",
		path: `/users/${username}/reading`,
		robots: NO_INDEX_ROBOTS,
	});
}

export default async function UserReadingPage({
	params,
}: PageProps<"/[locale]/users/[username]/reading">) {
	const { username } = await params;
	await requireOwnProfile(username);

	return <ReadingStatsView />;
}
