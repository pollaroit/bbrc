import type { Metadata } from "next";
import { MemberShelfDetail } from "@/components/blocks/member-shelf-detail";
import { loadUserByUsernameForIsr } from "@/lib/isr-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/shelves/[slug]">): Promise<Metadata> {
	const { username, slug } = await params;

	try {
		const user = await loadUserByUsernameForIsr(username);

		return buildPageMetadata({
			title: `Shelf · ${user.name}`,
			description: `A reading list by ${user.name}.`,
			path: `/users/${user.username}/shelves/${slug}`,
			openGraph: { type: "profile" },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function ShelfDetailPage({
	params,
}: PageProps<"/users/[username]/shelves/[slug]">) {
	const { username, slug } = await params;

	return <MemberShelfDetail username={username} shelfSlug={slug} />;
}
