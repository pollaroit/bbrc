import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
	AdminResourceShell,
	adminSittingTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminSittingsOverview } from "@/components/blocks/admin-sittings-overview";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Sittings admin — overview",
	description: "Sitting KPIs and rankings.",
	path: "/admin/sittings",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminSittingsOverviewPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Sittings"
			description="View club read health, rankings, and quick links. Use List for the full directory and Stats for charts."
			tabs={[...adminSittingTabs]}
			activeHref="/admin/sittings"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AdminSittingsOverview />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
