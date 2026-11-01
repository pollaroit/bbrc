import type { Metadata } from "next";
import { headers } from "next/headers";
import { MemberProfileScheduledPostsLink } from "@/components/blocks/member-profile-scheduled-posts-link";
import { PostFeed } from "@/components/blocks/post-feed";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/posts">): Promise<Metadata> {
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
}: PageProps<"/users/[username]/posts">) {
	const { username } = await params;
	const user = await loadUserByUsernameForPage(username);
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const isOwnProfile = session?.user?.username === user.username;

	return (
		<div className="flex flex-col gap-4">
			{isOwnProfile ? (
				<div className="flex justify-end">
					<MemberProfileScheduledPostsLink username={user.username} />
				</div>
			) : null}
			<PostFeed
				authorUsername={username}
				emptyTitle="No posts yet"
				emptyDescription="When this member posts to the club feed, it will show up here."
				endMessage="End of member feed."
			/>
		</div>
	);
}
