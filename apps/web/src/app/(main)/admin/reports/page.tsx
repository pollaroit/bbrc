import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminReportsQueue } from "@/components/blocks/admin-reports-queue";
import { AdminResourceShell } from "@/components/blocks/admin-resource-shell";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Reports admin",
	description: "Reports from members that need a decision.",
	path: "/admin/reports",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminReportsPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Reports"
			description="Decide what happens to what members flag. Nothing is hidden until you act."
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AdminReportsQueue />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
