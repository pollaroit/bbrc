import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
	AdminResourceShell,
	adminViewTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminViewsOverview } from "@/components/blocks/admin-views-overview";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Views admin — overview",
	description: "Site-wide views, top content and audience.",
	path: "/admin/views",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminViewsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Views"
			description="Who is looking at books, posts, shelves, reviews and profiles. Use List for every counted view and Stats for charts."
			tabs={[...adminViewTabs]}
			activeHref="/admin/views"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AdminViewsOverview />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
