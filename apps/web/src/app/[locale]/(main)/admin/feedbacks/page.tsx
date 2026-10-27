import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminFeedbacksOverview } from "@/components/blocks/admin-feedbacks-overview";
import {
	AdminResourceShell,
	adminFeedbackTabs,
} from "@/components/blocks/admin-resource-shell";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Feedbacks admin — overview",
	description: "Feedback KPIs and rankings.",
	path: "/admin/feedbacks",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminFeedbacksOverviewPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Feedbacks"
			description="View review health, rankings, and quick links. Use List for the full directory and Stats for charts."
			tabs={[...adminFeedbackTabs]}
			activeHref="/admin/feedbacks"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AdminFeedbacksOverview />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
