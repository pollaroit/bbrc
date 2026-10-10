import type { Metadata } from "next";
import { UserFeedbacksFeed } from "@/components/blocks/user-feedbacks-feed";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";

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

	return <UserFeedbacksFeed username={username} />;
}
