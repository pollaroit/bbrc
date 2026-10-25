import type { Metadata } from "next";
import { MentionsView } from "@/components/blocks/mention/mentions-view";
import { requireOwnProfile } from "@/lib/reading/require-own-profile";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";

/** Only the member opens this; it reads the session, so it is never cached. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/mentions">): Promise<Metadata> {
	const { username } = await params;
	return buildPageMetadata({
		title: "Your mentions",
		description: "Posts, comments and reviews where you were mentioned.",
		path: `/users/${username}/mentions`,
		robots: NO_INDEX_ROBOTS,
	});
}

export default async function UserMentionsPage({
	params,
}: PageProps<"/users/[username]/mentions">) {
	const { username } = await params;
	await requireOwnProfile(username);

	return <MentionsView />;
}
