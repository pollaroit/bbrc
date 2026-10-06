import { Skeleton } from "@bbrc/ui/components/skeleton";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
	AdminResourceShell,
	adminMemberTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminUsersTable } from "@/components/blocks/admin-users-table";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Members admin — list",
	description: "Search and manage club members.",
	path: "/admin/users/list",
	robots: NO_INDEX_ROBOTS,
});

function AdminUsersTableFallback() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-10 w-full max-w-xl" />
			<Skeleton className="h-[480px] w-full" />
		</div>
	);
}

export default async function AdminUsersListPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Members"
			description="Full member table with filters, sorting, and admin actions."
			tabs={[...adminMemberTabs]}
			activeHref="/admin/users/list"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={<AdminUsersTableFallback />}>
					<AdminUsersTable />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
