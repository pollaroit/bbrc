import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
	AdminResourceShell,
	adminAuthorTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminAuthorsOverview } from "@/components/blocks/author/admin/admin-authors-overview";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Authors admin — overview",
	description: "Author KPIs.",
	path: "/admin/authors",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminAuthorsOverviewPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Authors"
			description="Author records, what still needs a check, and how the backfill is going."
			tabs={[...adminAuthorTabs]}
			activeHref="/admin/authors"
		>
			<AdminAuthorsOverview />
		</AdminResourceShell>
	);
}
