import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EditShelfForm } from "@/components/blocks/edit-shelf-form";
import { loadUserByUsernameForIsr } from "@/lib/isr-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/shelves/[slug]/edit">): Promise<Metadata> {
	const { username, slug } = await params;

	try {
		const user = await loadUserByUsernameForIsr(username);

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
}: PageProps<"/users/[username]/shelves/[slug]/edit">) {
	const { username, slug } = await params;
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user || session.user.username !== username) {
		redirect(`/users/${username}/shelves/${slug}` as Route);
	}

	return (
		<div className="flex flex-col gap-8">
			<header className="space-y-1.5 border-border border-b pb-6">
				<h1 className="font-bold text-2xl tracking-tight">Edit shelf</h1>
			</header>
			<EditShelfForm username={username} shelfSlug={slug} />
		</div>
	);
}
