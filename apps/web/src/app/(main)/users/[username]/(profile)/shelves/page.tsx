import type { Metadata } from "next";
import { UserShelvesList } from "@/components/blocks/user-shelves-list";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/shelves">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		return buildPageMetadata({
			title: `${user.name} · Shelves`,
			description: `Reading lists curated by ${user.name}.`,
			path: `/users/${user.username}/shelves`,
			openGraph: { type: "profile" },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserShelvesPage({
	params,
}: PageProps<"/users/[username]/shelves">) {
	const { username } = await params;

	return <UserShelvesList username={username} />;
}
