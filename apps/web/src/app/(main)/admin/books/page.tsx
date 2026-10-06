import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminBooksOverview } from "@/components/blocks/admin-books-overview";
import {
	AdminResourceShell,
	adminBookTabs,
} from "@/components/blocks/admin-resource-shell";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Books admin — overview",
	description: "Catalog KPIs and rankings.",
	path: "/admin/books",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminBooksOverviewPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Books"
			description="View catalog health, rankings, and quick links. Use List for the full directory and Stats for charts."
			tabs={[...adminBookTabs]}
			activeHref="/admin/books"
		>
			<AdminBooksOverview />
		</AdminResourceShell>
	);
}
