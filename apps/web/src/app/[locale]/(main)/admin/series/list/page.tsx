import { Skeleton } from "@bbrc/ui/components/skeleton";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
	AdminResourceShell,
	adminSeriesTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminSeriesTable } from "@/components/blocks/admin-series-table";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Series admin — list",
	description: "Search and manage catalog series.",
	path: "/admin/series/list",
	robots: NO_INDEX_ROBOTS,
});

function AdminSeriesListFallback() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-10 w-full max-w-xl" />
			<Skeleton className="h-120 w-full" />
		</div>
	);
}

export default async function AdminSeriesListPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Series"
			description="Full directory with filters, sorting, and links to edit reading order."
			tabs={[...adminSeriesTabs]}
			activeHref="/admin/series/list"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={<AdminSeriesListFallback />}>
					<AdminSeriesTable />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
