import type { Metadata } from "next";
import { UserGoalDetail } from "@/components/blocks/user-goal-detail";
import { userGoalDetailMetadata } from "@/lib/goal-seo";
import {
	loadGoalBySlugForPage,
	loadUserByUsernameForPage,
} from "@/lib/member-profile-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	openGraphImageForPath,
} from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/goals/[slug]">): Promise<Metadata> {
	const { username, slug: goalSlug } = await params;

	try {
		const [user, goal] = await Promise.all([
			loadUserByUsernameForPage(username),
			loadGoalBySlugForPage(username, goalSlug),
		]);

		const meta = userGoalDetailMetadata(user.name, user.username, goal);

		return buildPageMetadata({
			title: meta.title,
			description: meta.description,
			path: meta.path,
			openGraph: {
				type: "profile",
				images: openGraphImageForPath(meta.path, meta.title),
			},
		});
	} catch {
		return buildNotFoundMetadata("Goal");
	}
}

export default async function UserGoalDetailPage({
	params,
}: PageProps<"/users/[username]/goals/[slug]">) {
	const { username, slug } = await params;

	return <UserGoalDetail username={username} goalSlug={slug} />;
}
