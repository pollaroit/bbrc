import { Skeleton } from "@bbrc/ui/components/skeleton";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminPostsTable } from "@/components/blocks/admin-posts-table";
import {
	AdminResourceShell,
	adminPostTabs,
} from "@/components/blocks/admin-resource-shell";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Posts admin — list",
	description: "Search and browse all posts.",
	path: "/admin/posts/list",
	robots: NO_INDEX_ROBOTS,
});

function AdminPostsListFallback() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-10 w-full max-w-xl" />
			<Skeleton className="h-120 w-full" />
		</div>
	);
}

export default async function AdminPostsListPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Posts"
			description="Full post table with filters, sorting, and links to public pages."
			tabs={[...adminPostTabs]}
			activeHref="/admin/posts/list"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={<AdminPostsListFallback />}>
					<AdminPostsTable />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
