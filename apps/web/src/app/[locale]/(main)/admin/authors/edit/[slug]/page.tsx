import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthorEditor } from "@/components/blocks/author/admin/author-editor";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Edit author",
	description: "Edit an author's details.",
	path: "/authors",
	robots: NO_INDEX_ROBOTS,
});

export const dynamic = "force-dynamic";

/** Served at `/authors/<slug>/edit` too (see the rewrite in next.config.ts). */
export default async function EditAuthorPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session?.user.isAdmin) {
		redirect(`/authors/${slug}` as Route);
	}

	return <AuthorEditor slug={slug} />;
}
