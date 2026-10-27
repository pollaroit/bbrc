import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
	AdminResourceShell,
	adminSeriesTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminSeriesOverview } from "@/components/blocks/admin-series-overview";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Series admin — overview",
	description: "Series KPIs and rankings.",
	path: "/admin/series",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminSeriesOverviewPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Series"
			description="See how reading-order lists are growing. Use List to edit series and Stats for distributions."
			tabs={[...adminSeriesTabs]}
			activeHref="/admin/series"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AdminSeriesOverview />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
