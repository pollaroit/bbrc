import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminCommentsOverview } from "@/components/blocks/admin-comments-overview";
import {
	AdminResourceShell,
	adminCommentTabs,
} from "@/components/blocks/admin-resource-shell";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Comments admin — overview",
	description: "Comment KPIs and rankings.",
	path: "/admin/comments",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminCommentsOverviewPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Comments"
			description="View discussion health, rankings, and quick links. Use List for the full directory and Stats for charts."
			tabs={[...adminCommentTabs]}
			activeHref="/admin/comments"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AdminCommentsOverview />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
