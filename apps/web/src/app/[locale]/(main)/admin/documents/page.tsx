import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminDocumentsOverview } from "@/components/blocks/admin-documents-overview";
import {
	AdminResourceShell,
	adminDocumentTabs,
} from "@/components/blocks/admin-resource-shell";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Documents admin — overview",
	description: "Document KPIs and rankings.",
	path: "/admin/documents",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminDocumentsOverviewPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Documents"
			description="View submission health, rankings, and quick links. Use List for the full directory and Stats for charts."
			tabs={[...adminDocumentTabs]}
			activeHref="/admin/documents"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AdminDocumentsOverview />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
