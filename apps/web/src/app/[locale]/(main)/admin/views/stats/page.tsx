import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
	AdminResourceShell,
	adminViewTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminViewsStats } from "@/components/blocks/admin-views-stats";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Views admin — stats",
	description: "Charts and breakdowns for views.",
	path: "/admin/views/stats",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminViewsStatsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Views"
			description="Deeper charts: views per day, when people look, where they come from, and what they use."
			tabs={[...adminViewTabs]}
			activeHref="/admin/views/stats"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AdminViewsStats />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
