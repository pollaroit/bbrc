import type { Metadata } from "next";
import { UserReadingsFeed } from "@/components/blocks/user-readings-feed";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	NO_INDEX_ROBOTS,
} from "@/lib/seo";

/** ISR: keep in sync with `DETAIL_PAGE_REVALIDATE_SECONDS` in `@/lib/seo`. */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/sittings">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		return buildPageMetadata({
			title: `${user.name} · Sittings`,
			description: `Club sittings ${user.name} has joined on BBRC.`,
			path: `/users/${user.username}/sittings`,
			robots: user.indexable ? undefined : NO_INDEX_ROBOTS,
			openGraph: { type: "profile" },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserSittingsPage({
	params,
}: PageProps<"/users/[username]/sittings">) {
	const { username } = await params;

	return <UserReadingsFeed username={username} />;
}
