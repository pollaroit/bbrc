import { Skeleton } from "@bbrc/ui/components/skeleton";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminDocumentsTable } from "@/components/blocks/admin-documents-table";
import {
	AdminResourceShell,
	adminDocumentTabs,
} from "@/components/blocks/admin-resource-shell";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Documents admin — list",
	description: "Search and browse all book documents.",
	path: "/admin/documents/list",
	robots: NO_INDEX_ROBOTS,
});

function AdminDocumentsListFallback() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-10 w-full max-w-xl" />
			<Skeleton className="h-120 w-full" />
		</div>
	);
}

export default async function AdminDocumentsListPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Documents"
			description="Full document table with filters, sorting, and links to books."
			tabs={[...adminDocumentTabs]}
			activeHref="/admin/documents/list"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={<AdminDocumentsListFallback />}>
					<AdminDocumentsTable />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
