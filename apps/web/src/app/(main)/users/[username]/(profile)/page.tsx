import type { Metadata } from "next";
import { UserReadingsFeed } from "@/components/blocks/user-readings-feed";
import { loadUserByUsernameForIsr } from "@/lib/isr-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
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
		const user = await loadUserByUsernameForIsr(username);

		return buildPageMetadata({
			title: `${user.name} (@${user.username})`,
			description: `${user.name}'s readings, posts, and book feedback on BBRC.`,
			path: `/users/${user.username}`,
			openGraph: { type: "profile" },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserReadingsPage({
	params,
}: PageProps<"/users/[username]">) {
	const { username } = await params;

	return <UserReadingsFeed username={username} />;
}
