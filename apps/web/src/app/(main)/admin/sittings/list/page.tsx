import { Skeleton } from "@bbrc/ui/components/skeleton";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
	AdminResourceShell,
	adminSittingTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminSittingsTable } from "@/components/blocks/admin-sittings-table";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Sittings admin — list",
	description: "Search and browse all sittings.",
	path: "/admin/sittings/list",
	robots: NO_INDEX_ROBOTS,
});

function AdminSittingsListFallback() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-10 w-full max-w-xl" />
			<Skeleton className="h-120 w-full" />
		</div>
	);
}

export default async function AdminSittingsListPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Sittings"
			description="Full sitting table with filters, sorting, and links to public pages."
			tabs={[...adminSittingTabs]}
			activeHref="/admin/sittings/list"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={<AdminSittingsListFallback />}>
					<AdminSittingsTable />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
