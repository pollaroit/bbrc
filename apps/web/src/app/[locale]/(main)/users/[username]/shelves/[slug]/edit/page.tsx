import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EditShelfForm } from "@/components/blocks/edit-shelf-form";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/users/[username]/shelves/[slug]/edit">): Promise<Metadata> {
	const { username, slug } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		return buildPageMetadata({
			title: `Edit shelf · ${user.name}`,
			description: "Update shelf settings.",
			path: `/users/${user.username}/shelves/${slug}/edit`,
			openGraph: { type: "profile" },
			robots: { index: false, follow: false },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function EditShelfPage({
	params,
}: PageProps<"/[locale]/users/[username]/shelves/[slug]/edit">) {
	const { username, slug } = await params;
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect(`/users/${username}/shelves/${slug}` as Route);
	}

	return <EditShelfForm username={username} shelfSlug={slug} />;
}
