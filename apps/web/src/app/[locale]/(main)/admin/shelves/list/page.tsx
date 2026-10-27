import { Skeleton } from "@bbrc/ui/components/skeleton";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
	AdminResourceShell,
	adminShelfTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminShelvesTable } from "@/components/blocks/admin-shelves-table";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Shelves admin — list",
	description: "Search and browse all shelves.",
	path: "/admin/shelves/list",
	robots: NO_INDEX_ROBOTS,
});

function AdminShelvesListFallback() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-10 w-full max-w-xl" />
			<Skeleton className="h-120 w-full" />
		</div>
	);
}

export default async function AdminShelvesListPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Shelves"
			description="Full shelf table with filters, sorting, and links to public pages."
			tabs={[...adminShelfTabs]}
			activeHref="/admin/shelves/list"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={<AdminShelvesListFallback />}>
					<AdminShelvesTable />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
