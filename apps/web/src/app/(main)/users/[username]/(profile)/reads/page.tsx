import type { Metadata } from "next";
import { UserReadsFeed } from "@/components/blocks/user-reads-feed";
import { loadUserByUsernameForIsr } from "@/lib/isr-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/reads">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForIsr(username);

		return buildPageMetadata({
			title: `${user.name} · Books read`,
			description: `Books ${user.name} has finished reading on BBRC.`,
			path: `/users/${user.username}/reads`,
			openGraph: { type: "profile" },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserReadsPage({
	params,
}: PageProps<"/users/[username]/reads">) {
	const { username } = await params;

	return <UserReadsFeed username={username} />;
}
