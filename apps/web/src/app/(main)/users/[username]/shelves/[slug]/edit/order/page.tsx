import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ShelfReorderEditor } from "@/components/blocks/shelf-reorder-editor";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/shelves/[slug]/edit/order">): Promise<Metadata> {
	const { username, slug } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		return buildPageMetadata({
			title: `Reorder shelf · ${user.name}`,
			description: "Change book order on a shelf.",
			path: `/users/${user.username}/shelves/${slug}/edit/order`,
			openGraph: { type: "profile" },
			robots: { index: false, follow: false },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function ShelfReorderPage({
	params,
}: PageProps<"/users/[username]/shelves/[slug]/edit/order">) {
	const { username, slug } = await params;
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect(`/users/${username}/shelves/${slug}` as Route);
	}

	return <ShelfReorderEditor username={username} shelfSlug={slug} />;
}
