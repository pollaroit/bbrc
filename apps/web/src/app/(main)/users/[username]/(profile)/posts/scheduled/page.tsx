import type { Metadata } from "next";
import { ScheduledPostsView } from "@/components/blocks/scheduled-posts-view";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import { requireOwnProfile } from "@/lib/reading/require-own-profile";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	NO_INDEX_ROBOTS,
} from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/posts/scheduled">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		return buildPageMetadata({
			title: `${user.name} · Scheduled posts`,
			description: `Scheduled posts by ${user.name}.`,
			path: `/users/${user.username}/posts/scheduled`,
			robots: NO_INDEX_ROBOTS,
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserScheduledPostsPage({
	params,
}: PageProps<"/users/[username]/posts/scheduled">) {
	const { username } = await params;
	await requireOwnProfile(username);

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h1 className="font-semibold text-lg">Scheduled posts</h1>
				<p className="text-muted-foreground text-sm">
					Only you see these until they publish. Times are in club time.
				</p>
			</div>
			<ScheduledPostsView />
		</div>
	);
}
