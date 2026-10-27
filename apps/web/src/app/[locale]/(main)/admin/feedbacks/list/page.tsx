import { Skeleton } from "@bbrc/ui/components/skeleton";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminFeedbacksTable } from "@/components/blocks/admin-feedbacks-table";
import {
	AdminResourceShell,
	adminFeedbackTabs,
} from "@/components/blocks/admin-resource-shell";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Feedbacks admin — list",
	description: "Search and browse all feedbacks.",
	path: "/admin/feedbacks/list",
	robots: NO_INDEX_ROBOTS,
});

function AdminFeedbacksListFallback() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-10 w-full max-w-xl" />
			<Skeleton className="h-120 w-full" />
		</div>
	);
}

export default async function AdminFeedbacksListPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Feedbacks"
			description="Full feedback table with filters, sorting, and links to public reviews."
			tabs={[...adminFeedbackTabs]}
			activeHref="/admin/feedbacks/list"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={<AdminFeedbacksListFallback />}>
					<AdminFeedbacksTable />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
