import { Skeleton } from "@bbrc/ui/components/skeleton";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminCommentsTable } from "@/components/blocks/admin-comments-table";
import {
	AdminResourceShell,
	adminCommentTabs,
} from "@/components/blocks/admin-resource-shell";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Comments admin — list",
	description: "Search and browse all comments.",
	path: "/admin/comments/list",
	robots: NO_INDEX_ROBOTS,
});

function AdminCommentsListFallback() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-10 w-full max-w-xl" />
			<Skeleton className="h-120 w-full" />
		</div>
	);
}

export default async function AdminCommentsListPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Comments"
			description="Full comment table with filters, sorting, and links to public threads."
			tabs={[...adminCommentTabs]}
			activeHref="/admin/comments/list"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={<AdminCommentsListFallback />}>
					<AdminCommentsTable />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
