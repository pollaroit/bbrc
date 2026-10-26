import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
	AdminResourceShell,
	adminAuthorTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminAuthorsListTable } from "@/components/blocks/author/admin/admin-authors-list-table";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Authors admin — list",
	description: "Search and manage authors.",
	path: "/admin/authors/list",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminAuthorsListTablePage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Authors"
			description="Every author, with their check status. Open one to edit it."
			tabs={[...adminAuthorTabs]}
			activeHref="/admin/authors/list"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AdminAuthorsListTable />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
