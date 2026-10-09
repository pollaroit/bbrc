import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
	AdminResourceShell,
	adminShelfTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminShelvesOverview } from "@/components/blocks/admin-shelves-overview";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Shelves admin — overview",
	description: "Shelf KPIs and rankings.",
	path: "/admin/shelves",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminShelvesOverviewPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Shelves"
			description="View shelf health, rankings, and quick links. Use List for the full directory and Stats for charts."
			tabs={[...adminShelfTabs]}
			activeHref="/admin/shelves"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AdminShelvesOverview />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
