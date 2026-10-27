import type { Metadata } from "next";
import { PostFeed } from "@/components/blocks/post-feed";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/users/[username]/posts">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		return buildPageMetadata({
			title: `${user.name} · Feed`,
			description: `Posts by ${user.name} on BBRC.`,
			path: `/users/${user.username}/posts`,
			openGraph: { type: "profile" },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserPostsPage({
	params,
}: PageProps<"/[locale]/users/[username]/posts">) {
	const { username } = await params;

	return (
		<PostFeed
			authorUsername={username}
			emptyTitle="No posts yet"
			emptyDescription="When this member posts to the club feed, it will show up here."
			endMessage="End of member feed."
		/>
	);
}
