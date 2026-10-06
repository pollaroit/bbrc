import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminBooksStats } from "@/components/blocks/admin-books-stats";
import {
	AdminResourceShell,
	adminBookTabs,
} from "@/components/blocks/admin-resource-shell";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Books admin — stats",
	description: "Charts and distributions for the catalog.",
	path: "/admin/books/stats",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminBooksStatsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Books"
			description="Deeper charts: growth, status, pages, ratings, engagement, and sittings."
			tabs={[...adminBookTabs]}
			activeHref="/admin/books/stats"
		>
			<AdminBooksStats />
		</AdminResourceShell>
	);
}
