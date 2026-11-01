import { isSuperAdmin } from "@bbrc/shared";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminPostsScheduledTable } from "@/components/blocks/admin-posts-scheduled-table";
import {
	AdminResourceShell,
	adminPostTabs,
} from "@/components/blocks/admin-resource-shell";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Posts admin — scheduled",
	description: "Scheduled posts waiting to publish.",
	path: "/admin/posts/scheduled",
	robots: NO_INDEX_ROBOTS,
});

function AdminPostsScheduledFallback() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-10 w-full max-w-xl" />
			<Skeleton className="h-120 w-full" />
		</div>
	);
}

export default async function AdminPostsScheduledPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!isSuperAdmin(session?.user)) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Posts"
			description="Scheduled posts across the club. Admins can delete only; members edit their own."
			tabs={[...adminPostTabs]}
			activeHref="/admin/posts/scheduled"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={<AdminPostsScheduledFallback />}>
					<AdminPostsScheduledTable />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
