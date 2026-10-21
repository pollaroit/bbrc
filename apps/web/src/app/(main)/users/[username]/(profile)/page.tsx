import type { Metadata } from "next";
import { MemberProfileOverview } from "@/components/blocks/member-profile-overview";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	NO_INDEX_ROBOTS,
	usernameStaticParams,
} from "@/lib/seo";
import { db } from "@/services";

/** ISR: keep in sync with `DETAIL_PAGE_REVALIDATE_SECONDS` in `@/lib/seo`. */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
	return usernameStaticParams(db);
}

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		return buildPageMetadata({
			title: `${user.name} (@${user.username})`,
			description: `${user.name}'s reading life on BBRC: sittings, reads, posts, and feedback.`,
			path: `/users/${user.username}`,
			robots: user.indexable ? undefined : NO_INDEX_ROBOTS,
			openGraph: { type: "profile" },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserOverviewPage({
	params,
}: PageProps<"/users/[username]">) {
	const { username } = await params;

	return <MemberProfileOverview username={username} />;
}
