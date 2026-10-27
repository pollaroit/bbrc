import type { Metadata } from "next";
import { UserAchievementsPanel } from "@/components/blocks/user-achievements-panel";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	NO_INDEX_ROBOTS,
} from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/users/[username]/achievements">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		return buildPageMetadata({
			title: `${user.name} · Achievements`,
			description: `Badges ${user.name} has earned on BBRC.`,
			path: `/users/${user.username}/achievements`,
			robots: user.indexable ? undefined : NO_INDEX_ROBOTS,
			openGraph: { type: "profile" },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserAchievementsPage({
	params,
}: PageProps<"/[locale]/users/[username]/achievements">) {
	const { username } = await params;

	return <UserAchievementsPanel username={username} />;
}
