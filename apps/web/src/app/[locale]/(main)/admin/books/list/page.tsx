import { Skeleton } from "@bbrc/ui/components/skeleton";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminBooksListTable } from "@/components/blocks/admin-books-list-table";
import {
	AdminResourceShell,
	adminBookTabs,
} from "@/components/blocks/admin-resource-shell";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Books admin — list",
	description: "Search and browse the full catalog.",
	path: "/admin/books/list",
	robots: NO_INDEX_ROBOTS,
});

function AdminBooksListFallback() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-10 w-full max-w-xl" />
			<Skeleton className="h-120 w-full" />
		</div>
	);
}

export default async function AdminBooksListPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Books"
			description="Full catalog table with filters, sorting, and row actions."
			tabs={[...adminBookTabs]}
			activeHref="/admin/books/list"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={<AdminBooksListFallback />}>
					<AdminBooksListTable />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
