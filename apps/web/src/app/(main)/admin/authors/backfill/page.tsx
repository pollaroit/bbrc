import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
	AdminResourceShell,
	adminAuthorTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminAuthorsBackfill } from "@/components/blocks/author/admin/admin-authors-backfill";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Authors admin — backfill",
	description: "Backfill existing books to authors.",
	path: "/admin/authors/backfill",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminAuthorsBackfillPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Authors"
			description="Turn the author names on existing books into author records."
			tabs={[...adminAuthorTabs]}
			activeHref="/admin/authors/backfill"
		>
			<AdminAuthorsBackfill />
		</AdminResourceShell>
	);
}
