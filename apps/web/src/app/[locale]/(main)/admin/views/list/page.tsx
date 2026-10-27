import { Skeleton } from "@bbrc/ui/components/skeleton";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
	AdminResourceShell,
	adminViewTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminViewsListTable } from "@/components/blocks/admin-views-list-table";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Views admin — list",
	description: "Every counted view, newest first.",
	path: "/admin/views/list",
	robots: NO_INDEX_ROBOTS,
});

function AdminViewsListFallback() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-10 w-full max-w-xl" />
			<Skeleton className="h-120 w-full" />
		</div>
	);
}

export default async function AdminViewsListPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Views"
			description="Every counted view from the last 90 days, newest first, with filters. IP addresses are never shown."
			tabs={[...adminViewTabs]}
			activeHref="/admin/views/list"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={<AdminViewsListFallback />}>
					<AdminViewsListTable />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
